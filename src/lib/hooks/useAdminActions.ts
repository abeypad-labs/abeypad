import { PresaleFactory, LaunchpadPresaleContract, CONTRACT_ADDRESSES } from '@/config';
import { useWriteContract, useWaitForTransactionReceipt } from '@/lib/hooks';
import { useEffect } from 'react';
import type { Address } from 'viem';

/**
 * Hook for factory owner to manage whitelisted creators
 */
export function useSetWhitelistedCreator() {
  const { presaleFactory } = CONTRACT_ADDRESSES;
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

  const setWhitelistedCreator = (creatorAddress: Address, whitelisted: boolean) => {
    writeContract({
      address: presaleFactory,
      abi: PresaleFactory.abi,
      functionName: 'setWhitelistedCreator',
      args: [creatorAddress, whitelisted],
    });
  };

  return {
    setWhitelistedCreator,
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

type SetFeeRecipientOptions = {
  onConfirmed?: () => void;
};

/**
 * Hook for factory owner to transfer the fee recipient/owner role.
 */
export function useSetFeeRecipient(options?: SetFeeRecipientOptions) {
  const { presaleFactory } = CONTRACT_ADDRESSES;
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
      functionName: 'transferOwnership',
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
    newProceedsFeeBps: number
  ) => {
    writeContract({
      address: presaleAddress,
      abi: LaunchpadPresaleContract.abi,
      functionName: 'updateFees',
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
