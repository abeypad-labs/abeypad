import { useAccount, useReadContract } from '@/lib/hooks';
import { TokenFactory, CONTRACT_ADDRESSES } from '../../config';

export function useUserTokens() {
  const { address } = useAccount();
  const { tokenFactory } = CONTRACT_ADDRESSES;

  const { data, isLoading, isError, refetch } = useReadContract({
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
    isError,
    refetch,
  };
}
