interface HelperOverlayProps {
  x: number;
  y: number;
  size: number;
}

/** Chef Bear, hat and all, pops up over a plate and sprinkles it. */
export function HelperOverlay({ x, y, size }: HelperOverlayProps) {
  const sparkles = ["✨", "⭐", "✨", "🌟", "💫", "✨"];
  return (
    <div className="helper-overlay" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="sparkle"
          style={{
            fontSize: size * 0.2,
            ["--r" as string]: `${size * 0.46}px`,
            ["--a" as string]: `${i * 60}deg`,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {s}
        </span>
      ))}
      <div className="helper-bear" style={{ fontSize: size * 0.6, lineHeight: 1, position: "relative" }}>
        <svg
          viewBox="0 0 40 26"
          style={{ position: "absolute", left: "50%", top: "-32%", width: "78%", transform: "translateX(-50%) rotate(-8deg)" }}
          aria-hidden="true"
        >
          <ellipse cx="20" cy="22" rx="14" ry="3.5" fill="#e8e2da" />
          <rect x="7" y="15" width="26" height="8" rx="3" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <circle cx="12" cy="11" r="7" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <circle cx="28" cy="11" r="7" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <circle cx="20" cy="8" r="8" fill="#ffffff" stroke="#d9d1c7" strokeWidth="1" />
          <rect x="8" y="14" width="24" height="4" fill="#ffffff" />
        </svg>
        <span role="img" aria-label="Chef Bear">
          🐻
        </span>
      </div>
    </div>
  );
}
