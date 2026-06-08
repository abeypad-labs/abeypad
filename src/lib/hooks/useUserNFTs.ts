import { useAccount, useReadContract } from '@/lib/papi/hooks';
import { NFTFactoryContract } from '../../config';
import { useChainContracts } from '@/lib/hooks/useChainContracts';

export function useUserNFTs() {
  const { address } = useAccount();
  const { nftFactory } = useChainContracts();

  const { data, isLoading, refetch } = useReadContract({
    abi: NFTFactoryContract.abi,
    address: nftFactory,
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
    nfts: (data as `0x${string}`[] | undefined) ?? [],
    isLoading: !!address && isLoading,
    refetch,
  };
}
