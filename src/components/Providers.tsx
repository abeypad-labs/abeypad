import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  abeyMainnet,
  abeyTestnet,
  SUPPORTED_ABEY_CHAINS,
} from "@/config/chains";
import { useBlockchainStore } from "@/lib/store/blockchain-store";
import { useLaunchpadPresaleStore } from "@/lib/store/launchpad-presale-store";
import { useUserAssetsStore } from "@/lib/store/user-assets-store";
import { WagmiProvider, http, useChainId } from "wagmi";

const config = getDefaultConfig({
  appName: "AbeyPad",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: SUPPORTED_ABEY_CHAINS,
  transports: {
    [abeyTestnet.id]: http(abeyTestnet.rpcUrls.default.http[0]),
    [abeyMainnet.id]: http(abeyMainnet.rpcUrls.default.http[0]),
  },
});

function ChainCacheBoundary({ children }: { children: React.ReactNode }) {
  const chainId = useChainId();
  const previousChainId = useRef(chainId);

  useEffect(() => {
    if (previousChainId.current !== chainId) {
      useBlockchainStore.getState().clearCache();
      useLaunchpadPresaleStore.getState().clearCache();
      useUserAssetsStore.getState().clearAllAssetsCache();
      previousChainId.current = chainId;
    }
  }, [chainId]);

  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <ChainCacheBoundary>{children}</ChainCacheBoundary>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
