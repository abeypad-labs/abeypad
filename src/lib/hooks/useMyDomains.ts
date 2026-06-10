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

  // Fetch all names this address has ever registered by reading on-chain events.
  // `registrant` is an indexed topic so eth_getLogs filters it server-side.
  const {
    data: labels = [],
    isLoading: isLoadingNames,
    refetch: refetchNames,
  } = useQuery({
    queryKey: ["ans-my-domains", address?.toLowerCase()],
    queryFn: async () => {
      if (!address || !publicClient) return [];
      const logs = await publicClient.getLogs({
        address: Registrar.address,
        event: REGISTERED_EVENT,
        args: { registrant: address },
        fromBlock: 0n,
        toBlock: "latest",
      });
      const seen = new Set<string>();
      return logs
        .map((l) => (l.args as { name?: string }).name?.toLowerCase())
        .filter((n): n is string => !!n && !seen.has(n) && !!seen.add(n));
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

  // kept for backwards compat — on-chain fetch makes it a no-op
  function addDomain(_label: string) {
    refetchNames();
  }

  return { domains, isLoading, addDomain, refetch };
}
