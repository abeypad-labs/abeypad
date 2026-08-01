import {
  ACTIVE_CHAIN_ID,
  getBackendApiUrl,
  isSupportedAbeyChain,
} from "@/config";
import { useEffect, useState } from "react";
import { useChainId } from "wagmi";

const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

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
  const [price, setPrice] = useState<{
    chainId: number;
    valueUsd: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAbeyPrice = async () => {
      try {
        const response = await fetch(
          `${getBackendApiUrl(chainId)}/api/public/price/abey?chainId=${chainId}`,
        );
        if (!response.ok) return;

        const data = (await response.json()) as PriceResponse;
        const nextPrice = data.priceUsd;

        if (
          !cancelled &&
          typeof nextPrice === "number" &&
          Number.isFinite(nextPrice)
        ) {
          setPrice({ chainId, valueUsd: nextPrice });
        }
      } catch (error) {
        console.error("Failed to fetch ABEY price:", error);
      }
    };

    void fetchAbeyPrice();
    const intervalId = window.setInterval(fetchAbeyPrice, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [chainId, refreshIntervalMs]);

  return price?.chainId === chainId ? price.valueUsd : null;
}
