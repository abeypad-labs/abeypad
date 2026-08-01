import { getAddress, isAddress, type Address } from "viem";
import { ansApi } from "./api";

const ansPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.abey$/i;

export function isAnsName(value: string) {
  return ansPattern.test(value.trim());
}

export async function resolveAddressOrAns(value: string, chainId: number): Promise<Address> {
  const input = value.trim();
  if (isAddress(input)) return getAddress(input);
  if (!isAnsName(input)) throw new Error(`Invalid address or .abey name: ${input || "empty value"}`);
  const resolution = await ansApi.resolveName(input.toLowerCase(), chainId);
  return getAddress(resolution.address);
}

export async function resolveAddressesOrAns(values: string[], chainId: number): Promise<Address[]> {
  const cache = new Map<string, Promise<Address>>();
  return Promise.all(values.map((value) => {
    const key = value.trim().toLowerCase();
    const existing = cache.get(key);
    if (existing) return existing;
    const resolution = resolveAddressOrAns(value, chainId);
    cache.set(key, resolution);
    return resolution;
  }));
}
