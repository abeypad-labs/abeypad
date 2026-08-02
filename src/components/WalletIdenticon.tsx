import { cn } from "@/lib/utils/utils";

type WalletIdenticonProps = {
  address: string;
  className?: string;
};

function addressBytes(address: string) {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  return Array.from({ length: 20 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

export function WalletIdenticon({
  address,
  className,
}: WalletIdenticonProps) {
  const bytes = addressBytes(address);
  const hue = Math.round((bytes[0] / 255) * 360);
  const cells: Array<{ x: number; y: number; accent: boolean }> = [];

  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const byte = bytes[(y * 3 + x) % bytes.length];
      if ((byte & 1) === 0) continue;
      cells.push({ x, y, accent: (byte & 2) !== 0 });
      if (x < 2) cells.push({ x: 4 - x, y, accent: (byte & 2) !== 0 });
    }
  }

  return (
    <span
      className={cn(
        "inline-grid shrink-0 overflow-hidden rounded-[3px] border-2 border-black bg-white",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 5 5" className="h-full w-full" shapeRendering="crispEdges">
        <rect width="5" height="5" fill={`hsl(${hue} 55% 92%)`} />
        {cells.map((cell, index) => (
          <rect
            key={`${cell.x}-${cell.y}-${index}`}
            x={cell.x}
            y={cell.y}
            width="1"
            height="1"
            fill={
              cell.accent
                ? `hsl(${(hue + 42) % 360} 82% 48%)`
                : `hsl(${hue} 78% 42%)`
            }
          />
        ))}
      </svg>
    </span>
  );
}
