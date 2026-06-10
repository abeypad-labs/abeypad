import { Registrar } from '@/config/abis/registrar';
import { yearsToSeconds } from '@/lib/utils/ans';
import type { Abi } from 'viem';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

export function useANSRenew() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function renew(label: string, years: number, fee: bigint) {
    writeContract({
      address: Registrar.address,
      abi: Registrar.abi as Abi,
      functionName: 'renew',
      args: [label, yearsToSeconds(years)],
      value: fee,
    });
  }

  return { renew, hash, isPending, isConfirming, isSuccess, error };
}
