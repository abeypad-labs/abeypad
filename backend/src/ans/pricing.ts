import { randomBytes } from "node:crypto";
import {
  formatEther,
  getAddress,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import { getReservedName } from "./repository.js";
import { normalizeAnsLabel } from "./indexer.js";

export const YEAR_SECONDS = 365n * 24n * 60n * 60n;
export const PUBLIC_MIN_NAME_LENGTH = 4;
const WEI_PER_ABEY = 1_000_000_000_000_000_000n;
const MICROS_PER_USD = 1_000_000n;
const FULL_PRICE_BPS = 10_000n;
const TESTNET_ADMIN_PRICE_BPS = 100n;

const actionIds = {
  register: 0,
  renew: 1,
  fixed_premium_register: 2,
} as const;

export type QuoteAction = keyof typeof actionIds;

let priceCache: { priceUsd: number; priceMicros: bigint; fetchedAt: number } | null = null;
let priceRequest: Promise<{ priceUsd: number; priceMicros: bigint; fetchedAt: number }> | null = null;

export function usdCentsPerYear(label: string) {
  if (label.length < PUBLIC_MIN_NAME_LENGTH) {
    throw new Error("1-3 character names are reserved");
  }
  if (label.length === 4) return 6_000;
  if (label.length === 5) return 2_000;
  if (label.length < 10) return 700;
  return 500;
}

function yearsForDuration(duration: bigint) {
  return (duration + YEAR_SECONDS - 1n) / YEAR_SECONDS;
}

function multiplierForYears(years: bigint) {
  if (years >= 5n) return 8_500;
  if (years >= 3n) return 9_000;
  if (years >= 2n) return 9_500;
  return 10_000;
}

function formatUsd(cents: bigint) {
  return (Number(cents) / 100).toFixed(2);
}

function formatUsdMicros(micros: bigint) {
  return (Number(micros) / Number(MICROS_PER_USD)).toFixed(2);
}

function priceMultiplierBpsFor(beneficiary?: string) {
  if (
    config.deployment.chainId === 178 &&
    config.ansTestnetAdminWallet &&
    beneficiary &&
    getAddress(beneficiary) === config.ansTestnetAdminWallet
  ) {
    return TESTNET_ADMIN_PRICE_BPS;
  }
  return FULL_PRICE_BPS;
}

export async function getAbeyUsdPrice() {
  const now = Date.now();
  if (priceCache && now - priceCache.fetchedAt < config.abeyPriceSourceRefreshIntervalMs) {
    return priceCache;
  }
  if (!priceRequest) {
    priceRequest = (async () => {
      const response = await fetch(config.abeyPriceSourceUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`ABEY/USD source returned HTTP ${response.status}`);
      const payload = (await response.json()) as { abey?: { usd?: unknown } };
      const priceUsd = Number(payload.abey?.usd);
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
        throw new Error("Invalid ABEY/USD price response");
      }
      priceCache = {
        priceUsd,
        priceMicros: BigInt(Math.round(priceUsd * Number(MICROS_PER_USD))),
        fetchedAt: Date.now(),
      };
      return priceCache;
    })().finally(() => {
      priceRequest = null;
    });
  }
  try {
    return await priceRequest;
  } catch (error) {
    const priceUsd = priceCache?.priceUsd ?? config.abeyPriceFallbackUsd;
    priceCache = {
      priceUsd,
      priceMicros: BigInt(Math.round(priceUsd * Number(MICROS_PER_USD))),
      fetchedAt: Date.now(),
    };
    return priceCache;
  }
}

function standardPrice(
  label: string,
  duration: bigint,
  abeyUsdMicros: bigint,
  priceMultiplierBps = FULL_PRICE_BPS,
) {
  const years = yearsForDuration(duration);
  const annualCents = BigInt(usdCentsPerYear(label));
  const subtotalCents = annualCents * years;
  const multiplierBps = multiplierForYears(years);
  const totalCents = (subtotalCents * BigInt(multiplierBps)) / 10_000n;
  const standardUsdMicros = totalCents * 10_000n;
  const effectiveUsdMicros = (standardUsdMicros * priceMultiplierBps) / FULL_PRICE_BPS;
  const standardPriceWei = (standardUsdMicros * WEI_PER_ABEY) / abeyUsdMicros;
  const priceWei = (standardPriceWei * priceMultiplierBps) / FULL_PRICE_BPS;
  return {
    years,
    annualCents,
    subtotalCents,
    multiplierBps,
    totalCents,
    standardUsdMicros,
    effectiveUsdMicros,
    priceWei,
  };
}

function annualPrice(usdCents: number, abeyUsdMicros: bigint) {
  const priceWei = (BigInt(usdCents) * 10_000n * WEI_PER_ABEY) / abeyUsdMicros;
  return {
    priceWeiPerYear: priceWei.toString(),
    priceAbeyPerYear: formatEther(priceWei),
  };
}

export async function getAnsPricing(input?: {
  name?: string;
  duration?: bigint;
  beneficiary?: string;
}) {
  const price = await getAbeyUsdPrice();
  const label = input?.name ? normalizeAnsLabel(input.name) : null;
  const duration = input?.duration && input.duration > 0n ? input.duration : YEAR_SECONDS;
  const priceMultiplierBps = priceMultiplierBpsFor(input?.beneficiary);
  const estimate = label && label.length >= PUBLIC_MIN_NAME_LENGTH
    ? standardPrice(label, duration, price.priceMicros, priceMultiplierBps)
    : null;
  const tiers = [
    { label: "4 characters", minLength: 4, maxLength: 4, usdCentsPerYear: 6_000, usdPerYear: "60.00" },
    { label: "5 characters", minLength: 5, maxLength: 5, usdCentsPerYear: 2_000, usdPerYear: "20.00" },
    { label: "6-9 characters", minLength: 6, maxLength: 9, usdCentsPerYear: 700, usdPerYear: "7.00" },
    { label: "10-32 characters", minLength: 10, maxLength: 32, usdCentsPerYear: 500, usdPerYear: "5.00" },
  ].map((tier) => ({
    ...tier,
    ...annualPrice(tier.usdCentsPerYear, price.priceMicros),
  }));
  return {
    chainId: config.deployment.chainId,
    nativeSymbol: "ABEY",
    pricingMode: priceMultiplierBps === TESTNET_ADMIN_PRICE_BPS
      ? "testnet_admin"
      : "standard",
    priceMultiplierBps: Number(priceMultiplierBps),
    abeyUsd: price.priceUsd,
    priceFetchedAt: new Date(price.fetchedAt).toISOString(),
    multiYearPolicy: {
      schedule: [
        { years: 1, discountBps: 0 },
        { years: 2, discountBps: 500 },
        { years: 3, discountBps: 1_000 },
        { years: 5, discountBps: 1_500 },
      ],
      description: "5% off for 2 years, 10% off for 3-4 years, and 15% off for 5+ years.",
    },
    tiers,
    estimate: estimate
      ? {
          label,
          name: `${label}.abey`,
          years: estimate.years.toString(),
          usdCentsPerYear: Number(estimate.annualCents),
          subtotalUsd: formatUsd(estimate.subtotalCents),
          discountBps: 10_000 - estimate.multiplierBps,
          standardTotalUsd: formatUsdMicros(estimate.standardUsdMicros),
          totalUsd: formatUsdMicros(estimate.effectiveUsdMicros),
          priceAbey: formatEther(estimate.priceWei),
          priceWei: estimate.priceWei.toString(),
        }
      : null,
  };
}

export async function buildAnsQuote(input: {
  action: QuoteAction;
  name: string;
  beneficiary: string;
  duration: bigint;
}) {
  const label = normalizeAnsLabel(input.name);
  if (!label) throw new Error("Invalid .abey name");
  if (input.duration < YEAR_SECONDS) throw new Error("Duration must be at least 365 days");
  if (input.action === "register" && label.length < PUBLIC_MIN_NAME_LENGTH) {
    throw new Error("1-3 character names are reserved");
  }
  if (!config.ansPriceSignerPrivateKey) {
    throw new Error("ANS_PRICE_SIGNER_PRIVATE_KEY is not configured");
  }

  const beneficiary = getAddress(input.beneficiary) as Address;
  const abeyUsd = await getAbeyUsdPrice();
  const priceMultiplierBps = priceMultiplierBpsFor(beneficiary);
  let priceWei: bigint;
  if (input.action === "fixed_premium_register") {
    const reserved = await getReservedName(config.deployment.chainId, label);
    if (!reserved?.enabled || !reserved.activatedAt || reserved.saleMode !== "buy_now" || !reserved.fixedPriceWei) {
      throw new Error("This fixed-price premium name is not available");
    }
    priceWei = reserved.fixedPriceWei;
  } else {
    priceWei = standardPrice(
      label,
      input.duration,
      abeyUsd.priceMicros,
      priceMultiplierBps,
    ).priceWei;
  }

  const deadline = BigInt(Math.floor(Date.now() / 1_000) + config.ansPriceQuoteTtlSeconds);
  const quote = {
    action: actionIds[input.action],
    labelHash: keccak256(stringToBytes(label)),
    beneficiary,
    duration: input.duration,
    priceWei,
    deadline,
    nonce: `0x${randomBytes(32).toString("hex")}` as Hex,
  } as const;

  const account = privateKeyToAccount(config.ansPriceSignerPrivateKey);
  const signature = await account.signTypedData({
    domain: {
      name: "Abey ANS Registrar",
      version: "2",
      chainId: config.deployment.chainId,
      verifyingContract: config.deployment.contracts.registrar,
    },
    types: {
      PriceQuote: [
        { name: "action", type: "uint8" },
        { name: "labelHash", type: "bytes32" },
        { name: "beneficiary", type: "address" },
        { name: "duration", type: "uint256" },
        { name: "priceWei", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "PriceQuote",
    message: quote,
  });

  return {
    chainId: config.deployment.chainId,
    registrar: config.deployment.contracts.registrar,
    label,
    name: `${label}.abey`,
    quote: {
      ...quote,
      duration: quote.duration.toString(),
      priceWei: quote.priceWei.toString(),
      deadline: quote.deadline.toString(),
    },
    signature,
    display: {
      abeyUsd: abeyUsd.priceUsd,
      priceAbey: formatEther(priceWei),
      pricingMode: priceMultiplierBps === TESTNET_ADMIN_PRICE_BPS
        ? "testnet_admin"
        : "standard",
      priceMultiplierBps: Number(priceMultiplierBps),
      quoteExpiresAt: new Date(Number(deadline) * 1_000).toISOString(),
    },
  };
}
