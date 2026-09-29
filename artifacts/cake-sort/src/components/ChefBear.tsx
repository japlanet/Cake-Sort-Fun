import { BearArt, HelpBell, SleepyZs } from "./BearArt";
import type { BearPose } from "./BearArt";

export type BearMood = "sleep" | "watch" | "ready";

interface ChefBearProps {
  mood: BearMood;
  size: number;
  /** Tucked fully away while he is busy at a plate. */
  hidden: boolean;
  onTap: () => void;
}

const POSE: Record<BearMood, BearPose> = { sleep: "sleep", watch: "watch", ready: "wave" };

/** Chef Bear lives behind the tray and peeks out as the plates fill up. */
export function ChefBear({ mood, size, hidden, onTap }: ChefBearProps) {
  return (
    <button
      type="button"
      className={`bear-corner bear-${hidden ? "hidden" : mood}`}
      style={{ width: size, height: size }}
      onClick={onTap}
      aria-label={mood === "ready" ? "Chef Bear is ready to help, tap him" : mood === "watch" ? "Chef Bear is watching" : "Chef Bear is asleep"}
    >
      {/* Watching needs no bubble: his eyes are on the plates. */}
      {mood !== "watch" && (
        <span className="bear-bubble" style={{ width: size * 0.38, height: size * 0.38 }} aria-hidden="true">
          {mood === "sleep" ? <SleepyZs style={{ width: "100%", height: "100%" }} /> : <HelpBell style={{ width: "100%", height: "100%" }} />}
        </span>
      )}
      <span className="bear-body" style={{ width: size, height: size }}>
        <BearArt pose={POSE[mood]} style={{ width: "100%", height: "100%" }} />
      </span>
    </button>
  );
}
