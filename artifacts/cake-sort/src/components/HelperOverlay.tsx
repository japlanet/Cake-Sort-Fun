interface HelperOverlayProps {
  x: number;
  y: number;
  size: number;
}

/** Chef Bear pops up over a plate and sprinkles it. */
export function HelperOverlay({ x, y, size }: HelperOverlayProps) {
  const sparkles = ["✨", "⭐", "✨", "🌟"];
  return (
    <div
      className="helper-overlay"
      style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}
    >
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="sparkle"
          style={{
            fontSize: size * 0.22,
            ["--r" as string]: `${size * 0.42}px`,
            animationDelay: `${i * 0.12}s`,
            transform: `rotate(${i * 90}deg) translateX(${size * 0.42}px)`,
          }}
        >
          {s}
        </span>
      ))}
      <span className="helper-bear" style={{ fontSize: size * 0.62, lineHeight: 1 }} role="img" aria-label="Chef Bear">
        🐻
      </span>
    </div>
  );
}
