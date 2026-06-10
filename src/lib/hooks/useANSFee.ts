import { Registrar } from '@/config/abis/registrar';
import { yearsToSeconds } from '@/lib/utils/ans';
import type { Abi } from 'viem';
import { useReadContract } from 'wagmi';

export function useANSFee(label: string, years = 1) {
  const duration = yearsToSeconds(years);

  const { data, isLoading } = useReadContract({
    address: Registrar.address,
    abi: Registrar.abi as Abi,
    functionName: 'feeFor',
    args: [label, duration],
    query: { enabled: label.length >= 3 },
  });

  return { fee: (data as bigint | undefined) ?? 0n, isLoading };
}
