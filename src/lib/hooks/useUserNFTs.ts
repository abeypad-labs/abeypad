import { useAccount } from '@/lib/hooks';
import { useUserAssetsStore } from '../store/user-assets-store';

export function useUserNFTs() {
  const { address } = useAccount();
  const { getUserNFTCollections } = useUserAssetsStore();

  // Get NFT collections from local store first
  const localCollections = address ? getUserNFTCollections(address as `0x${string}`) : null;
  
  // Convert to array of addresses
  const collectionAddresses = localCollections ? localCollections.map(c => c.address) : [];

  return {
    nfts: collectionAddresses,
    isLoading: false, // Local store is instant
    isError: false,
    refetch: () => {}, // No refetch needed for local store
  };
}
