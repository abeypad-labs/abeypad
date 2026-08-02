import auctionAbi from "./generated/ANSAuctionHouse.json";
import marketplaceAbi from "./generated/ANSMarketplaceEscrow.json";
import registrarAbi from "./generated/ANSRegistrarV2.json";
import registryAbi from "./generated/ANSRegistryV2.json";
import resolverAbi from "./generated/ANSResolverV2.json";
import type { Abi } from "viem";

export const ANSRegistry = {
  abi: registryAbi as Abi,
} as const;

export const ANSResolver = {
  abi: resolverAbi as Abi,
} as const;

export const ANSRegistrar = {
  abi: registrarAbi as Abi,
} as const;

export const ANSAuctionHouse = {
  abi: auctionAbi as Abi,
} as const;

export const ANSMarketplace = {
  abi: marketplaceAbi as Abi,
} as const;
