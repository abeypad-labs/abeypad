/**
 * Admin utility functions for authentication and authorization
 * Admin is determined by the Ownable owner() on the PresaleFactory contract
 */

import { PresaleFactory, CONTRACT_ADDRESSES } from "@/config";
import { useReadContract } from "@/lib/hooks";

import { type Address } from "viem";

const ADMIN_ADDRESSES: Address[] = [
  "0xeCAF669670Eae6c94a711521FaBD743bCdFA3DED" as Address,
  ...((import.meta.env.VITE_ADMIN_ADDRESSES ?? "")
    .split(",")
    .map((addr: string) => addr.trim())
    .filter(Boolean) as Address[]),
];

/**
 * Hook to get the factory owner address
 */
export function useFactoryOwner() {
  const { presaleFactory } = CONTRACT_ADDRESSES;
  const {
    data: factoryOwner,
    isLoading,
    refetch,
  } = useReadContract({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "owner",
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
  const { presaleFactory } = CONTRACT_ADDRESSES;
  const {
    data: feeRecipient,
    isLoading,
    refetch,
  } = useReadContract({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "owner",
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

  const isInStaticList = Boolean(
    address &&
    ADMIN_ADDRESSES.some(
      (adminAddr) => adminAddr.toLowerCase() === address.toLowerCase(),
    ),
  );

  const isOnChainOwner = Boolean(
    address &&
    factoryOwner &&
    address.toLowerCase() === factoryOwner.toLowerCase(),
  );

  return {
    isAdmin: isInStaticList || isOnChainOwner,
    isLoading: isInStaticList ? false : isLoading,
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
