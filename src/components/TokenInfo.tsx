"use client"
import { useAccount, useChainId, useReadContract } from "@/lib/hooks";
import { ExternalLink, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { formatUnits } from "viem";
import { useConfig } from "wagmi";
import { erc20Abi } from "viem";

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
    functionName: 'name',
  });

  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'symbol',
  });

  const { data: decimals, isLoading: isLoadingDecimals } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'decimals',
  });

  const { data: totalSupply, isLoading: isLoadingSupply } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'totalSupply',
  });

  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const isLoading = isLoadingName || isLoadingSymbol || isLoadingDecimals || isLoadingSupply || isLoadingBalance;

  if (isLoading) {
    return (
      <div className="border-2 border-black bg-[#FFFDF7] p-4 shadow-[2px_2px_0_rgba(0,0,0,1)]">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const formattedSupply = totalSupply && decimals !== undefined
    ? formatUnits(totalSupply, decimals)
    : '0';

  const formattedBalance = balance && decimals !== undefined
    ? formatUnits(balance, decimals)
    : '0';

  return (
    <div className="border-2 border-black bg-[#FFFDF7] p-4 shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_rgba(0,0,0,1)] transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-gray-600" />
            <h3 className="font-black text-lg uppercase truncate">
              {name || 'Unknown Token'}
            </h3>
            <span className="px-2 py-0.5 text-xs font-bold uppercase bg-gray-200 text-gray-700">
              {symbol || 'N/A'}
            </span>
          </div>
          
          <div className="space-y-1 text-sm">
            <p className="text-xs text-gray-500 break-all font-mono">{tokenAddress}</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="font-bold">
                Supply: <span className="text-gray-600">{parseFloat(formattedSupply).toLocaleString()}</span>
              </span>
              <span className="font-bold">
                Your Balance: <span className="text-gray-600">{parseFloat(formattedBalance).toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_rgba(0,0,0,1)] transition-shadow flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Explorer
              </button>
            </a>
          )}
          
          <Link to={`/dashboard/tools/token-locker?token=${tokenAddress}`}>
            <button className="border-2 border-black bg-[#FFE38A] px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_rgba(0,0,0,1)] transition-shadow">
              Lock Tokens
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
