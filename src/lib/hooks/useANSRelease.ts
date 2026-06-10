import { Registrar } from '@/config/abis/registrar';
import type { Abi } from 'viem';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

export function useANSRelease() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function release(label: string) {
    writeContract({
      address: Registrar.address,
      abi: Registrar.abi as Abi,
      functionName: 'release',
      args: [label],
    });
  }

  return { release, hash, isPending, isConfirming, isSuccess, error };
}
