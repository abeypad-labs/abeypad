import { Registrar } from "@/config/abis/registrar";
import { Resolver } from "@/config/abis/resolver";
import { namehash } from "@/lib/utils/namehash";
import { useEffect, useState } from "react";
import { type Abi, type Address, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";

const TLD = ".abey";

function storageKey(address: Address) {
  return `abeypad_domains_${address.toLowerCase()}`;
}

function loadNames(address: Address): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(address)) ?? "[]");
  } catch {
    return [];
  }
}

function saveNames(address: Address, names: string[]) {
  localStorage.setItem(storageKey(address), JSON.stringify(names));
}

export interface OwnedDomain {
  label: string;
  fullName: string;
  node: `0x${string}`;
  expiry: Date | null;
  isExpired: boolean;
  resolvedAddr: Address | null;
}

export function useMyDomains(address?: Address) {
  const [labels, setLabels] = useState<string[]>(() =>
    address ? loadNames(address) : []
  );

  useEffect(() => {
    setLabels(address ? loadNames(address) : []);
  }, [address]);

  const nodes = labels.map((l) => namehash(`${l}${TLD}`));

  const { data: expiryResults, refetch: refetchExpiries } = useReadContracts({
    contracts: labels.map((label) => ({
      address: Registrar.address,
      abi: Registrar.abi as Abi,
      functionName: "expiryOf",
      args: [label],
    })),
    query: { enabled: labels.length > 0 },
  });

  const { data: addrResults, refetch: refetchAddrs } = useReadContracts({
    contracts: nodes.map((node) => ({
      address: Resolver.address,
      abi: Resolver.abi as Abi,
      functionName: "addr",
      args: [node],
    })),
    query: { enabled: nodes.length > 0 },
  });

  const domains: OwnedDomain[] = labels.map((label, i) => {
    const node = nodes[i];
    const expiryRaw = expiryResults?.[i]?.result as bigint | undefined;
    const expiry = expiryRaw ? new Date(Number(expiryRaw) * 1000) : null;
    const isExpired = expiry ? expiry < new Date() : false;
    const resolvedAddr = (addrResults?.[i]?.result as Address | undefined) ?? null;
    const resolvedOrZero = resolvedAddr === zeroAddress ? null : resolvedAddr;
    return {
      label,
      fullName: `${label}${TLD}`,
      node,
      expiry,
      isExpired,
      resolvedAddr: resolvedOrZero,
    };
  });

  function addDomain(label: string) {
    if (!address) return;
    const updated = [...new Set([...labels, label])];
    setLabels(updated);
    saveNames(address, updated);
  }

  function refetch() {
    refetchExpiries();
    refetchAddrs();
  }

  return { domains, addDomain, refetch };
}
