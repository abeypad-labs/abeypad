import { Registrar } from '@/config/abis/registrar';
import { Resolver } from '@/config/abis/resolver';
import { getNameStatus } from '@/lib/utils/ans';
import { namehash } from '@/lib/utils/namehash';
import type { Abi } from 'viem';
import { useReadContracts } from 'wagmi';

export function useANSResolve(label: string) {
  const node = namehash(`${label}.abey`);
  const enabled = label.length >= 3;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: Registrar.address, abi: Registrar.abi as Abi, functionName: 'expiryOf', args: [label] },
      { address: Resolver.address, abi: Resolver.abi as Abi, functionName: 'addr', args: [node] },
      { address: Resolver.address, abi: Resolver.abi as Abi, functionName: 'name', args: [node] },
    ],
    query: { enabled },
  });

  const expiry = data?.[0].result as bigint | undefined;
  const address = data?.[1].result as `0x${string}` | undefined;
  const reverse = data?.[2].result as string | undefined;

  return {
    address,
    reverse,
    expiry,
    status: expiry !== undefined ? getNameStatus(expiry) : undefined,
    isLoading,
  };
}
