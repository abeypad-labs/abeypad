import { useAccount, useReadContract } from '@/lib/papi/hooks';
import { TokenFactory } from '../../config';
import { useChainContracts } from '@/lib/hooks/useChainContracts';

export function useUserTokens() {
  const { address } = useAccount();
  const { tokenFactory } = useChainContracts();

  const { data, isLoading, refetch } = useReadContract({
    abi: TokenFactory.abi,
    address: tokenFactory,
    functionName: 'tokensCreatedBy',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address,
      staleTime: 0,
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  });

  return {
    tokens: (data as `0x${string}`[] | undefined) ?? [],
    isLoading: !!address && isLoading,
    refetch,
  };
}
