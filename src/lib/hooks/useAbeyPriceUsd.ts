import {
  ACTIVE_CHAIN_ID,
  getBackendApiUrl,
  isSupportedAbeyChain,
} from "@/config";
import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";

const DEFAULT_REFRESH_INTERVAL_MS = 15_000;

interface UseAbeyPriceUsdOptions {
  refreshIntervalMs?: number;
}

type PriceResponse = { priceUsd?: number };

export function useAbeyPriceUsd(
  options: UseAbeyPriceUsdOptions = {},
): number | null {
  const { refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS } = options;
  const connectedChainId = useChainId();
  const chainId = isSupportedAbeyChain(connectedChainId)
    ? connectedChainId
    : ACTIVE_CHAIN_ID;
  const price = useQuery({
    queryKey: ["abey-price-usd", chainId],
    queryFn: async () => {
      const response = await fetch(
        `${getBackendApiUrl(chainId)}/api/public/price/abey?chainId=${chainId}`,
      );
      if (!response.ok) throw new Error("ABEY price is unavailable");
      const data = (await response.json()) as PriceResponse;
      if (typeof data.priceUsd !== "number" || !Number.isFinite(data.priceUsd)) {
        throw new Error("ABEY price response is invalid");
      }
      return data.priceUsd;
    },
    staleTime: refreshIntervalMs,
    refetchInterval: refreshIntervalMs,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return price.data ?? null;
}
