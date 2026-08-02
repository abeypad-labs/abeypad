import { formatEther } from "viem";

export type AbeyValue = string | number | bigint;

export function abeyValueToNumber(
  value: AbeyValue,
  unit: "abey" | "wei" = "abey",
) {
  try {
    return unit === "wei"
      ? Number(formatEther(BigInt(value)))
      : Number(value);
  } catch {
    return Number.NaN;
  }
}

export function formatAbeyUsd(
  value: AbeyValue,
  abeyPriceUsd: number | null,
  unit: "abey" | "wei" = "abey",
) {
  if (abeyPriceUsd === null) return null;
  const abeyAmount = abeyValueToNumber(value, unit);
  if (!Number.isFinite(abeyAmount)) return null;
  const dollars = abeyAmount * abeyPriceUsd;
  return dollars.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars > 0 && dollars < 0.01 ? 4 : 2,
    maximumFractionDigits: dollars > 0 && dollars < 0.01 ? 4 : 2,
  });
}
