export type BearMood = "sleep" | "watch" | "ready";

interface ChefBearProps {
  mood: BearMood;
  size: number;
  /** Tucked fully away while he is busy at a plate. */
  hidden: boolean;
  onTap: () => void;
}

const BUBBLE: Record<BearMood, string> = { sleep: "💤", watch: "👀", ready: "🔔" };

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
      <span className="bear-bubble" style={{ fontSize: size * 0.3 }} aria-hidden="true">
        {BUBBLE[mood]}
      </span>
      <span className="bear-body" style={{ fontSize: size * 0.72 }}>
        <svg
          viewBox="0 0 40 26"
          style={{ position: "absolute", left: "50%", top: "-30%", width: "80%", transform: "translateX(-50%) rotate(-8deg)" }}
          aria-hidden="true"
        >
          <ellipse cx="20" cy="22" rx="14" ry="3.5" fill="#e8e2da" />
          <rect x="7" y="15" width="26" height="8" rx="3" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <circle cx="12" cy="11" r="7" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <circle cx="28" cy="11" r="7" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <circle cx="20" cy="8" r="8" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <rect x="8" y="14" width="24" height="4" fill="#ffffff" />
        </svg>
        <span role="img" aria-hidden="true">
          🐻
        </span>
      </span>
    </button>
  );
}
