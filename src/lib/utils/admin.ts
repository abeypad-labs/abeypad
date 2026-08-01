/**
 * Admin utility functions for authentication and authorization
 * Admin is determined by the Ownable owner() on the PresaleFactory contract
 */

import { PresaleFactory } from "@/config";
import { useContractAddresses, useReadContract } from "@/lib/hooks";

import { type Address } from "viem";

/**
 * Hook to get the factory owner address
 */
export function useFactoryOwner() {
  const { presaleFactory } = useContractAddresses();
  const {
    data: factoryOwner,
    isLoading,
    refetch,
  } = useReadContract({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "factoryOwner",
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  return {
    factoryOwner: factoryOwner as Address | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to get the fee recipient address
 */
export function useFeeRecipient() {
  const { presaleFactory } = useContractAddresses();
  const {
    data: feeRecipient,
    isLoading,
    refetch,
  } = useReadContract({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "feeRecipient",
    query: {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  return {
    feeRecipient: feeRecipient as Address | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to check if the current user is an admin (factory owner)
 */
export function useIsAdmin(address: Address | undefined) {
  const { factoryOwner, isLoading } = useFactoryOwner();

  const isOnChainOwner = Boolean(
    address &&
    factoryOwner &&
    address.toLowerCase() === factoryOwner.toLowerCase(),
  );

  return {
    isAdmin: isOnChainOwner,
    isLoading,
    factoryOwner,
  };
}

/**
 * Hook to check if the current user is the fee recipient
 */
export function useIsFeeRecipient(address: Address | undefined) {
  const { feeRecipient, isLoading } = useFeeRecipient();

  const isFeeRecipient = Boolean(
    address &&
    feeRecipient &&
    address.toLowerCase() === feeRecipient.toLowerCase(),
  );

  return {
    isFeeRecipient,
    isLoading,
    feeRecipient,
  };
}
