import { useId } from "react";
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

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  );
  return `#${ch.map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

const R = 37; // cake radius
const DEPTH = 6; // how far the cake body shows below the frosting

/**
 * A plate with a layered cake on it. Each slice is a wedge with a frosted top,
 * a darker cake body underneath, piped cream along the rim and a soft gloss.
 * One emoji per flavour group.
 */
export function CakeView({ cake, capacity, size, showPlate = true, className }: CakeViewProps) {
  const uid = useId().replace(/:/g, "");
  const step = 360 / capacity;

  const shadows: React.ReactNode[] = [];
  const bodies: React.ReactNode[] = [];
  const tops: React.ReactNode[] = [];
  const piping: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  const clipWedges: React.ReactNode[] = [];
  let slot = 0;

  if (cake) {
    for (const g of cake.groups) {
      const style = FLAVORS[g.flavor];
      for (let i = 0; i < g.count; i++) {
        const idx = slot + i;
        const color = style.colors ? style.colors[idx % style.colors.length] : style.color;
        const start = -90 + idx * step;
        const end = start + step;
        const top = wedgePath(50, 50, R, start, end);
        shadows.push(
          <path key={`s${idx}`} d={top} transform={`translate(0 ${DEPTH + 2.5})`} fill="rgba(60,30,10,0.18)" stroke="rgba(60,30,10,0.18)" strokeWidth={2} />,
        );
        bodies.push(
          <path
            key={`b${idx}`}
            d={top}
            transform={`translate(0 ${DEPTH})`}
            fill={shade(color, -0.3)}
            stroke={shade(color, -0.45)}
            strokeWidth={1}
            strokeLinejoin="round"
          />,
        );
        tops.push(
          <path key={`t${idx}`} d={top} fill={color} stroke="#fff8f0" strokeWidth={1.8} strokeLinejoin="round" />,
        );
        clipWedges.push(<path key={`c${idx}`} d={top} />);
        for (const f of [0.28, 0.72]) {
          const [px, py] = polar(50, 50, R - 5, start + step * f);
          piping.push(<circle key={`p${idx}-${f}`} cx={px} cy={py} r={2.7} fill="#fffaf3" opacity={0.95} />);
          piping.push(<circle key={`q${idx}-${f}`} cx={px - 0.7} cy={py - 0.7} r={1.1} fill="#fff" />);
        }
      }
      const mid = -90 + (slot + g.count / 2) * step;
      const full = g.count === capacity;
      const [lx, ly] = full ? [50, 50] : polar(50, 50, g.count >= capacity / 2 ? 17 : 22, mid);
      labels.push(
        <text
          key={`label-${g.flavor}`}
          x={lx}
          y={ly}
          fontSize={full ? 24 : g.count >= 3 ? 17 : 13}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}
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
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`${uid}-plate`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#f7f1ea" />
          <stop offset="100%" stopColor="#e9dfd3" />
        </radialGradient>
        <radialGradient id={`${uid}-gloss`} cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.06} />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>{clipWedges}</clipPath>
      </defs>

      {showPlate && (
        <>
          <circle cx={50} cy={50} r={48.5} fill={`url(#${uid}-plate)`} stroke="#dccfc0" strokeWidth={1.5} />
          <circle cx={50} cy={50} r={44} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.9} />
          <circle cx={50} cy={50} r={40} fill="none" stroke="#e8dccd" strokeWidth={1.2} strokeDasharray="2.5 3" />
        </>
      )}

      {shadows}
      {bodies}
      {tops}
      {cake && <circle cx={50} cy={50} r={R} fill={`url(#${uid}-gloss)`} clipPath={`url(#${uid}-clip)`} />}
      {piping}
      {labels}
    </svg>
  );
}
