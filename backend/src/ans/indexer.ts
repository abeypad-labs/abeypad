import {
  createPublicClient,
  decodeFunctionData,
  getAddress,
  http,
  parseAbi,
  parseAbiItem,
  zeroAddress,
  type Address,
  type AbiEvent,
  type Hex,
} from "viem";
import { namehash } from "viem/ens";
import { config } from "../config.js";
import { pool } from "../db.js";
import { logger } from "../logger.js";
import {
  applyOwner,
  applyRelease,
  applyRenewal,
  applyResolvedAddress,
  applyResolver,
  getSyncBlock,
  recordMarketplaceEvent,
  setSyncBlock,
  upsertMarketplaceAuction,
  upsertMarketplaceListing,
  upsertPrimaryAuction,
  upsertLiveName,
  upsertRegistration,
} from "./repository.js";

const deployment = config.deployment;

export const ansClient = createPublicClient({
  transport: http(deployment.rpcUrl, { retryCount: 2, timeout: 20_000 }),
});

export const registrarAbi = parseAbi([
  "function available(string name) view returns (bool)",
  "function expiryOf(string name) view returns (uint256)",
  "function effectivePolicy(string name) view returns (uint8)",
  "function register(string name,uint256 duration,address resolver_,(uint8 action,bytes32 labelHash,address beneficiary,uint256 duration,uint256 priceWei,uint256 deadline,bytes32 nonce) quote,bytes sig)",
  "function registerFixedPremium(string name,uint256 duration,address resolver_,(uint8 action,bytes32 labelHash,address beneficiary,uint256 duration,uint256 priceWei,uint256 deadline,bytes32 nonce) quote,bytes sig)",
  "function controllerRegisterReserved(string name,uint256 duration,address beneficiary,address resolver_)",
  "function adminAssignProtected(string name,uint256 duration,address beneficiary,address resolver_)",
  "function renew(string name,uint256 duration,(uint8 action,bytes32 labelHash,address beneficiary,uint256 duration,uint256 priceWei,uint256 deadline,bytes32 nonce) quote,bytes sig)",
  "function release(string name)",
]);

const registryReadAbi = parseAbi([
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
]);

const resolverReadAbi = parseAbi(["function addr(bytes32 node) view returns (address)"]);

export const primaryAuctionAbi = parseAbi([
  "function auctionCount() view returns (uint256)",
  "function auction(uint256 auctionId) view returns ((string name,uint256 duration,uint256 reservePrice,uint96 minIncrementBps,uint64 startTime,uint64 endTime,uint64 currentExtensionWindow,uint32 bidCount,address highestBidder,uint256 highestBid,bool settled,bool cancelled))",
  "function minimumNextBid(uint256 auctionId) view returns (uint256)",
  "function pendingReturns(address account) view returns (uint256)",
]);

export const marketplaceAbi = parseAbi([
  "function listingCount() view returns (uint256)",
  "function auctionCount() view returns (uint256)",
  "function listing(uint256 listingId) view returns ((bytes32 node,bytes32 labelHash,string name,address seller,uint256 price,bool active))",
  "function auction(uint256 auctionId) view returns ((bytes32 node,bytes32 labelHash,string name,address seller,uint256 reservePrice,uint96 minIncrementBps,uint64 startTime,uint64 endTime,uint64 currentExtensionWindow,uint32 bidCount,address highestBidder,uint256 highestBid,bool settled,bool cancelled))",
  "function minimumNextBid(uint256 auctionId) view returns (uint256)",
  "function pendingReturns(address account) view returns (uint256)",
  "function claimableProceeds(address account) view returns (uint256)",
]);

const registrarEvents = {
  registered: parseAbiItem(
    "event NameRegistered(string indexed name,bytes32 indexed node,address indexed registrant,uint256 expires)",
  ),
  renewed: parseAbiItem("event NameRenewed(string indexed name,bytes32 indexed node,uint256 expires)"),
  released: parseAbiItem("event NameReleased(string indexed name,bytes32 indexed node)"),
};

const registryEvents = {
  transfer: parseAbiItem("event Transfer(bytes32 indexed node,address owner)"),
  resolver: parseAbiItem("event NewResolver(bytes32 indexed node,address resolver)"),
};

const resolverEvent = parseAbiItem("event AddrChanged(bytes32 indexed node,address addr)");

const primaryEvents = [
  parseAbiItem("event AuctionCreated(uint256 indexed auctionId,string name,uint256 reservePrice,uint64 startTime,uint64 endTime,uint256 duration)"),
  parseAbiItem("event BidPlaced(uint256 indexed auctionId,address indexed bidder,uint256 amount,uint64 endTime,uint64 nextExtensionWindow)"),
  parseAbiItem("event AuctionCancelled(uint256 indexed auctionId)"),
  parseAbiItem("event AuctionSettled(uint256 indexed auctionId,address indexed winner,uint256 amount)"),
] as const;

const marketEvents = [
  parseAbiItem("event Listed(uint256 indexed listingId,bytes32 indexed node,string name,address indexed seller,uint256 price)"),
  parseAbiItem("event ListingCancelled(uint256 indexed listingId)"),
  parseAbiItem("event ListingPurchased(uint256 indexed listingId,address indexed buyer,uint256 price)"),
  parseAbiItem("event SecondaryAuctionCreated(uint256 indexed auctionId,bytes32 indexed node,string name,address indexed seller,uint256 reservePrice,uint64 startTime,uint64 endTime)"),
  parseAbiItem("event BidPlaced(uint256 indexed auctionId,address indexed bidder,uint256 amount,uint64 endTime,uint64 nextExtensionWindow)"),
  parseAbiItem("event SecondaryAuctionCancelled(uint256 indexed auctionId)"),
  parseAbiItem("event SecondaryAuctionSettled(uint256 indexed auctionId,address indexed winner,uint256 amount)"),
] as const;

const blockTimeCache = new Map<bigint, Date>();
const txLabelCache = new Map<Hex, string | null>();
let syncPromise: Promise<void> | null = null;
let lastSnapshotAt = 0;

export function normalizeAnsLabel(value: string) {
  const label = value.trim().toLowerCase().replace(/\.abey$/i, "");
  if (label.length < 1 || label.length > 32) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) return null;
  return label;
}

export function computeAnsNode(label: string): Hex {
  return namehash(`${label}.abey`);
}

async function blockTime(blockNumber: bigint) {
  const cached = blockTimeCache.get(blockNumber);
  if (cached) return cached;
  const block = await ansClient.getBlock({ blockNumber });
  const value = new Date(Number(block.timestamp) * 1_000);
  blockTimeCache.set(blockNumber, value);
  return value;
}

async function labelFromTransaction(hash: Hex) {
  if (txLabelCache.has(hash)) return txLabelCache.get(hash) ?? null;
  try {
    const transaction = await ansClient.getTransaction({ hash });
    const decoded = decodeFunctionData({ abi: registrarAbi, data: transaction.input });
    const candidate = typeof decoded.args?.[0] === "string" ? decoded.args[0] : "";
    const label = normalizeAnsLabel(candidate);
    txLabelCache.set(hash, label);
    return label;
  } catch {
    txLabelCache.set(hash, null);
    return null;
  }
}

async function syncRegistrar(fromBlock: bigint, toBlock: bigint) {
  const [registered, renewed, released] = await Promise.all([
    ansClient.getLogs({ address: deployment.contracts.registrar, event: registrarEvents.registered, fromBlock, toBlock }),
    ansClient.getLogs({ address: deployment.contracts.registrar, event: registrarEvents.renewed, fromBlock, toBlock }),
    ansClient.getLogs({ address: deployment.contracts.registrar, event: registrarEvents.released, fromBlock, toBlock }),
  ]);
  const entries = [
    ...registered.map((log) => ({ kind: "registered" as const, log })),
    ...renewed.map((log) => ({ kind: "renewed" as const, log })),
    ...released.map((log) => ({ kind: "released" as const, log })),
  ].sort((a, b) => Number((a.log.blockNumber ?? 0n) - (b.log.blockNumber ?? 0n)) || Number((a.log.logIndex ?? 0) - (b.log.logIndex ?? 0)));

  const db = await pool.connect();
  try {
    await db.query("begin");
    for (const entry of entries) {
      const log = entry.log;
      if (!log.transactionHash || log.blockNumber == null) continue;
      const label = await labelFromTransaction(log.transactionHash);
      const args = log.args as Record<string, unknown>;
      const node = args.node as Hex;
      if (entry.kind === "registered") {
        await upsertRegistration(db, {
          chainId: deployment.chainId,
          node,
          label,
          registrant: getAddress(args.registrant as string),
          expiry: BigInt(String(args.expires)),
          txHash: log.transactionHash,
          block: log.blockNumber,
          blockTime: await blockTime(log.blockNumber),
        });
      } else if (entry.kind === "renewed") {
        await applyRenewal(db, {
          chainId: deployment.chainId,
          node,
          label,
          expiry: BigInt(String(args.expires)),
          block: log.blockNumber,
        });
      } else {
        await applyRelease(db, {
          chainId: deployment.chainId,
          node,
          label,
          block: log.blockNumber,
          blockTime: await blockTime(log.blockNumber),
        });
      }
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

async function syncRegistry(fromBlock: bigint, toBlock: bigint) {
  const [transfers, resolvers] = await Promise.all([
    ansClient.getLogs({ address: deployment.contracts.registry, event: registryEvents.transfer, fromBlock, toBlock }),
    ansClient.getLogs({ address: deployment.contracts.registry, event: registryEvents.resolver, fromBlock, toBlock }),
  ]);
  const db = await pool.connect();
  try {
    await db.query("begin");
    for (const log of transfers) {
      if (log.blockNumber == null) continue;
      await applyOwner(db, {
        chainId: deployment.chainId,
        node: log.args.node as Hex,
        owner: getAddress(log.args.owner as string),
        block: log.blockNumber,
      });
    }
    for (const log of resolvers) {
      if (log.blockNumber == null) continue;
      await applyResolver(db, {
        chainId: deployment.chainId,
        node: log.args.node as Hex,
        resolver: getAddress(log.args.resolver as string),
        block: log.blockNumber,
      });
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

async function syncResolver(fromBlock: bigint, toBlock: bigint) {
  const logs = await ansClient.getLogs({
    address: deployment.contracts.resolver,
    event: resolverEvent,
    fromBlock,
    toBlock,
  });
  const db = await pool.connect();
  try {
    await db.query("begin");
    for (const log of logs) {
      if (log.blockNumber == null) continue;
      await applyResolvedAddress(db, {
        chainId: deployment.chainId,
        node: log.args.node as Hex,
        address: getAddress(log.args.addr as string),
        block: log.blockNumber,
      });
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

async function syncActivity(
  source: "primary_auction" | "marketplace",
  address: Address,
  events: readonly AbiEvent[],
  fromBlock: bigint,
  toBlock: bigint,
) {
  const groups = await Promise.all(
    events.map((event) => ansClient.getLogs({ address, event, fromBlock, toBlock })),
  );
  const logs = groups.flat().sort((a, b) =>
    Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n)) || Number((a.logIndex ?? 0) - (b.logIndex ?? 0)),
  );
  const db = await pool.connect();
  try {
    await db.query("begin");
    for (const log of logs) {
      if (!log.transactionHash || log.blockNumber == null || log.logIndex == null) continue;
      const args = (log as unknown as { args: Record<string, unknown> }).args;
      const eventName = String((log as unknown as { eventName: string }).eventName);
      const entityId = args.listingId ?? args.auctionId;
      const account = args.seller ?? args.bidder ?? args.buyer ?? args.winner;
      const amount = args.price ?? args.amount ?? args.reservePrice;
      const name = typeof args.name === "string" ? normalizeAnsLabel(args.name) : null;
      await recordMarketplaceEvent(db, {
        chainId: deployment.chainId,
        source,
        entityType: eventName.toLowerCase().includes("listing") || eventName === "Listed" ? "listing" : "auction",
        eventType: `${source}.${eventName.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}`,
        entityId: entityId === undefined ? null : BigInt(String(entityId)),
        name,
        account: account ? getAddress(account as string) : null,
        amount: amount === undefined ? null : BigInt(String(amount)),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: Number(log.logIndex),
        blockTime: await blockTime(log.blockNumber),
      });
      if (source === "marketplace" && eventName === "ListingPurchased") {
        await db.query(
          `update abeypad_ans.marketplace_listings set active=false, buyer=lower($3), purchased_price=$4,
             updated_block=$5, updated_at=now() where chain_id=$1 and listing_id=$2`,
          [deployment.chainId, String(args.listingId), String(args.buyer), String(args.price), log.blockNumber.toString()],
        );
      }
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

const jobs = [
  { name: "registrar", address: deployment.contracts.registrar, run: syncRegistrar },
  { name: "registry", address: deployment.contracts.registry, run: syncRegistry },
  { name: "resolver", address: deployment.contracts.resolver, run: syncResolver },
  {
    name: "primary_auction",
    address: deployment.contracts.auctionHouse,
    run: (from: bigint, to: bigint) => syncActivity("primary_auction", deployment.contracts.auctionHouse, primaryEvents, from, to),
  },
  {
    name: "marketplace",
    address: deployment.contracts.marketplace,
    run: (from: bigint, to: bigint) => syncActivity("marketplace", deployment.contracts.marketplace, marketEvents, from, to),
  },
] as const;

async function syncJob(
  job: (typeof jobs)[number],
  head: bigint,
  options: { cursorName: string; initialBlock: bigint; maxChunks?: number },
) {
  let last = (await getSyncBlock({ chainId: deployment.chainId, jobName: options.cursorName, contractAddress: job.address }))
    ?? options.initialBlock;
  const chunkSize = BigInt(config.ansSyncChunkSize);
  let chunks = 0;
  while (last < head && (options.maxChunks === undefined || chunks < options.maxChunks)) {
    const from = last + 1n;
    const to = from + chunkSize - 1n > head ? head : from + chunkSize - 1n;
    await job.run(from, to);
    await setSyncBlock(pool, {
      chainId: deployment.chainId,
      jobName: options.cursorName,
      contractAddress: job.address,
      block: to,
    });
    last = to;
    chunks += 1;
  }
}

async function snapshotMarketplace(head: bigint) {
  const [primaryCount, listingCount, marketAuctionCount] = await Promise.all([
    ansClient.readContract({ address: deployment.contracts.auctionHouse, abi: primaryAuctionAbi, functionName: "auctionCount" }),
    ansClient.readContract({ address: deployment.contracts.marketplace, abi: marketplaceAbi, functionName: "listingCount" }),
    ansClient.readContract({ address: deployment.contracts.marketplace, abi: marketplaceAbi, functionName: "auctionCount" }),
  ]);
  const db = await pool.connect();
  try {
    await db.query("begin");
    for (let id = 0n; id < primaryCount; id += 1n) {
      const item = await ansClient.readContract({
        address: deployment.contracts.auctionHouse, abi: primaryAuctionAbi, functionName: "auction", args: [id],
      });
      await upsertPrimaryAuction(db, {
        chainId: deployment.chainId, auctionId: id, name: item.name, fqdn: `${item.name}.abey`,
        duration: item.duration, reservePrice: item.reservePrice, startTime: item.startTime,
        endTime: item.endTime, currentExtensionWindow: item.currentExtensionWindow,
        bidCount: item.bidCount, highestBidder: item.highestBidder === zeroAddress ? null : item.highestBidder,
        highestBid: item.highestBid, settled: item.settled, cancelled: item.cancelled,
        createdTxHash: null, createdBlock: null, updatedBlock: head,
      });
    }
    for (let id = 0n; id < listingCount; id += 1n) {
      const item = await ansClient.readContract({
        address: deployment.contracts.marketplace, abi: marketplaceAbi, functionName: "listing", args: [id],
      });
      await upsertMarketplaceListing(db, {
        chainId: deployment.chainId, listingId: id, node: item.node, name: item.name,
        fqdn: `${item.name}.abey`, seller: item.seller, price: item.price, active: item.active,
        buyer: null, purchasedPrice: null, createdTxHash: null, createdBlock: null, updatedBlock: head,
      });
    }
    for (let id = 0n; id < marketAuctionCount; id += 1n) {
      const item = await ansClient.readContract({
        address: deployment.contracts.marketplace, abi: marketplaceAbi, functionName: "auction", args: [id],
      });
      await upsertMarketplaceAuction(db, {
        chainId: deployment.chainId, auctionId: id, node: item.node, name: item.name,
        fqdn: `${item.name}.abey`, seller: item.seller, reservePrice: item.reservePrice,
        startTime: item.startTime, endTime: item.endTime, currentExtensionWindow: item.currentExtensionWindow,
        bidCount: item.bidCount, highestBidder: item.highestBidder === zeroAddress ? null : item.highestBidder,
        highestBid: item.highestBid, settled: item.settled, cancelled: item.cancelled,
        createdTxHash: null, createdBlock: null, updatedBlock: head,
      });
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
  lastSnapshotAt = Date.now();
}

async function runSync() {
  const head = await ansClient.getBlockNumber();
  const realtimeStart = head > BigInt(config.ansRealtimeLookbackBlocks)
    ? head - BigInt(config.ansRealtimeLookbackBlocks)
    : deployment.startBlock - 1n;
  const realtimeJobs = jobs.slice(0, 3);
  await Promise.all(realtimeJobs.map((job) => syncJob(job, head, {
    cursorName: `realtime:${job.name}`,
    initialBlock: realtimeStart,
  })));
  await Promise.all(jobs.map((job) => syncJob(job, head, {
    cursorName: job.name,
    initialBlock: deployment.startBlock - 1n,
    maxChunks: config.ansHistoricalChunksPerRun,
  })));
  if (Date.now() - lastSnapshotAt > 15_000) await snapshotMarketplace(head);
  logger.info("ANS index synchronized", { chainId: deployment.chainId, head: head.toString() });
}

export async function ensureAnsIndexFresh() {
  if (!syncPromise) {
    syncPromise = runSync().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

export function startAnsIndexer() {
  void ensureAnsIndexFresh().catch((error) =>
    logger.warn("Initial ANS synchronization failed", {
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  const timer = setInterval(() => {
    void ensureAnsIndexFresh().catch((error) =>
      logger.warn("Scheduled ANS synchronization failed", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }, config.ansSyncIntervalSeconds * 1_000);
  timer.unref();
}

export async function readAnsName(labelInput: string) {
  const label = normalizeAnsLabel(labelInput);
  if (!label) throw new Error("Invalid .abey name");
  const node = computeAnsNode(label);
  const [available, expiry, policy, owner, resolver, head] = await Promise.all([
    ansClient.readContract({ address: deployment.contracts.registrar, abi: registrarAbi, functionName: "available", args: [label] }),
    ansClient.readContract({ address: deployment.contracts.registrar, abi: registrarAbi, functionName: "expiryOf", args: [label] }),
    ansClient.readContract({ address: deployment.contracts.registrar, abi: registrarAbi, functionName: "effectivePolicy", args: [label] }),
    ansClient.readContract({ address: deployment.contracts.registry, abi: registryReadAbi, functionName: "owner", args: [node] }),
    ansClient.readContract({ address: deployment.contracts.registry, abi: registryReadAbi, functionName: "resolver", args: [node] }),
    ansClient.getBlockNumber(),
  ]);
  let resolvedAddress: Address | null = null;
  if (resolver !== zeroAddress) {
    try {
      const resolved = await ansClient.readContract({ address: resolver, abi: resolverReadAbi, functionName: "addr", args: [node] });
      resolvedAddress = resolved === zeroAddress ? null : resolved;
    } catch {
      resolvedAddress = null;
    }
  }
  const result = {
    chainId: deployment.chainId,
    label,
    name: `${label}.abey`,
    node,
    available,
    policy: label.length < 4 ? 2 : Number(policy),
    expiry,
    owner: owner === zeroAddress ? null : owner,
    resolver: resolver === zeroAddress ? null : resolver,
    resolvedAddress,
  };
  if (!available && owner !== zeroAddress) {
    await upsertLiveName({
      chainId: deployment.chainId,
      node,
      label,
      owner,
      expiry,
      resolver: resolver === zeroAddress ? null : resolver,
      resolvedAddress,
      block: head,
    }).catch((error) => logger.warn("Could not reconcile live ANS name", {
      label,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
  return result;
}

export async function readAnsAvailability(labelInput: string) {
  const label = normalizeAnsLabel(labelInput);
  if (!label) throw new Error("Invalid .abey name");
  if (label.length < 4) {
    return { label, available: false, policy: 2 };
  }
  const [available, policy] = await Promise.all([
    ansClient.readContract({
      address: deployment.contracts.registrar,
      abi: registrarAbi,
      functionName: "available",
      args: [label],
    }),
    ansClient.readContract({
      address: deployment.contracts.registrar,
      abi: registrarAbi,
      functionName: "effectivePolicy",
      args: [label],
    }),
  ]);
  return { label, available, policy: Number(policy) };
}

export async function getAnsIndexHealth() {
  const head = await ansClient.getBlockNumber();
  const result = await pool.query(
    `select job_name, contract_address, last_processed_block, last_processed_at
     from abeypad_ans.sync_state where chain_id = $1 order by job_name`,
    [deployment.chainId],
  );
  const rows = result.rows.map((row) => {
    const processed = BigInt(row.last_processed_block);
    return {
      jobName: row.job_name as string,
      contractAddress: row.contract_address as string,
      lastProcessedBlock: processed.toString(),
      lastProcessedAt: new Date(row.last_processed_at).toISOString(),
      blocksBehind: (head > processed ? head - processed : 0n).toString(),
    };
  });
  const realtimeRows = rows.filter((row) => row.jobName.startsWith("realtime:"));
  const historicalRows = rows.filter((row) => !row.jobName.startsWith("realtime:"));
  return {
    ok: realtimeRows.length === 3 && realtimeRows.every((row) => BigInt(row.blocksBehind) <= BigInt(config.ansSyncChunkSize * 2)),
    chainId: deployment.chainId,
    head: head.toString(),
    startBlock: deployment.startBlock.toString(),
    realtimeJobs: realtimeRows,
    jobs: historicalRows,
  };
}
