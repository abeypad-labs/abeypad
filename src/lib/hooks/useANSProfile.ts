import { Resolver } from '@/config/abis/resolver';
import { namehash } from '@/lib/utils/namehash';
import type { Abi } from 'viem';
import { useReadContracts } from 'wagmi';

export const PROFILE_KEYS = [
  'avatar',
  'url',
  'description',
  'email',
  'com.twitter',
  'com.github',
  'org.telegram',
] as const;

export type ProfileKey = typeof PROFILE_KEYS[number];
export type ANSProfile = Partial<Record<ProfileKey, string>>;

export function useANSProfile(label: string) {
  const node = namehash(`${label}.abey`);
  const enabled = label.length >= 3;

  const { data, isLoading } = useReadContracts({
    contracts: PROFILE_KEYS.map((key) => ({
      address: Resolver.address,
      abi: Resolver.abi as Abi,
      functionName: 'text' as const,
      args: [node, key] as [`0x${string}`, string],
    })),
    query: { enabled },
  });

  const profile: ANSProfile = {};
  PROFILE_KEYS.forEach((key, i) => {
    const val = data?.[i].result as string | undefined;
    if (val) profile[key] = val;
  });

  return { profile, isLoading };
}
