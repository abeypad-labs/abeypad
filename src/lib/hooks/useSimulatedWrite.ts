import { useCallback, useEffect } from 'react';
import { type Abi, type Address } from 'viem';
import { useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

interface UseSimulatedWriteParams<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string
> {
  address?: Address;
  abi?: TAbi;
  functionName?: TFunctionName;
  args?: unknown[];
  value?: bigint;
  enabled?: boolean;
  onSuccess?: (hash: `0x${string}`) => void;
  onConfirmed?: (receipt: any) => void;
}

export function useSimulatedWrite<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string
>({
  address,
  abi,
  functionName,
  args,
  value,
  enabled = true,
  onSuccess,
  onConfirmed,
}: UseSimulatedWriteParams<TAbi, TFunctionName>) {
  // 1. Simulate the contract write
  const {
    data: simulateData,
    error: simulateError,
    isLoading: isSimulating,
    refetch: reSimulate,
  } = useSimulateContract({
    address,
    abi: abi as Abi,
    functionName,
    args,
    value,
    query: {
      enabled: enabled && Boolean(address && abi && functionName),
    },
  });

  // 2. Prepare the write contract hook
  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWritePending,
    reset,
  } = useWriteContract();

  // 3. Monitor the transaction receipt
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Execute function that triggers the simulated write request
  const write = useCallback(() => {
    if (!simulateData?.request) {
      throw new Error('Transaction simulation has not completed or failed.');
    }
    writeContract(simulateData.request);
  }, [simulateData, writeContract]);

  // Handle transaction success callback
  useEffect(() => {
    if (hash && onSuccess) {
      onSuccess(hash);
    }
  }, [hash, onSuccess]);

  // Handle transaction confirmation callback
  useEffect(() => {
    if (receipt && isConfirmed && onConfirmed) {
      onConfirmed(receipt);
    }
  }, [receipt, isConfirmed, onConfirmed]);

  return {
    write,
    canWrite: Boolean(simulateData?.request),
    hash,
    receipt,
    isSimulating,
    isWritePending,
    isConfirming,
    isConfirmed,
    simulateError,
    writeError,
    confirmError,
    combinedError: simulateError || writeError || confirmError,
    reSimulate,
    reset,
  };
}
