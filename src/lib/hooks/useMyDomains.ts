import { Registrar } from "@/config/abis/registrar";
import { Resolver } from "@/config/abis/resolver";
import { namehash } from "@/lib/utils/namehash";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Abi, type Address, zeroAddress } from "viem";
import { usePublicClient, useReadContracts } from "wagmi";

const TLD = ".abey";

export interface OwnedDomain {
  label: string;
  fullName: string;
  node: `0x${string}`;
  expiry: Date | null;
  isExpired: boolean;
  resolvedAddr: Address | null;
}

const REGISTERED_EVENT = parseAbiItem(
  "event NameRegistered(string name, bytes32 indexed node, address indexed registrant, uint256 expires)",
);

export function useMyDomains(address?: Address) {
  const publicClient = usePublicClient();

  // Fetch all names this address has ever registered by reading on-chain events
  // combined with locally stored names for instant feedback.
  const {
    data: labels = [],
    isLoading: isLoadingNames,
    refetch: refetchNames,
  } = useQuery({
    queryKey: ["ans-my-domains", address?.toLowerCase()],
    queryFn: async () => {
      if (!address || !publicClient) return [];

      // 1. Get locally stored names for this address
      const localKey = `ans-registered-names-${address.toLowerCase()}`;
      let localNames: string[] = [];
      try {
        const stored = localStorage.getItem(localKey);
        if (stored) {
          localNames = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Error reading local domains:", e);
      }

      // 2. Query on-chain event logs
      let eventNames: string[] = [];
      try {
        const logs = await publicClient.getLogs({
          address: Registrar.address,
          event: REGISTERED_EVENT,
          args: { registrant: address },
          fromBlock: 0n,
          toBlock: "latest",
        });
        eventNames = logs
          .map((l) => (l.args as { name?: string }).name?.toLowerCase())
          .filter((n): n is string => !!n);
      } catch (err) {
        console.warn("Failed to fetch on-chain domain logs, relying on cache/local storage:", err);
      }

      // 3. Merge both sources and deduplicate
      const seen = new Set<string>();
      const combined = [...localNames, ...eventNames]
        .map(n => n.toLowerCase())
        .filter((n) => !!n && !seen.has(n) && !!seen.add(n));

      return combined;
    },
    enabled: !!address && !!publicClient,
    staleTime: 30_000,
  });

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
    return {
      label,
      fullName: `${label}${TLD}`,
      node,
      expiry,
      isExpired,
      resolvedAddr: resolvedAddr === zeroAddress ? null : resolvedAddr,
    };
  });

  const isLoading = isLoadingNames;

  function refetch() {
    refetchNames();
    refetchExpiries();
    refetchAddrs();
  }

  function addDomain(label: string) {
    if (!address) return;
    const normalized = label.trim().toLowerCase().replace(/\.abey$/, "");
    if (!normalized) return;

    const localKey = `ans-registered-names-${address.toLowerCase()}`;
    try {
      let existing: string[] = [];
      const stored = localStorage.getItem(localKey);
      if (stored) {
        existing = JSON.parse(stored);
      }
      if (!existing.includes(normalized)) {
        existing.push(normalized);
        localStorage.setItem(localKey, JSON.stringify(existing));
      }
    } catch (e) {
      console.error("Error saving local domain:", e);
    }
    refetch();
  }

  return { domains, isLoading, addDomain, refetch };
}
