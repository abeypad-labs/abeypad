import { type Address } from 'viem';

export const ADMIN_ADDRESSES: Address[] = [
  "0xeCAF669670Eae6c94a711521FaBD743bCdFA3DED" as Address,
  ...((import.meta.env.VITE_ADMIN_ADDRESSES ?? "")
    .split(',')
    .map((addr: string) => addr.trim())
    .filter(Boolean) as Address[]),
];
