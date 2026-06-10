import { Registrar } from '@/config/abis/registrar';
import type { Abi } from 'viem';
import { useWatchContractEvent } from 'wagmi';

export function useWatchRegistrations(
  onRegistration: (name: string, registrant: `0x${string}`, expires: bigint) => void,
) {
  useWatchContractEvent({
    address: Registrar.address,
    abi: Registrar.abi as Abi,
    eventName: 'NameRegistered',
    onLogs(logs) {
      logs.forEach((log) => {
        const args = (log as unknown as { args?: { name?: string; registrant?: `0x${string}`; expires?: bigint } }).args;
        const { name, registrant, expires } = args ?? {};
        if (name && registrant && expires) onRegistration(name, registrant, expires);
      });
    },
  });
}
