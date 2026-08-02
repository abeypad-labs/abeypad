import {
  LaunchpadPresaleContract,
  PresaleFactory,
} from "@/config";
import { useWaitForTransactionReceipt, useWriteContract } from "@/lib/hooks";
import { useEffect } from "react";
import type { Address } from "viem";
import { useContractAddresses } from "./useContractAddresses";

type SetFeeRecipientOptions = {
  onConfirmed?: () => void;
};

/**
 * Hook for the immutable factory owner to update the launchpad fee recipient.
 */
export function useSetFeeRecipient(options?: SetFeeRecipientOptions) {
  const { presaleFactory } = useContractAddresses();
  const onConfirmed = options?.onConfirmed;
  const {
    writeContract,
    data: hash,
    isPending,
    isError,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      onConfirmed?.();
      reset();
    }
  }, [isSuccess, onConfirmed, reset]);

  const setFeeRecipient = (newRecipient: Address) => {
    writeContract({
      address: presaleFactory,
      abi: PresaleFactory.abi,
      functionName: "setFeeRecipient",
      args: [newRecipient],
    });
  };

  return {
    setFeeRecipient,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset,
    isBusy: isPending || isConfirming,
  };
}

/**
 * Hook for fee recipient to update fees on a specific presale
 */
export function useUpdatePresaleFees() {
  const {
    writeContract,
    data: hash,
    isPending,
    isError,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const updateFees = (
    presaleAddress: Address,
    newTokenFeeBps: number,
    newProceedsFeeBps: number,
  ) => {
    writeContract({
      address: presaleAddress,
      abi: LaunchpadPresaleContract.abi,
      functionName: "updateFees",
      args: [BigInt(newTokenFeeBps), BigInt(newProceedsFeeBps)],
    });
  };

  return {
    updateFees,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset,
    isBusy: isPending || isConfirming,
  };
}
