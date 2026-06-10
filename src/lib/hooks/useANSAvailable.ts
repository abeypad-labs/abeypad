import { Registrar } from '@/config/abis/registrar';
import { validateName } from '@/lib/utils/ans';
import type { Abi } from 'viem';
import { useReadContract } from 'wagmi';

export function useANSAvailable(label: string) {
  const validation = validateName(label);

  const { data, isLoading, error } = useReadContract({
    address: Registrar.address,
    abi: Registrar.abi as Abi,
    functionName: 'available',
    args: [label],
    query: { enabled: validation.valid && label.length > 0 },
  });

  return {
    available: data ?? false,
    isLoading,
    error,
    validation,
  };
}
