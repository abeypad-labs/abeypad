import { useBalance as useWagmiBalance, useReadContracts } from "wagmi";
import { erc20Abi, formatUnits, type Address } from "viem";
import { useMemo } from "react";

export function useBalance({
  address,
  token,
}: { address?: Address; token?: Address; query?: Record<string, unknown> } = {}) {
  const isErc20 = !!token;

  // Query native balance
  const { data: nativeData, isLoading: isNativeLoading, error: nativeError, refetch: refetchNative } = useWagmiBalance({
    address,
    query: {
      enabled: !isErc20 && !!address,
    },
  });

  // Query ERC20 balance
  const { data: erc20Data, isLoading: isErc20Loading, error: erc20Error, refetch: refetchErc20 } = useReadContracts({
    contracts: isErc20 && address ? [
      {
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: token,
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address: token,
        abi: erc20Abi,
        functionName: "symbol",
      },
    ] as const : [],
    query: {
      enabled: isErc20 && !!address,
    },
  });

  const data = useMemo(() => {
    if (isErc20) {
      if (!erc20Data || erc20Data.length < 3) return undefined;
      const r0 = erc20Data[0] as any;
      const r1 = erc20Data[1] as any;
      const r2 = erc20Data[2] as any;
      if (!r0 || !r1 || !r2) return undefined;
      if (r0.status === "failure" || r1.status === "failure" || r2.status === "failure") return undefined;
      const balance = r0.result as bigint;
      const decimals = r1.result as number;
      const symbol = r2.result as string;
      if (balance === undefined || decimals === undefined || symbol === undefined) return undefined;
      return {
        value: balance,
        decimals,
        symbol,
        formatted: formatUnits(balance, decimals),
      };
    } else {
      if (!nativeData) return undefined;
      const val = nativeData.value;
      const dec = nativeData.decimals;
      const sym = nativeData.symbol;
      const formatted = (nativeData as any).formatted ?? formatUnits(val, dec);
      return {
        value: val,
        decimals: dec,
        symbol: sym,
        formatted,
      };
    }
  }, [isErc20, erc20Data, nativeData]);

  return {
    data,
    isLoading: isErc20 ? isErc20Loading : isNativeLoading,
    error: isErc20 ? erc20Error : nativeError,
    refetch: isErc20 ? refetchErc20 : refetchNative,
  };
}
