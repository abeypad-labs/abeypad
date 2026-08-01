import {
  ACTIVE_CHAIN_ID,
  abeyMainnet,
  abeyTestnet,
  isSupportedAbeyChain,
} from "./chains";

const testnetApiUrl = (
  import.meta.env.VITE_ABEY_TESTNET_API_URL || "http://localhost:8788"
).replace(/\/$/, "");

const mainnetApiUrl = (
  import.meta.env.VITE_ABEY_MAINNET_API_URL || "http://localhost:8789"
).replace(/\/$/, "");

export function getBackendApiUrl(chainId: number) {
  const selectedChainId = isSupportedAbeyChain(chainId)
    ? chainId
    : ACTIVE_CHAIN_ID;
  return selectedChainId === abeyMainnet.id ? mainnetApiUrl : testnetApiUrl;
}

export const BACKEND_API_URLS = {
  [abeyTestnet.id]: testnetApiUrl,
  [abeyMainnet.id]: mainnetApiUrl,
} as const;
