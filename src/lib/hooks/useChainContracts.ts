import { ABEY_EXPLORER_URL, CONTRACT_ADDRESSES } from "@/config";
import { useChainId } from "@/lib/hooks";

export function useChainContracts() {
  const chainId = useChainId();
  const contractAddresses = CONTRACT_ADDRESSES;

  return {
    chainId,
    explorerUrl: ABEY_EXPLORER_URL,
    ...contractAddresses,
  };
}
