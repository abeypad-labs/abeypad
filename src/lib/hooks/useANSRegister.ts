import { Registrar } from '@/config/abis/registrar';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { yearsToSeconds } from '@/lib/utils/ans';
import type { Abi } from 'viem';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

export function useANSRegister() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function register(
    label: string,
    years: number,
    fee: bigint,
    customResolver?: `0x${string}`,
  ) {
    writeContract({
      address: Registrar.address,
      abi: Registrar.abi as Abi,
      functionName: 'register',
      args: [label, yearsToSeconds(years), customResolver ?? CONTRACT_ADDRESSES.resolver],
      value: fee,
    });
  }

  return { register, hash, isPending, isConfirming, isSuccess, error };
}
