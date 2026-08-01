import launchpadPresaleAbi from "./generated/WhitelistedLaunchpadPresale.json";
import type { Abi } from "viem";

// The whitelisted implementation is an ABI superset of the public presale.
// Reads and common management actions therefore share one frontend contract shape.
export const PresaleContract = {
  abi: launchpadPresaleAbi as Abi,
} as const;

export const LaunchpadPresaleContract = PresaleContract;
