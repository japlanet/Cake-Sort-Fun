/**
 * Chef Bear, drawn as SVG in the same style as the animal friends in the family's
 * other games (Ice Cream Shop's Critter): round ears, a light muzzle, rosy cheeks
 * and a tall chef's hat, here with a white apron.
 */
import type { CSSProperties } from "react";

/**
 * sleep: eyes shut, head drooping. watch: eyes open, looking up at the plates, blinking.
 * wave: happy, one paw up waving. help: happy, both paws up. icon: just his head, for buttons.
 */
export type BearPose = "sleep" | "watch" | "wave" | "help" | "icon";

const BEAR = { body: "#c98b5b", dark: "#8f5a33", light: "#f2d7b6", nose: "#4a2c17", cheek: "#f9a8d4", ink: "#3b2a20" };
const outline = { stroke: BEAR.dark, strokeWidth: 2, strokeOpacity: 0.45 };

interface BearArtProps {
  pose: BearPose;
  className?: string;
  style?: CSSProperties;
}

/** One arm, from the shoulder out to a round paw. `up` raises it beside the head. */
function Arm({ side, up }: { side: -1 | 1; up: boolean }) {
  if (!up) {
    const x = 100 + side * 52;
    return <ellipse cx={x} cy={184} rx={12} ry={22} fill={BEAR.body} transform={`rotate(${-side * 18} ${x} ${184})`} {...outline} />;
  }
  const cx = 100 + side * 66;
  const px = 100 + side * 84;
  return (
    <g>
      <ellipse cx={cx} cy={126} rx={13} ry={34} fill={BEAR.body} transform={`rotate(${side * 31} ${cx} 126)`} {...outline} />
      <circle cx={px} cy={92} r={15} fill={BEAR.body} {...outline} />
      <ellipse cx={px} cy={95} rx={8} ry={7} fill={BEAR.light} />
      {[-7, 0, 7].map(d => (
        <circle key={d} cx={px + d} cy={83} r={2.6} fill={BEAR.light} />
      ))}
    </g>
  );
}

function ChefHat() {
  return (
    <g transform="rotate(-6 100 30)">
      <rect x={74} y={20} width={52} height={20} rx={3} fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx={80} cy={10} r={16} fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx={100} cy={0} r={18} fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx={120} cy={10} r={16} fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x={76} y={16} width={48} height={14} fill="#fff" />
      <path d="M78 34 H122" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Eyes({ pose }: { pose: BearPose }) {
  const eyes = [78, 122];
  const y = 92;
  if (pose === "sleep") {
    // Shut and peaceful: little downward curves with a lash at the outer corner.
    return (
      <g fill="none" stroke={BEAR.ink} strokeWidth="4.5" strokeLinecap="round">
        {eyes.map(x => (
          <path key={x} d={`M${x - 11} ${y} Q${x} ${y + 9} ${x + 11} ${y}`} />
        ))}
      </g>
    );
  }
  if (pose === "wave" || pose === "help") {
    return (
      <g fill="none" stroke={BEAR.ink} strokeWidth="4.5" strokeLinecap="round">
        {eyes.map(x => (
          <path key={x} d={`M${x - 12} ${y + 2} Q${x} ${y - 12} ${x + 12} ${y + 2}`} />
        ))}
      </g>
    );
  }
  // Watching looks up and over towards the plates; the icon looks straight out.
  const [dx, dy] = pose === "watch" ? [4, -4] : [1, 1];
  return (
    <g>
      {eyes.map(x => (
        <g key={x}>
          <circle cx={x} cy={y} r={12} fill="#fff" />
          <circle cx={x + dx} cy={y + dy} r={6.5} fill="#2b2b2b" />
          <circle cx={x + dx - 2.5} cy={y + dy - 3} r={2.4} fill="#fff" />
          {pose === "watch" && <ellipse className="lid" cx={x} cy={y} rx={12.5} ry={12.5} fill={BEAR.body} />}
        </g>
      ))}
    </g>
  );
}

function Mouth({ pose }: { pose: BearPose }) {
  if (pose === "sleep") return <ellipse cx={100} cy={126} rx={4} ry={4.5} fill="#7a2e3b" />;
  if (pose === "wave" || pose === "help") {
    return (
      <g>
        <path d="M84 118 Q100 144 116 118 Z" fill="#7a2e3b" />
        <ellipse cx={100} cy={131} rx={7} ry={4.5} fill="#f472b6" />
      </g>
    );
  }
  return <path d="M90 121 Q100 130 110 121" fill="none" stroke={BEAR.ink} strokeWidth="3.5" strokeLinecap="round" />;
}

export function BearArt({ pose, className, style }: BearArtProps) {
  const icon = pose === "icon";
  const armsUp = pose === "help";
  // Asleep, his head droops to one side.
  const tilt = pose === "sleep" ? "rotate(-9 100 150)" : pose === "watch" ? "rotate(5 100 150)" : undefined;

  return (
    <svg
      viewBox={icon ? "10 -24 180 184" : "-20 -24 240 240"}
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden="true"
    >
      {!icon && (
        <g>
          {/* Body with a white apron */}
          <path d="M52 200 L52 180 Q52 138 100 138 Q148 138 148 180 L148 200 Q148 214 134 214 L66 214 Q52 214 52 200 Z" fill={BEAR.body} {...outline} />
          <path d="M72 158 Q100 150 128 158 L128 207 Q100 213 72 207 Z" fill="#fff" stroke="#e2d6c8" strokeWidth="2" />
          <path d="M86 186 H114 V198 Q100 204 86 198 Z" fill="#fde2ec" stroke="#f5b8cf" strokeWidth="1.5" />
          <Arm side={-1} up={armsUp} />
          {pose === "wave" ? (
            <g className="bear-arm-wave">
              <Arm side={1} up />
            </g>
          ) : (
            <Arm side={1} up={armsUp} />
          )}
        </g>
      )}

      <g transform={tilt}>
        {/* Round ears */}
        <circle cx={48} cy={44} r={20} fill={BEAR.body} {...outline} />
        <circle cx={48} cy={44} r={11} fill={BEAR.light} />
        <circle cx={152} cy={44} r={20} fill={BEAR.body} {...outline} />
        <circle cx={152} cy={44} r={11} fill={BEAR.light} />

        <circle cx={100} cy={95} r={62} fill={BEAR.body} {...outline} />
        <ellipse cx={100} cy={117} rx={24} ry={17} fill={BEAR.light} />
        <ellipse cx={64} cy={114} rx={10} ry={6} fill={BEAR.cheek} opacity={pose === "sleep" ? 0.8 : 0.55} />
        <ellipse cx={136} cy={114} rx={10} ry={6} fill={BEAR.cheek} opacity={pose === "sleep" ? 0.8 : 0.55} />

        <Eyes pose={pose} />
        <ellipse cx={100} cy={108} rx={7.5} ry={5.5} fill={BEAR.nose} />
        <ellipse cx={98} cy={106} rx={2.4} ry={1.5} fill="#fff" opacity={0.6} />
        <Mouth pose={pose} />
        <ChefHat />
      </g>
    </svg>
  );
}

/** Three Zs drifting up and away while he naps. */
export function SleepyZs({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" style={{ display: "block", overflow: "visible", ...style }} aria-hidden="true">
      {[
        { x: 0, y: 38, s: 14 },
        { x: 12, y: 25, s: 18 },
        { x: 25, y: 10, s: 23 },
      ].map((z, i) => (
        <text
          key={i}
          className="bear-z"
          x={z.x}
          y={z.y}
          fontSize={z.s}
          fontWeight={700}
          fontFamily='"Fredoka", "Nunito", sans-serif'
          fill="#5a6cd0"
          stroke="#fff"
          strokeWidth={3.5}
          paintOrder="stroke"
          style={{ animationDelay: `${i * 0.6}s` }}
        >
          Z
        </text>
      ))}
    </svg>
  );
}

/** A little gold service bell, rung when he is ready to help. */
export function HelpBell({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" style={{ display: "block", overflow: "visible", ...style }} aria-hidden="true">
      <circle cx={20} cy={34} r={3.5} fill="#b45309" />
      <path d="M8 31 Q8 12 20 10 Q32 12 32 31 Z" fill="#fcd34d" stroke="#b45309" strokeWidth={2} strokeLinejoin="round" />
      <rect x={5} y={29} width={30} height={5} rx={2.5} fill="#f59e0b" stroke="#b45309" strokeWidth={2} />
      <circle cx={20} cy={8} r={3} fill="#f59e0b" stroke="#b45309" strokeWidth={1.5} />
      <path d="M13 26 Q13 17 18 14" fill="none" stroke="#fff7d1" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M2 14 L6 17 M38 14 L34 17 M4 6 L8 10 M36 6 L32 10" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
