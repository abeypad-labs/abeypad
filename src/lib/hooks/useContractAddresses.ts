import {
  ACTIVE_CHAIN_ID,
  getContractAddresses,
  isSupportedAbeyChain,
} from "@/config";
import { useChainId } from "wagmi";

/** Returns the deployment map for the wallet's current ABEY network. */
export function useContractAddresses() {
  const chainId = useChainId();
  return getContractAddresses(
    isSupportedAbeyChain(chainId) ? chainId : ACTIVE_CHAIN_ID,
  );
}
