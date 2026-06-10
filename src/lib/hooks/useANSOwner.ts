import { Registry } from '@/config/abis/registry';
import { namehash } from '@/lib/utils/namehash';
import type { Abi } from 'viem';
import { useReadContracts } from 'wagmi';

export function useANSOwner(label: string) {
  const node = namehash(`${label}.abey`);
  const enabled = label.length >= 3;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: Registry.address, abi: Registry.abi as Abi, functionName: 'owner', args: [node] },
      { address: Registry.address, abi: Registry.abi as Abi, functionName: 'resolver', args: [node] },
      { address: Registry.address, abi: Registry.abi as Abi, functionName: 'ttl', args: [node] },
    ],
    query: { enabled },
  });

  return {
    owner: data?.[0].result as `0x${string}` | undefined,
    resolver: data?.[1].result as `0x${string}` | undefined,
    ttl: data?.[2].result as bigint | undefined,
    isLoading,
  };
}
