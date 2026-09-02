import { memo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Cake } from "@/game/types";
import { CakeView } from "./CakeView";

interface TrayProps {
  tray: Cake[];
  capacity: number;
  size: number;
  selected: number;
  draggingIndex: number | null;
  disabled: boolean;
  onPointerDown: (index: number, e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

export const Tray = memo(function Tray({
  tray, capacity, size, selected, draggingIndex, disabled, onPointerDown, onPointerMove, onPointerUp,
}: TrayProps) {
  return (
    <div className="flex items-end justify-center gap-4 sm:gap-6">
      {tray.map((cake, i) => {
        const classes = [
          "tray-cake rounded-full",
          selected === i ? "is-selected" : "",
          draggingIndex === i ? "is-dragging" : "",
          "is-new",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div
            key={cake.id}
            className={classes}
            style={{
              width: size,
              height: size,
              boxShadow: selected === i ? "0 0 0 5px rgba(56, 189, 248, 0.85), 0 10px 20px rgba(0,0,0,0.18)" : "0 6px 14px rgba(0,0,0,0.15)",
              opacity: disabled && draggingIndex !== i ? 0.85 : undefined,
            }}
            onPointerDown={e => onPointerDown(i, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="button"
            aria-label={`Cake ${i + 1} in the tray`}
          >
            <CakeView cake={cake} capacity={capacity} size={size} />
          </div>
        );
      })}
    </div>
  );
});
