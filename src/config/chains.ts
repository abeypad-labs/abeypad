import { defineChain } from "viem";

export type AbeyNetwork = "testnet" | "mainnet";

function configuredNetwork(value: unknown): AbeyNetwork {
  return value === "mainnet" ? "mainnet" : "testnet";
}

export const ACTIVE_NETWORK = configuredNetwork(import.meta.env.VITE_NETWORK);

export const abeyTestnet = defineChain({
  id: 178,
  name: "Abey Testnet",
  nativeCurrency: { name: "ABEY", symbol: "ABEY", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_ABEY_TESTNET_RPC_URL ||
          "https://testrpc.abeychain.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Abeyscan Testnet",
      url: "https://testnet.abeyscan.com",
    },
  },
  testnet: true,
});

export const abeyMainnet = defineChain({
  id: 179,
  name: "Abey Mainnet",
  nativeCurrency: { name: "ABEY", symbol: "ABEY", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_ABEY_MAINNET_RPC_URL ||
          "https://rpc.abeychain.com",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Abeyscan", url: "https://abeyscan.com" },
  },
});

export const ABEY_CHAINS = {
  testnet: abeyTestnet,
  mainnet: abeyMainnet,
} as const;

export const ACTIVE_CHAIN = ABEY_CHAINS[ACTIVE_NETWORK];
export const ACTIVE_CHAIN_ID = ACTIVE_CHAIN.id;

export const SUPPORTED_ABEY_CHAINS =
  ACTIVE_NETWORK === "mainnet"
    ? ([abeyMainnet, abeyTestnet] as const)
    : ([abeyTestnet, abeyMainnet] as const);

export function isSupportedAbeyChain(
  chainId: number,
): chainId is typeof abeyTestnet.id | typeof abeyMainnet.id {
  return chainId === abeyTestnet.id || chainId === abeyMainnet.id;
}

export function getAbeyChain(chainId: number) {
  if (chainId === abeyTestnet.id) return abeyTestnet;
  if (chainId === abeyMainnet.id) return abeyMainnet;
  throw new Error(`Unsupported Abey chain ${chainId}`);
}

export function getExplorerUrl(chainId = ACTIVE_CHAIN_ID) {
  return getAbeyChain(chainId).blockExplorers.default.url;
}
