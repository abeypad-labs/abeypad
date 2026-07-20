import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { megaethTestnet } from "viem/chains";
import { WagmiProvider, http } from "wagmi";

// const abeychainDevnet = defineChain({
//   id: 178,
//   name: 'Abeychain Testnet',
//   nativeCurrency: {
//     decimals: 18,
//     name: 'ABEY',
//     symbol: 'ABEY',
//   },
//   rpcUrls: {
//     default: {
//       http: ['https://testrpc.abeychain.com'],
//     },
//   },
//   blockExplorers: {
//     default: { name: 'Abeyscan Testnet', url: 'https://testnet.abeyscan.com' },
//   },
// });

const config = getDefaultConfig({
  appName: 'AbeyPad',
  projectId: '9ef8a1835f8d9515949514f77259f972',
  chains: [megaethTestnet],
  transports: {
    [megaethTestnet.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
