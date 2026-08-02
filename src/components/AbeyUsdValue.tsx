import { useAbeyPriceUsd } from "@/lib/hooks/useAbeyPriceUsd";
import { formatAbeyUsd, type AbeyValue } from "@/lib/utils/abey";

export function AbeyUsdValue({
  value,
  unit = "abey",
  className = "block text-[11px] font-black text-black/50",
}: {
  value: AbeyValue;
  unit?: "abey" | "wei";
  className?: string;
}) {
  const abeyPriceUsd = useAbeyPriceUsd();
  const formatted = formatAbeyUsd(value, abeyPriceUsd, unit);

  if (!formatted) return null;
  return <span className={className}>{formatted}</span>;
}
