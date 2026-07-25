import { useAccount } from "@/lib/hooks";
import { useUserAssetsStore } from "../store/user-assets-store";

export function useUserTokens() {
  const { address } = useAccount();
  const { getUserTokens } = useUserAssetsStore();

  // Get tokens from local store first
  const localTokens = address ? getUserTokens(address as `0x${string}`) : null;

  // Convert to array of addresses
  const tokenAddresses = localTokens ? localTokens.map((t) => t.address) : [];

  return {
    tokens: tokenAddresses,
    isLoading: false, // Local store is instant
    isError: false,
    refetch: () => {}, // No refetch needed for local store
  };
}
