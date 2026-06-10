import { decodeErrorResult, formatEther, keccak256, toHex } from 'viem';
import { Registrar } from '@/config/abis/registrar';
import type { Abi } from 'viem';

export const ONE_YEAR_SECONDS = 31_536_000n;
export const GRACE_PERIOD_SECS = 7_776_000n;

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateName(name: string): ValidationResult {
  if (name.length < 3) return { valid: false, reason: 'Name must be at least 3 characters' };
  if (name.length > 32) return { valid: false, reason: 'Name must be 32 characters or fewer' };
  if (!/^[a-z0-9-]+$/.test(name))
    return { valid: false, reason: 'Only lowercase letters, digits, and hyphens allowed' };
  if (name.startsWith('-') || name.endsWith('-'))
    return { valid: false, reason: 'Name cannot start or end with a hyphen' };
  return { valid: true };
}

export function labelHash(label: string): `0x${string}` {
  return keccak256(toHex(label));
}

export function yearsToSeconds(years: number): bigint {
  return ONE_YEAR_SECONDS * BigInt(years);
}

export type NameStatus = 'available' | 'active' | 'grace' | 'expired';

export function getNameStatus(expiryTimestamp: bigint): NameStatus {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (expiryTimestamp === 0n) return 'available';
  if (now <= expiryTimestamp) return 'active';
  if (now <= expiryTimestamp + GRACE_PERIOD_SECS) return 'grace';
  return 'expired';
}

export function formatFee(wei: bigint): string {
  return `${formatEther(wei)} ABEY`;
}

export function formatExpiry(timestamp: bigint): string {
  if (timestamp === 0n) return '—';
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
}

export function toFullName(label: string): string {
  return `${label}.abey`;
}

const ANS_ERROR_MESSAGES: Record<string, string> = {
  NameTooShort: 'Name must be at least 3 characters.',
  NameTooLong: 'Name must be 32 characters or fewer.',
  InvalidCharacter: 'Only lowercase letters, digits, and hyphens are allowed.',
  HyphenAtBoundary: 'Name cannot start or end with a hyphen.',
  NameNotAvailable: 'This name is already taken.',
  DurationTooShort: 'Minimum registration period is 1 year.',
  InsufficientFee: 'Payment is too low. Refresh the fee and try again.',
  NameNotRegistered: 'This name has not been registered.',
  NameNotExpired: 'This name has not expired yet.',
  StillInGracePeriod: 'Name is still in grace period. Wait 90 days after expiry.',
  GracePeriodActive: 'Only the name owner can renew during the grace period.',
  RefundFailed: 'Overpayment refund failed. Please use the exact fee.',
  NotOwner: 'You are not the owner of this name.',
  ZeroAddress: 'A zero address was provided.',
};

export function parseANSError(error: unknown): string {
  if (!error) return '';
  const message = (error as Error).message ?? String(error);

  const match = message.match(/0x[0-9a-fA-F]{8,}/);
  if (match) {
    try {
      const decoded = decodeErrorResult({
        abi: Registrar.abi as Abi,
        data: match[0] as `0x${string}`,
      });
      return ANS_ERROR_MESSAGES[decoded.errorName] ?? decoded.errorName;
    } catch {
      // not a registrar error
    }
  }

  if (message.toLowerCase().includes('user rejected') || message.toLowerCase().includes('cancelled'))
    return 'Transaction cancelled.';
  if (message.toLowerCase().includes('insufficient funds'))
    return 'Insufficient ABEY balance.';
  return 'Transaction failed. Please try again.';
}
