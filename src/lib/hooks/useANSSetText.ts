import { Resolver } from '@/config/abis/resolver';
import { namehash } from '@/lib/utils/namehash';
import type { ProfileKey } from './useANSProfile';
import type { Abi } from 'viem';
import { useWriteContract } from 'wagmi';

export function useANSSetText(label: string) {
  const node = namehash(`${label}.abey`);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  function setText(key: ProfileKey | string, value: string) {
    writeContract({
      address: Resolver.address,
      abi: Resolver.abi as Abi,
      functionName: 'setText',
      args: [node, key, value],
    });
  }

  return { setText, hash, isPending, error };
}
