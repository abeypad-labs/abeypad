import tokenLockerAbi from "./generated/TokenLocker.json";
import type { Abi } from "viem";

export const TokenLocker = {
  abi: tokenLockerAbi as Abi,
} as const;
