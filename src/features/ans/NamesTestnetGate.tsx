import { Button } from "@/components/ui/button";
import { abeyMainnet, abeyTestnet } from "@/config";
import { useConnectModal } from "@/lib/hooks";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

export function NamesTestnetGate({ children }: { children: ReactNode }) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync, isPending } = useSwitchChain();
  const isMainnet = chainId === abeyMainnet.id;

  const continueOnTestnet = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    try {
      await switchChainAsync({ chainId: abeyTestnet.id });
    } catch (error) {
      toast.error("Could not switch to Abey Testnet", {
        description:
          error instanceof Error
            ? error.message
            : "The connected wallet rejected the network switch.",
      });
    }
  };

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden={isMainnet || undefined}
        inert={isMainnet}
        className={
          isMainnet
            ? "pointer-events-none select-none blur-[3px]"
            : undefined
        }
      >
        {children}
      </div>

      {isMainnet && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#F7F1E1]/55 p-5 backdrop-blur-[2px]">
          <div className="relative w-full max-w-md overflow-hidden border-[3px] border-black bg-[#FFF2D5] p-6 text-center [box-shadow:9px_9px_0_#000] sm:p-8">
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 h-4 w-16 border-b-[3px] border-l-[3px] border-black bg-[#F95D9B]"
            />
            <h2 className="text-2xl font-black uppercase tracking-[-0.03em] sm:text-3xl">
              Names are on testnet
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm font-bold text-black/60 sm:text-base">
              Switch to Abey Testnet to register, manage, and trade .abey names.
            </p>
            <Button
              type="button"
              className="mt-6 w-full"
              loading={isPending}
              loadingText="Switching"
              onClick={continueOnTestnet}
            >
              {isConnected ? "Switch to testnet" : "Connect wallet"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
