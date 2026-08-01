import airdropAbi from "./generated/AirdropMultisender.json";
import type { Abi } from "viem";

export const AirdropMultiSender = {
  abi: airdropAbi as Abi,
} as const;
