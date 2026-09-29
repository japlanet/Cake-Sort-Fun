import { useId } from "react";
import type { Cake } from "@/game/types";
import { FLAVORS } from "@/game/levels";
import type { FlavorPattern } from "@/game/levels";

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

/** A ring-shaped slice of a wedge, from radius r0 out to r1. */
function bandPath(cx: number, cy: number, r0: number, r1: number, start: number, end: number): string {
  if (r0 <= 0) return wedgePath(cx, cy, r1, start, end);
  const [ox1, oy1] = polar(cx, cy, r1, start);
  const [ox2, oy2] = polar(cx, cy, r1, end);
  const [ix2, iy2] = polar(cx, cy, r0, end);
  const [ix1, iy1] = polar(cx, cy, r0, start);
  const large = end - start > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return `M${f(ox1)},${f(oy1)} A${r1},${r1} 0 ${large} 1 ${f(ox2)},${f(oy2)} L${f(ix2)},${f(iy2)} A${r0},${r0} 0 ${large} 0 ${f(ix1)},${f(iy1)} Z`;
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

/** Rainbow wedges run red on the rim to purple in the middle. */
const RAINBOW = ["#ff5f5f", "#ff9f1c", "#ffe047", "#6fd36b", "#4f9ff0", "#a66cff"];

/**
 * Spots around the topping emoji where seeds, chips and berries go, as
 * [radius, fraction of the way across the wedge]. The emoji sits at about r 19-22.
 */
const SPOTS: [number, number][] = [
  [28, 0.34],
  [28, 0.66],
  [11, 0.5],
  [19.5, 0.1],
  [19.5, 0.9],
];

/**
 * The second, non-colour cue for a flavour: what is drawn on top of one wedge's frosting.
 * Everything stays inside the wedge and away from its middle, where the topping emoji sits.
 */
function wedgeDecor(pattern: FlavorPattern, key: string, start: number, step: number, blushId: string): React.ReactNode {
  const at = (r: number, f: number) => polar(50, 50, r, start + step * f);
  const radial = (f: number) => start + step * f + 90; // rotate an upright shape to point outwards
  const end = start + step;
  switch (pattern) {
    case "plain":
      return null;
    case "stripes":
      return (
        <g key={key}>
          {RAINBOW.map((c, i) => (
            <path key={c} d={bandPath(50, 50, (R * (5 - i)) / 6, (R * (6 - i)) / 6, start, end)} fill={c} />
          ))}
        </g>
      );
    case "rind":
      return (
        <g key={key}>
          <path d={bandPath(50, 50, R - 6.5, R, start, end)} fill="#e4f7c2" />
          <path d={bandPath(50, 50, R - 4.2, R, start, end)} fill="#3d9c4a" />
          <path d={bandPath(50, 50, R - 1.6, R, start, end)} fill="#2c7a37" />
          {([[24.5, 0.24], [24.5, 0.76], [12, 0.5]] as [number, number][]).map(([r, f], i) => {
            const [x, y] = at(r, f);
            return <ellipse key={i} cx={x} cy={y} rx={1.1} ry={1.9} fill="#2b1a1a" transform={`rotate(${radial(f)} ${x} ${y})`} />;
          })}
        </g>
      );
    case "seeds":
      return (
        <g key={key}>
          {SPOTS.map(([r, f], i) => {
            const [x, y] = at(r, f);
            return <ellipse key={i} cx={x} cy={y} rx={0.9} ry={1.5} fill="#fff3a6" transform={`rotate(${radial(f) + 20} ${x} ${y})`} />;
          })}
        </g>
      );
    case "chips":
      return (
        <g key={key}>
          {SPOTS.map(([r, f], i) => {
            const [x, y] = at(r, f);
            return <ellipse key={i} cx={x} cy={y} rx={2.3} ry={1.8} fill="#3d2210" transform={`rotate(${i * 50} ${x} ${y})`} />;
          })}
        </g>
      );
    case "berries":
      return (
        <g key={key}>
          {SPOTS.slice(0, 3).map(([r, f], i) => {
            const [x, y] = at(r, f);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={2.6} fill="#23409a" />
                <circle cx={x - 0.8} cy={y - 0.8} r={0.8} fill="#a9c6ff" />
              </g>
            );
          })}
        </g>
      );
    case "kiwi":
      return (
        <g key={key}>
          <path d={wedgePath(50, 50, 8.5, start, end)} fill="#f1f8cf" />
          {([[12.5, 0.3], [12.5, 0.7], [28, 0.3], [28, 0.7]] as [number, number][]).map(([r, f], i) => {
            const [x, y] = at(r, f);
            return <ellipse key={i} cx={x} cy={y} rx={0.9} ry={1.8} fill="#1f1a14" transform={`rotate(${radial(f)} ${x} ${y})`} />;
          })}
        </g>
      );
    case "segments": {
      const lines = [0.34, 0.66].map(f => {
        const [x1, y1] = at(6, f);
        const [x2, y2] = at(R - 7, f);
        return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff4dc" strokeWidth={1.2} strokeLinecap="round" opacity={0.85} />;
      });
      return (
        <g key={key}>
          <path d={wedgePath(50, 50, 5, start, end)} fill="#fff4dc" />
          <path d={bandPath(50, 50, R - 6.5, R - 5.2, start, end)} fill="#fff4dc" opacity={0.8} />
          {lines}
        </g>
      );
    }
    case "blush":
      return <path key={key} d={wedgePath(50, 50, R, start, end)} fill={`url(#${blushId})`} />;
  }
}

/**
 * A plate with a layered cake on it. Each slice is a wedge with a frosted top,
 * a darker cake body underneath, a flavour pattern (seeds, rind, chips, stripes...),
 * piped cream along the rim and a soft gloss. One topping emoji per slice.
 */
export function CakeView({ cake, capacity, size, showPlate = true, className }: CakeViewProps) {
  const uid = useId().replace(/:/g, "");
  const step = 360 / capacity;

  const shadows: React.ReactNode[] = [];
  const bodies: React.ReactNode[] = [];
  const tops: React.ReactNode[] = [];
  const decor: React.ReactNode[] = [];
  const outlines: React.ReactNode[] = [];
  const piping: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  const clipWedges: React.ReactNode[] = [];
  let slot = 0;

  if (cake) {
    for (const g of cake.groups) {
      const style = FLAVORS[g.flavor];
      for (let i = 0; i < g.count; i++) {
        const idx = slot + i;
        const color = style.color;
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
        decor.push(wedgeDecor(style.pattern, `d${idx}`, start, step, `${uid}-blush`));
        // Re-draw the cream edge over the decoration so neighbouring flavours stay apart.
        if (style.pattern !== "plain") {
          outlines.push(<path key={`o${idx}`} d={top} fill="none" stroke="#fff8f0" strokeWidth={1.8} strokeLinejoin="round" />);
        }
        clipWedges.push(<path key={`c${idx}`} d={top} />);
        // Watermelon's green rind takes the place of the piped cream.
        for (const f of style.pattern === "rind" ? [] : [0.22, 0.78]) {
          const [px, py] = polar(50, 50, R - 4.5, start + step * f);
          piping.push(<circle key={`p${idx}-${f}`} cx={px} cy={py} r={2.4} fill="#fffaf3" stroke="#fff" strokeWidth={0.8} />);
        }
        // One piece of fruit (or topping) on every slice.
        const [lx, ly] = polar(50, 50, capacity <= 4 ? 19 : 22, start + step / 2);
        labels.push(
          <text
            key={`label-${idx}`}
            x={lx}
            y={ly}
            fontSize={capacity <= 4 ? 15 : 12}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {style.emoji}
          </text>,
        );
      }
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
        <radialGradient id={`${uid}-blush`} gradientUnits="userSpaceOnUse" cx={50} cy={50} r={R}>
          <stop offset="0%" stopColor="#ff7a5c" stopOpacity={0} />
          <stop offset="55%" stopColor="#ff7a5c" stopOpacity={0} />
          <stop offset="100%" stopColor="#ff7a5c" stopOpacity={0.5} />
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
      {decor}
      {outlines}
      {cake && <circle cx={50} cy={50} r={R} fill={`url(#${uid}-gloss)`} clipPath={`url(#${uid}-clip)`} />}
      {piping}
      {labels}
    </svg>
  );
}
