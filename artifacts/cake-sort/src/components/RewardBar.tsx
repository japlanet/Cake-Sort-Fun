import { nextReward, rewardProgress } from "@/game/rewards";
import { FLAVORS } from "@/game/levels";
import { THEMES } from "@/game/themes";

interface RewardBarProps {
  totalServed: number;
  compact?: boolean;
}

/** Cakes served towards the next new cake or background. */
export function RewardBar({ totalServed, compact = false }: RewardBarProps) {
  const next = nextReward(totalServed);
  const { done, total } = rewardProgress(totalServed);
  const pct = Math.min(100, (done / total) * 100);
  const prize = next ? (next.kind === "flavor" ? FLAVORS[next.flavor].emoji : THEMES[next.theme].emoji) : "🏆";
  const label = next
    ? `${total - done} more cakes until ${next.kind === "flavor" ? FLAVORS[next.flavor].name + " cake" : THEMES[next.theme].name + " background"}`
    : "Every reward earned!";

  return (
    <div className="flex items-center gap-2 w-full" aria-label={label} title={label}>
      <span className={compact ? "text-lg" : "text-2xl"} role="img" aria-hidden="true">
        🎂
      </span>
      <div className={`flex-1 ${compact ? "h-3" : "h-5"} bg-white/50 rounded-full overflow-hidden border border-white/70`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`${compact ? "text-2xl" : "text-4xl"} ${next ? "" : ""}`}
        role="img"
        aria-hidden="true"
        style={{ filter: next ? "drop-shadow(0 2px 2px rgba(0,0,0,0.25))" : undefined }}
      >
        🎁{prize}
      </span>
    </div>
  );
}
