import tokenFactoryAbi from "./generated/TokenFactory.json";
import type { Abi } from "viem";

export const TokenFactory = {
  abi: tokenFactoryAbi as Abi,
} as const;
