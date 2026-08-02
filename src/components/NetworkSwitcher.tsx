import {
  abeyMainnet,
  abeyTestnet,
  getAbeyChain,
  isSupportedAbeyChain,
} from "@/config";
import { cn } from "@/lib/utils/utils";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

const networks = [abeyTestnet, abeyMainnet] as const;
const ABEY_LOGO_URL =
  "https://assets.coingecko.com/coins/images/22146/standard/Abey_Logo-2000x2000.png?1705684832";

function networkTone(chainId: number | undefined) {
  if (chainId === abeyMainnet.id) return "bg-[#B8EF53]";
  if (chainId === abeyTestnet.id) return "bg-[#42C9FF]";
  return "bg-[#FF7F41]";
}

export function ActiveNetworkBadge() {
  const chainId = useChainId();
  const activeChain = isSupportedAbeyChain(chainId)
    ? getAbeyChain(chainId)
    : null;
  const shortName = activeChain?.id === abeyMainnet.id ? "Mainnet" : "Testnet";

  return (
    <div
      aria-label={`Current network: ${activeChain?.name ?? "Unsupported network"}`}
      className={cn(
        "inline-flex items-center gap-1.5 border-[2px] border-black px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.11em]",
        networkTone(activeChain?.id),
      )}
    >
      <img
        src={ABEY_LOGO_URL}
        alt=""
        aria-hidden="true"
        className="h-3.5 w-3.5 rounded-full object-cover"
      />
      {activeChain ? shortName : "Wrong chain"}
    </div>
  );
}

export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [requestedChainId, setRequestedChainId] = useState<number | null>(null);

  return (
    <div
      className="grid w-full grid-cols-2 gap-2 border-[2px] border-black bg-white p-2 text-black [box-shadow:3px_3px_0_0_#000]"
      aria-label="ABEY network selector"
    >
      {networks.map((network) => {
        const selected = chainId === network.id;
        const pending = isPending && requestedChainId === network.id;
        return (
          <button
            key={network.id}
            type="button"
            onClick={async () => {
              if (selected) return;
              setRequestedChainId(network.id);
              try {
                await switchChainAsync({ chainId: network.id });
              } catch (error) {
                toast.error(`Could not switch to ${network.name}`, {
                  description:
                    error instanceof Error
                      ? error.message
                      : "The connected wallet rejected the network switch.",
                });
              } finally {
                setRequestedChainId(null);
              }
            }}
            disabled={selected || isPending || !isConnected}
            title={
              isConnected
                ? selected
                  ? `${network.name} is active`
                  : `Switch wallet to ${network.name}`
                : "Connect a wallet to switch networks"
            }
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center justify-center gap-2 border-[2px] border-black px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all",
              selected
                ? networkTone(network.id)
                : "bg-[#FFF2D5] hover:bg-[#F5CF85]",
              isPending && !pending && "opacity-50",
              !isConnected && !selected && "cursor-not-allowed opacity-60",
            )}
          >
            {pending ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : selected ? (
              <img
                src={ABEY_LOGO_URL}
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 rounded-full object-cover"
              />
            ) : null}
            {network.id === abeyTestnet.id ? "Testnet" : "Mainnet"}
          </button>
        );
      })}
    </div>
  );
}
