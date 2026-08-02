"use client";
import { Button } from "@/components/ui/button";
import { useAccount, useChainId, useReadContract } from "@/lib/hooks";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { erc20Abi, formatUnits } from "viem";
import { useConfig } from "wagmi";

interface TokenInfoProps {
  tokenAddress: `0x${string}`;
}

export function TokenInfo({ tokenAddress }: TokenInfoProps) {
  const { address } = useAccount();
  const config = useConfig();
  const chainId = useChainId();
  const chain = config.chains.find((c) => c.id === chainId);
  const explorerUrl = chain?.blockExplorers?.default.url;

  // Read token data from contract
  const { data: name, isLoading: isLoadingName } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "name",
  });

  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "symbol",
  });

  const { data: decimals, isLoading: isLoadingDecimals } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "decimals",
  });

  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const isLoading =
    isLoadingName ||
    isLoadingSymbol ||
    isLoadingDecimals ||
    isLoadingBalance;

  if (isLoading) {
    return (
      <div className="w-full border-2 border-black bg-[#FFF8E8] p-4 shadow-[3px_3px_0_#000] sm:p-5">
        <div className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-black/10" />
            <div className="h-3 w-full max-w-sm bg-black/10" />
          </div>
          <div className="border-y border-black/10 py-3 lg:border-x lg:border-y-0 lg:px-6 lg:py-0">
            <div className="h-10 bg-black/10" />
          </div>
          <div className="h-9 bg-black/10" />
        </div>
      </div>
    );
  }

  const formattedBalance =
    balance && decimals !== undefined ? formatUnits(balance, decimals) : "0";

  return (
    <article className="relative w-full overflow-hidden border-2 border-black bg-[#FFF8E8] shadow-[3px_3px_0_#000]">
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 h-14 w-14 -translate-y-8 translate-x-8 rotate-12 border-2 border-black bg-[#42C9FF]"
      />
      <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="truncate text-xl font-black tracking-tight sm:text-2xl">
              {name || "Unknown Token"}
            </h3>
            <span className="bg-[#FFE38A] px-2 py-1 text-[9px] font-black uppercase tracking-wider">
              {symbol || "N/A"}
            </span>
          </div>
          <p className="mt-1 break-all font-mono text-[11px] font-bold text-black/45 sm:text-xs">
            {tokenAddress}
          </p>
        </div>

        <dl className="border-y border-black/15 py-3 lg:min-w-[180px] lg:border-x lg:border-y-0 lg:px-6 lg:py-0">
          <div>
            <dt className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
              Your balance
            </dt>
            <dd className="mt-1 truncate text-base font-black sm:text-lg">
              {parseFloat(formattedBalance).toLocaleString()}
            </dd>
          </div>
        </dl>

        <div className="flex shrink-0 items-center gap-1">
          {explorerUrl && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="rounded-none border-0 bg-transparent px-2 shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
            >
              <a
                href={`${explorerUrl}/address/${tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="rounded-none border-0 bg-[#FFE38A] px-3 shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-[#F6CF62]"
          >
            <Link to={`/dashboard/tools/token-locker?token=${tokenAddress}`}>
              Lock Tokens
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
