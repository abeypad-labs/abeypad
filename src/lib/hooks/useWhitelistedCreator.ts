import { useReadContract } from "@/lib/hooks";
import { PresaleFactory, CONTRACT_ADDRESSES } from "@/config";
import type { Address } from "viem";

/**
 * Hook to check if a creator address is whitelisted in the PresaleFactory
 */
export function useWhitelistedCreator(creatorAddress: Address | undefined) {
  const { presaleFactory } = CONTRACT_ADDRESSES;
  const { data: isWhitelisted, isLoading } = useReadContract({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "whitelistedCreators",
    args: creatorAddress ? [creatorAddress] : undefined,
    query: {
      enabled: Boolean(creatorAddress),
    },
  });

  return {
    isWhitelisted: isWhitelisted as boolean | undefined,
    isLoading,
  };
}
