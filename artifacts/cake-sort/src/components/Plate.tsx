import { memo } from "react";
import type { Cell } from "@/game/types";
import { CakeView } from "./CakeView";

interface PlateProps {
  index: number;
  cake: Cell;
  capacity: number;
  size: number;
  isTarget: boolean;
  isHint: boolean;
  isServing: boolean;
  isNope: boolean;
  isPopped: boolean;
  isHelped: boolean;
  onTap: (index: number) => void;
}

export const Plate = memo(function Plate({
  index, cake, capacity, size, isTarget, isHint, isServing, isNope, isPopped, isHelped, onTap,
}: PlateProps) {
  const classes = [
    "plate",
    isTarget ? "is-target" : "",
    isHint && !isTarget ? "is-hint" : "",
    isServing ? "is-serving" : "",
    isNope ? "is-nope" : "",
    isPopped ? "is-popped" : "",
    isHelped ? "is-helped" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ width: size, height: size }}
      onPointerUp={() => onTap(index)}
      role="button"
      aria-label={cake ? "Plate with cake" : "Empty plate"}
    >
      <CakeView cake={cake} capacity={capacity} size={size} />
    </div>
  );
});
