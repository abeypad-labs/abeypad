import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { config } from "./config.js";
import { isDatabaseReady } from "./db.js";
import {
  ensureAnsIndexFresh,
  getAnsIndexHealth,
  normalizeAnsLabel,
  readAnsAvailability,
  readAnsName,
} from "./ans/indexer.js";
import {
  buildAnsQuote,
  getAbeyUsdPrice,
  getAnsPricing,
  YEAR_SECONDS,
} from "./ans/pricing.js";
import {
  getNameByLabel,
  getPrimaryName,
  listMarketplaceActivity,
  listMarketplaceAuctions,
  listMarketplaceListings,
  listNamesForOwner,
  listPrimaryAuctions,
  listReservedNames,
} from "./ans/repository.js";
import type {
  AnsName,
  MarketplaceAuction,
  MarketplaceListing,
  PrimaryAuction,
  ReservedName,
} from "./ans/types.js";

const addressSchema = z.string().refine(isAddress, "Invalid address");
const chainQuery = z.object({ chainId: z.coerce.number().int().positive().optional() });
const listQuery = chainQuery.extend({ limit: z.coerce.number().int().min(1).max(200).default(100) });
const pricingQuery = chainQuery.extend({
  name: z.string().min(1).max(80).optional(),
  durationYears: z.coerce.number().int().min(1).max(10).default(1),
  beneficiary: addressSchema.optional(),
});
const suggestionsQuery = chainQuery.extend({
  q: z.string().min(1).max(32),
  beneficiary: addressSchema.optional(),
  limit: z.coerce.number().int().min(1).max(6).default(5),
});
const quoteBody = z.object({
  action: z.enum(["register", "renew", "fixed_premium_register"]),
  name: z.string().min(1).max(80),
  beneficiary: addressSchema,
  chainId: z.coerce.number().int().positive().optional(),
  durationYears: z.coerce.number().int().min(1).max(10).default(1),
});

export class ChainMismatchError extends Error {
  readonly statusCode = 400;
  readonly code = "chain_mismatch";
}

function assertActiveChain(chainId?: number) {
  const requested = chainId ?? config.deployment.chainId;
  if (requested !== config.deployment.chainId) {
    throw new ChainMismatchError(
      `This backend indexes chain ${config.deployment.chainId}; received ${requested}`,
    );
  }
  return requested;
}

function refreshAnsIndexInBackground() {
  void ensureAnsIndexFresh().catch(() => undefined);
}

function buildSuggestionLabels(input: string, limit: number) {
  const label = normalizeAnsLabel(input);
  if (!label) return [];
  return [...new Set([
    label,
    `${label}hq`,
    `${label}labs`,
    `${label}dao`,
    `get${label}`,
    `${label}x`,
  ])]
    .filter((candidate) => normalizeAnsLabel(candidate))
    .slice(0, limit);
}

function serializeName(name: AnsName) {
  const now = BigInt(Math.floor(Date.now() / 1_000));
  return {
    ...name,
    expiry: name.expiry.toString(),
    registeredBlock: name.registeredBlock?.toString() ?? null,
    resolverNameUpdatedBlock: name.resolverNameUpdatedBlock.toString(),
    updatedBlock: name.updatedBlock.toString(),
    isExpired: name.expiry <= now,
  };
}

function auctionStatus(item: { startTime: bigint; endTime: bigint; settled: boolean; cancelled: boolean }) {
  const now = BigInt(Math.floor(Date.now() / 1_000));
  if (item.cancelled) return "cancelled";
  if (item.settled) return "settled";
  if (now < item.startTime) return "scheduled";
  if (now >= item.endTime) return "ended";
  return "active";
}

function serializePrimary(item: PrimaryAuction) {
  return {
    ...item,
    auctionId: item.auctionId.toString(), duration: item.duration.toString(),
    reservePrice: item.reservePrice.toString(), startTime: item.startTime.toString(),
    endTime: item.endTime.toString(), currentExtensionWindow: item.currentExtensionWindow.toString(),
    highestBid: item.highestBid.toString(), createdBlock: item.createdBlock?.toString() ?? null,
    updatedBlock: item.updatedBlock.toString(), status: auctionStatus(item),
  };
}

function serializeListing(item: MarketplaceListing) {
  return {
    ...item,
    listingId: item.listingId.toString(), price: item.price.toString(),
    purchasedPrice: item.purchasedPrice?.toString() ?? null,
    createdBlock: item.createdBlock?.toString() ?? null, updatedBlock: item.updatedBlock.toString(),
    status: item.active ? "active" : item.buyer ? "sold" : "cancelled",
  };
}

function serializeMarketplaceAuction(item: MarketplaceAuction) {
  return {
    ...item,
    auctionId: item.auctionId.toString(), reservePrice: item.reservePrice.toString(),
    startTime: item.startTime.toString(), endTime: item.endTime.toString(),
    currentExtensionWindow: item.currentExtensionWindow.toString(), highestBid: item.highestBid.toString(),
    createdBlock: item.createdBlock?.toString() ?? null, updatedBlock: item.updatedBlock.toString(),
    status: auctionStatus(item),
  };
}

function serializeReserved(item: ReservedName) {
  return {
    ...item,
    reservePriceWei: item.reservePriceWei?.toString() ?? null,
    fixedPriceWei: item.fixedPriceWei?.toString() ?? null,
    auctionDurationSeconds: item.auctionDurationSeconds.toString(),
    primaryAuctionId: item.primaryAuctionId?.toString() ?? null,
  };
}

const rateWindows = new Map<string, { startedAt: number; hits: number }>();

async function publicRateLimit(request: FastifyRequest, reply: FastifyReply) {
  const now = Date.now();
  const key = request.ip;
  const current = rateWindows.get(key);
  const window = !current || now - current.startedAt >= 60_000
    ? { startedAt: now, hits: 1 }
    : { ...current, hits: current.hits + 1 };
  rateWindows.set(key, window);
  if (window.hits > config.ansPublicRateLimitPerMinute) {
    return reply.code(429).send({ error: "rate_limited" });
  }
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "abeypad-api",
    chainId: config.deployment.chainId,
    database: isDatabaseReady() ? "ready" : "degraded",
  }));

  app.get("/api/config", async () => ({
    activeNetwork: config.deployment.network,
    activeChainId: config.deployment.chainId,
    tld: "abey",
    networks: Object.fromEntries(Object.entries(config.deployments).map(([key, deployment]) => [
      key,
      {
        chainId: deployment.chainId,
        name: deployment.name,
        rpcUrl: deployment.rpcUrl,
        explorerUrl: deployment.explorerUrl,
        startBlock: deployment.startBlock.toString(),
        contracts: deployment.contracts,
      },
    ])),
    features: { names: true, marketplace: true, nfts: false, emailNotifications: false },
  }));

  app.addHook("preHandler", async (request, reply) => {
    if (
      request.url.startsWith("/api/public/ans/") ||
      request.url.startsWith("/api/public/price/")
    ) {
      await publicRateLimit(request, reply);
    }
  });

  app.get("/api/public/price/abey", async (request, reply) => {
    const query = chainQuery.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "invalid_price_request" });
    }
    try {
      const chainId = assertActiveChain(query.data.chainId);
      const price = await getAbeyUsdPrice();
      reply.header("cache-control", "public, max-age=30, stale-while-revalidate=90");
      return {
        chainId,
        asset: "ABEY",
        currency: "USD",
        priceUsd: price.priceUsd,
        fetchedAt: new Date(price.fetchedAt).toISOString(),
      };
    } catch (error) {
      if (error instanceof ChainMismatchError) {
        return reply.code(400).send({
          error: error.code,
          detail: error.message,
        });
      }
      return reply.code(502).send({
        error: "price_feed_unavailable",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/ans/pricing", async (request, reply) => {
    const parsed = pricingQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_pricing_request" });
    try {
      assertActiveChain(parsed.data.chainId);
      return await getAnsPricing({
        name: parsed.data.name,
        duration: BigInt(parsed.data.durationYears) * YEAR_SECONDS,
        beneficiary: parsed.data.beneficiary,
      });
    } catch (error) {
      return reply.code(400).send({ error: "pricing_failed", detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/public/ans/suggestions", async (request, reply) => {
    const parsed = suggestionsQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_suggestions_request" });
    try {
      const chainId = assertActiveChain(parsed.data.chainId);
      const labels = buildSuggestionLabels(parsed.data.q, parsed.data.limit);
      const liveResults = await Promise.all(labels.map((label) => readAnsAvailability(label)));
      const suggestions = [];
      for (let index = 0; index < labels.length; index += 1) {
        const label = labels[index]!;
        const live = liveResults[index];
        const policy = live?.policy ?? 0;
        const available = Boolean(live?.available && policy === 0);
        const pricing = available
          ? await getAnsPricing({
              name: label,
              duration: YEAR_SECONDS,
              beneficiary: parsed.data.beneficiary,
            })
          : null;
        suggestions.push({
          chainId,
          label,
          name: `${label}.abey`,
          length: label.length,
          available,
          policy,
          status: policy !== 0 ? "reserved" : available ? "available" : "taken",
          price: pricing?.estimate
            ? {
                priceAbey: pricing.estimate.priceAbey,
                totalUsd: pricing.estimate.totalUsd,
                usdCentsPerYear: pricing.estimate.usdCentsPerYear,
                pricingMode: pricing.pricingMode,
              }
            : null,
        });
      }
      reply.header("cache-control", "private, max-age=5");
      return { chainId, suggestions };
    } catch (error) {
      return reply.code(400).send({
        error: "suggestions_failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/ans/quote", async (request, reply) => {
    const parsed = quoteBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_quote_request", detail: parsed.error.flatten() });
    try {
      assertActiveChain(parsed.data.chainId);
      return await buildAnsQuote({
        action: parsed.data.action,
        name: parsed.data.name,
        beneficiary: parsed.data.beneficiary,
        duration: BigInt(parsed.data.durationYears) * YEAR_SECONDS,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return reply.code(detail.includes("ANS_PRICE_SIGNER_PRIVATE_KEY") ? 503 : 400).send({
        error: detail.includes("ANS_PRICE_SIGNER_PRIVATE_KEY") ? "quote_signer_unavailable" : "quote_failed",
        detail,
      });
    }
  });

  app.get("/api/public/ans/status", async (_request, reply) => {
    refreshAnsIndexInBackground();
    reply.header("cache-control", "public, max-age=10, stale-while-revalidate=30");
    return getAnsIndexHealth();
  });

  app.get("/api/public/ans/name/:fqdn", async (request, reply) => {
    const params = z.object({ fqdn: z.string().min(1).max(80) }).safeParse(request.params);
    const query = chainQuery.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "invalid_name" });
    try {
      assertActiveChain(query.data.chainId);
      const live = await readAnsName(params.data.fqdn);
      const indexed = await getNameByLabel(config.deployment.chainId, live.label).catch(() => null);
      reply.header("cache-control", "public, max-age=10, stale-while-revalidate=30");
      return { ...live, expiry: live.expiry.toString(), indexed: indexed ? serializeName(indexed) : null };
    } catch (error) {
      return reply.code(400).send({ error: "name_lookup_failed", detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/public/ans/resolve/name/:fqdn", async (request, reply) => {
    const params = z.object({ fqdn: z.string().min(1).max(80) }).safeParse(request.params);
    const query = chainQuery.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "invalid_name" });
    try {
      assertActiveChain(query.data.chainId);
      const live = await readAnsName(params.data.fqdn);
      if (!live.resolvedAddress || live.available) return reply.code(404).send({ error: "name_not_found" });
      return { chainId: live.chainId, name: live.name, node: live.node, address: live.resolvedAddress, expiry: live.expiry.toString() };
    } catch (error) {
      return reply.code(400).send({ error: "resolution_failed", detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/public/ans/resolve/address/:address", async (request, reply) => {
    const params = z.object({ address: addressSchema }).safeParse(request.params);
    const query = chainQuery.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "invalid_address" });
    try {
      const chainId = assertActiveChain(query.data.chainId);
      if (!isDatabaseReady()) {
        return {
          chainId,
          address: getAddress(params.data.address),
          primaryName: null,
          node: null,
          expiry: null,
          degraded: true,
        };
      }
      refreshAnsIndexInBackground();
      const record = await getPrimaryName(chainId, getAddress(params.data.address));
      return {
        chainId,
        address: getAddress(params.data.address),
        primaryName: record?.fqdn ?? null,
        node: record?.node ?? null,
        expiry: record?.expiry.toString() ?? null,
      };
    } catch (error) {
      return reply.code(400).send({ error: "reverse_resolution_failed", detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/public/ans/names/:address", async (request, reply) => {
    const params = z.object({ address: addressSchema }).safeParse(request.params);
    const query = chainQuery.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "invalid_address" });
    const chainId = assertActiveChain(query.data.chainId);
    if (!isDatabaseReady()) {
      return {
        chainId,
        owner: getAddress(params.data.address),
        names: [],
        degraded: true,
      };
    }
    refreshAnsIndexInBackground();
    const owner = getAddress(params.data.address);
    const [names, primaryName] = await Promise.all([
      listNamesForOwner(chainId, owner),
      getPrimaryName(chainId, owner),
    ]);
    return {
      chainId,
      owner,
      names: names.map((name) => ({
        ...serializeName(name),
        isPrimary: name.node.toLowerCase() === primaryName?.node.toLowerCase(),
      })),
    };
  });

  app.get("/api/public/ans/auctions", async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    const chainId = assertActiveChain(query.data.chainId);
    if (!isDatabaseReady()) return { chainId, auctions: [], degraded: true };
    refreshAnsIndexInBackground();
    return { chainId, auctions: (await listPrimaryAuctions(chainId, query.data.limit)).map(serializePrimary) };
  });

  app.get("/api/public/ans/marketplace/listings", async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    const chainId = assertActiveChain(query.data.chainId);
    if (!isDatabaseReady()) return { chainId, listings: [], degraded: true };
    refreshAnsIndexInBackground();
    return { chainId, listings: (await listMarketplaceListings(chainId, query.data.limit)).map(serializeListing) };
  });

  app.get("/api/public/ans/marketplace/auctions", async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    const chainId = assertActiveChain(query.data.chainId);
    if (!isDatabaseReady()) return { chainId, auctions: [], degraded: true };
    refreshAnsIndexInBackground();
    return { chainId, auctions: (await listMarketplaceAuctions(chainId, query.data.limit)).map(serializeMarketplaceAuction) };
  });

  app.get("/api/public/ans/marketplace/activity", async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    const chainId = assertActiveChain(query.data.chainId);
    if (!isDatabaseReady()) return { chainId, activity: [], degraded: true };
    refreshAnsIndexInBackground();
    return { chainId, activity: await listMarketplaceActivity(chainId, query.data.limit) };
  });

  app.get("/api/public/ans/marketplace/reserved", async (request, reply) => {
    const query = listQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    const chainId = assertActiveChain(query.data.chainId);
    if (!isDatabaseReady()) return { chainId, names: [], degraded: true };
    return { chainId, names: (await listReservedNames(chainId, true)).slice(0, query.data.limit).map(serializeReserved) };
  });

  app.get("/api/public/ans/search", async (request, reply) => {
    const query = z.object({ q: z.string().min(1).max(32), chainId: z.coerce.number().int().positive().optional() }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    assertActiveChain(query.data.chainId);
    const label = normalizeAnsLabel(query.data.q);
    if (!label) return reply.code(400).send({ error: "invalid_name" });
    const [live, reserved] = await Promise.all([
      readAnsName(label),
      listReservedNames(config.deployment.chainId, false).catch(() => []),
    ]);
    const matchingReserved = reserved.find((item) => item.label === label) ?? null;
    return {
      ...live,
      expiry: live.expiry.toString(),
      reserved: matchingReserved ? serializeReserved(matchingReserved) : null,
    };
  });
}
