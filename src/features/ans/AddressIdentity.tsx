import { ACTIVE_CHAIN_ID, isSupportedAbeyChain } from "@/config";
import { useQuery } from "@tanstack/react-query";
import { getAddress, type Address } from "viem";
import { useChainId } from "wagmi";
import { ansApi } from "./api";

export function AddressIdentity({
  address,
  full = false,
  className,
}: {
  address: Address;
  full?: boolean;
  className?: string;
}) {
  const connectedChainId = useChainId();
  const chainId = isSupportedAbeyChain(connectedChainId) ? connectedChainId : ACTIVE_CHAIN_ID;
  const normalized = getAddress(address);
  const reverse = useQuery({
    queryKey: ["ans", chainId, "reverse", normalized],
    queryFn: () => ansApi.resolveAddress(normalized, chainId),
    staleTime: 30_000,
    retry: 1,
  });
  const fallback = full ? normalized : `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
  return <span className={className} title={normalized}>{reverse.data?.primaryName ?? fallback}</span>;
}
