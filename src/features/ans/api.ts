import { getBackendApiUrl } from "@/config";
import type { Address, Hex } from "viem";

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code ?? null;
  }
}

async function request<T>(
  chainId: number,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getBackendApiUrl(chainId)}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
  };
  if (!response.ok) {
    throw new ApiError(response.status, payload.detail || payload.error || "Request failed", payload.error);
  }
  return payload as T;
}

export type AnsNameLookup = {
  chainId: number;
  label: string;
  name: string;
  node: Hex;
  available: boolean;
  policy: number;
  expiry: string;
  owner: Address | null;
  resolver: Address | null;
  resolvedAddress: Address | null;
  resolverName: string | null;
};

export type AnsResolution = {
  chainId: number;
  name: string;
  node: Hex;
  address: Address;
  expiry: string;
};

export type AnsReverseResolution = {
  chainId: number;
  address: Address;
  primaryName: string | null;
  node: Hex | null;
  expiry: string | null;
};

export type AnsOwnedName = {
  chainId: number;
  node: Hex;
  label: string;
  fqdn: string;
  registrant: Address;
  owner: Address;
  expiry: string;
  resolver: Address | null;
  resolvedAddress: Address | null;
  custody: "wallet" | "marketplace_listing" | "marketplace_auction";
  seller: Address | null;
  isExpired: boolean;
  isPrimary: boolean;
};

export type AnsPricing = {
  chainId: number;
  nativeSymbol: "ABEY";
  abeyUsd: number;
  pricingMode: "standard" | "testnet_admin";
  priceMultiplierBps: number;
  tiers: Array<{
    label: string;
    minLength: number;
    maxLength: number;
    usdPerYear: string;
    priceAbeyPerYear: string;
    priceWeiPerYear: string;
  }>;
  multiYearPolicy: {
    description: string;
    schedule: Array<{ years: number; discountBps: number }>;
  };
  estimate: null | {
    label: string;
    name: string;
    years: string;
    usdCentsPerYear: number;
    subtotalUsd: string;
    discountBps: number;
    standardTotalUsd: string;
    totalUsd: string;
    priceAbey: string;
    priceWei: string;
  };
};

export type SignedAnsQuote = {
  chainId: number;
  registrar: Address;
  label: string;
  name: string;
  quote: {
    action: number;
    labelHash: Hex;
    beneficiary: Address;
    duration: string;
    priceWei: string;
    deadline: string;
    nonce: Hex;
  };
  signature: Hex;
  display: {
    abeyUsd: number;
    priceAbey: string;
    pricingMode: "standard" | "testnet_admin";
    priceMultiplierBps: number;
    quoteExpiresAt: string;
  };
};

export type AnsSuggestion = {
  chainId: number;
  label: string;
  name: string;
  length: number;
  available: boolean;
  policy: number;
  status: "available" | "taken" | "reserved";
  price: null | {
    priceAbey: string;
    totalUsd: string;
    usdCentsPerYear: number;
    pricingMode: "standard" | "testnet_admin";
  };
};

export type PrimaryAuction = {
  chainId: number;
  auctionId: string;
  name: string;
  fqdn: string;
  duration: string;
  reservePrice: string;
  startTime: string;
  endTime: string;
  bidCount: number;
  highestBidder: Address | null;
  highestBid: string;
  status: string;
};

export type MarketplaceListing = {
  chainId: number;
  listingId: string;
  node: Hex;
  name: string;
  fqdn: string;
  seller: Address;
  price: string;
  active: boolean;
  buyer: Address | null;
  status: string;
};

export type MarketplaceAuction = {
  chainId: number;
  auctionId: string;
  node: Hex;
  name: string;
  fqdn: string;
  seller: Address;
  reservePrice: string;
  startTime: string;
  endTime: string;
  bidCount: number;
  highestBidder: Address | null;
  highestBid: string;
  status: string;
};

export type ReservedName = {
  id: number;
  chainId: number;
  label: string;
  fqdn: string;
  category: string;
  enabled: boolean;
  saleMode: "auction" | "buy_now";
  reservePriceWei: string | null;
  fixedPriceWei: string | null;
  auctionDurationSeconds: string;
  primaryAuctionId: string | null;
  activatedAt: string | null;
};

const chain = (chainId: number) => `chainId=${chainId}`;

export const ansApi = {
  lookup: (name: string, chainId: number) =>
    request<AnsNameLookup>(
      chainId,
      `/api/public/ans/name/${encodeURIComponent(name)}?${chain(chainId)}`,
    ),
  search: (name: string, chainId: number) =>
    request<AnsNameLookup & { reserved: ReservedName | null }>(
      chainId,
      `/api/public/ans/search?q=${encodeURIComponent(name)}&${chain(chainId)}`,
    ),
  resolveName: (name: string, chainId: number) =>
    request<AnsResolution>(
      chainId,
      `/api/public/ans/resolve/name/${encodeURIComponent(name)}?${chain(chainId)}`,
    ),
  resolveAddress: (address: Address, chainId: number) =>
    request<AnsReverseResolution>(
      chainId,
      `/api/public/ans/resolve/address/${address}?${chain(chainId)}`,
    ),
  pricing: (
    name: string | undefined,
    years: number,
    chainId: number,
    beneficiary?: Address,
  ) =>
    request<AnsPricing>(
      chainId,
      `/api/ans/pricing?${name ? `name=${encodeURIComponent(name)}&` : ""}durationYears=${years}&${chain(chainId)}${beneficiary ? `&beneficiary=${beneficiary}` : ""}`,
    ),
  suggestions: (
    name: string,
    chainId: number,
    beneficiary?: Address,
  ) =>
    request<{ suggestions: AnsSuggestion[] }>(
      chainId,
      `/api/public/ans/suggestions?q=${encodeURIComponent(name)}&${chain(chainId)}${beneficiary ? `&beneficiary=${beneficiary}` : ""}`,
    ).then((value) => value.suggestions),
  quote: (input: {
    action: "register" | "renew" | "fixed_premium_register";
    name: string;
    beneficiary: Address;
    durationYears: number;
  }, chainId: number) =>
    request<SignedAnsQuote>(chainId, "/api/ans/quote", {
      method: "POST",
      body: JSON.stringify({ ...input, chainId }),
    }),
  ownedNames: (owner: Address, chainId: number) =>
    request<{ names: AnsOwnedName[] }>(
      chainId,
      `/api/public/ans/names/${owner}?${chain(chainId)}`,
    ).then((value) => value.names),
  primaryAuctions: (chainId: number) =>
    request<{ auctions: PrimaryAuction[] }>(chainId, `/api/public/ans/auctions?${chain(chainId)}`).then(
      (value) => value.auctions,
    ),
  listings: (chainId: number) =>
    request<{ listings: MarketplaceListing[] }>(
      chainId,
      `/api/public/ans/marketplace/listings?${chain(chainId)}`,
    ).then((value) => value.listings),
  marketplaceAuctions: (chainId: number) =>
    request<{ auctions: MarketplaceAuction[] }>(
      chainId,
      `/api/public/ans/marketplace/auctions?${chain(chainId)}`,
    ).then((value) => value.auctions),
  reserved: (chainId: number) =>
    request<{ names: ReservedName[] }>(
      chainId,
      `/api/public/ans/marketplace/reserved?${chain(chainId)}&limit=200`,
    ).then((value) => value.names),
};
