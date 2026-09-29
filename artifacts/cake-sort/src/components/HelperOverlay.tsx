import { BearArt } from "./BearArt";

interface HelperOverlayProps {
  x: number;
  y: number;
  size: number;
}

/** Chef Bear, hat and all, pops up over a plate with both paws up and sprinkles it. */
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
      <div className="helper-bear" role="img" aria-label="Chef Bear" style={{ width: size * 0.9, height: size * 0.9, position: "relative" }}>
        <BearArt pose="help" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
