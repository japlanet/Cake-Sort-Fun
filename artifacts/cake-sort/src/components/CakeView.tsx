import type { Cake } from "@/game/types";
import { FLAVORS } from "@/game/levels";

interface CakeViewProps {
  cake: Cake | null;
  capacity: number;
  size: number;
  showPlate?: boolean;
  className?: string;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
}

/** A plate with a pie-style cake on it. Each slice is a wedge; each flavour group gets one emoji. */
export function CakeView({ cake, capacity, size, showPlate = true, className }: CakeViewProps) {
  const step = 360 / capacity;
  const wedges: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  let slot = 0;

  if (cake) {
    for (const g of cake.groups) {
      const style = FLAVORS[g.flavor];
      for (let i = 0; i < g.count; i++) {
        const start = -90 + (slot + i) * step;
        wedges.push(
          <path
            key={`${g.flavor}-${slot + i}`}
            d={wedgePath(50, 50, 38, start, start + step)}
            fill={style.colors ? style.colors[(slot + i) % style.colors.length] : style.color}
            stroke="#fff"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />,
        );
      }
      const mid = -90 + (slot + g.count / 2) * step;
      // A whole cake of one flavour gets its emoji in the middle.
      const [lx, ly] = g.count === capacity ? [50, 50] : polar(50, 50, g.count >= capacity / 2 ? 18 : 23, mid);
      labels.push(
        <text
          key={`label-${g.flavor}`}
          x={lx}
          y={ly}
          fontSize={g.count === capacity ? 22 : g.count >= 3 ? 17 : 13}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {style.emoji}
        </text>,
      );
      slot += g.count;
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`cake-svg ${className ?? ""}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {showPlate && (
        <>
          <circle cx={50} cy={50} r={47} fill="#fff" stroke="#ead9c8" strokeWidth={2.5} />
          <circle cx={50} cy={50} r={40.5} fill="#fdf8f3" stroke="#f1e4d6" strokeWidth={1.5} strokeDasharray="3 3" />
        </>
      )}
      {wedges}
      {labels}
    </svg>
  );
}
