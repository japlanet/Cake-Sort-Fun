import { useEffect, useState } from "react";
import type { Flavor } from "@/game/types";
import { CakeView } from "./CakeView";

interface Point { x: number; y: number }

interface FlyingSlicesProps {
  from: Point;
  to: Point;
  flavor: Flavor;
  count: number;
  capacity: number;
  size: number;
}

/** A fan of slices that glides from one plate centre to another. */
export function FlyingSlices({ from, to, flavor, count, capacity, size }: FlyingSlicesProps) {
  const [pos, setPos] = useState<Point>(from);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPos(to));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [to]);

  return (
    <div
      className="flying"
      style={{
        width: size,
        height: size,
        transform: `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`,
      }}
    >
      <div className="flying-hop">
        <CakeView cake={{ id: "flying", groups: [{ flavor, count }] }} capacity={capacity} size={size} showPlate={false} />
      </div>
    </div>
  );
}
