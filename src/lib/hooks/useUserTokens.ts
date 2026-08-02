import { TokenFactory } from "@/config";
import { useAccount, useReadContract } from "@/lib/hooks";
import { useContractAddresses } from "./useContractAddresses";

export function useUserTokens() {
  const { address } = useAccount();
  const { tokenFactory } = useContractAddresses();
  const { data, isLoading, isError, refetch } = useReadContract({
    abi: TokenFactory.abi,
    address: tokenFactory,
    functionName: "tokensCreatedBy",
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(address),
      staleTime: 0,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  });

  return {
    tokens: (data as `0x${string}`[] | undefined) ?? [],
    isLoading: Boolean(address) && isLoading,
    isError,
    refetch,
  };
}
