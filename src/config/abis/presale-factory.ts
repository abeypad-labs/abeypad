import presaleFactoryAbi from "./generated/PresaleFactory.json";
import type { Abi } from "viem";

export const PresaleFactory = {
  abi: presaleFactoryAbi as Abi,
} as const;

export const PresaleFactoryContract = PresaleFactory;
