import type { Address, Hex } from "viem";

export type AnsName = {
  chainId: number;
  node: Hex;
  label: string | null;
  fqdn: string | null;
  registrant: Address;
  owner: Address;
  expiry: bigint;
  resolver: Address | null;
  resolvedAddress: Address | null;
  registeredTxHash: Hex | null;
  registeredBlock: bigint | null;
  registeredAt: string | null;
  releasedAt: string | null;
  updatedBlock: bigint;
  custody: "wallet" | "marketplace_listing" | "marketplace_auction";
  seller: Address | null;
};

export type PrimaryAuction = {
  chainId: number;
  auctionId: bigint;
  name: string;
  fqdn: string;
  duration: bigint;
  reservePrice: bigint;
  startTime: bigint;
  endTime: bigint;
  currentExtensionWindow: bigint;
  bidCount: number;
  highestBidder: Address | null;
  highestBid: bigint;
  settled: boolean;
  cancelled: boolean;
  createdTxHash: Hex | null;
  createdBlock: bigint | null;
  updatedBlock: bigint;
};

export type MarketplaceListing = {
  chainId: number;
  listingId: bigint;
  node: Hex;
  name: string;
  fqdn: string;
  seller: Address;
  price: bigint;
  active: boolean;
  buyer: Address | null;
  purchasedPrice: bigint | null;
  createdTxHash: Hex | null;
  createdBlock: bigint | null;
  updatedBlock: bigint;
};

export type MarketplaceAuction = {
  chainId: number;
  auctionId: bigint;
  node: Hex;
  name: string;
  fqdn: string;
  seller: Address;
  reservePrice: bigint;
  startTime: bigint;
  endTime: bigint;
  currentExtensionWindow: bigint;
  bidCount: number;
  highestBidder: Address | null;
  highestBid: bigint;
  settled: boolean;
  cancelled: boolean;
  createdTxHash: Hex | null;
  createdBlock: bigint | null;
  updatedBlock: bigint;
};

export type ReservedName = {
  id: number;
  chainId: number;
  label: string;
  fqdn: string;
  category: string;
  enabled: boolean;
  saleMode: "auction" | "buy_now";
  reservePriceWei: bigint | null;
  fixedPriceWei: bigint | null;
  auctionDurationSeconds: bigint;
  primaryAuctionId: bigint | null;
  activationTxHash: Hex | null;
  activatedAt: string | null;
};

