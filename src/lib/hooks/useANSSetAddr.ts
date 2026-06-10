import { Resolver } from '@/config/abis/resolver';
import { namehash } from '@/lib/utils/namehash';
import type { Abi } from 'viem';
import { useWriteContract } from 'wagmi';

export function useANSSetAddr(label: string) {
  const node = namehash(`${label}.abey`);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  function setAddr(newAddress: `0x${string}`) {
    writeContract({
      address: Resolver.address,
      abi: Resolver.abi as Abi,
      functionName: 'setAddr',
      args: [node, newAddress],
    });
  }

  return { setAddr, hash, isPending, error };
}
