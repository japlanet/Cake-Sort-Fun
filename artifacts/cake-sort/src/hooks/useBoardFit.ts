import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

/**
 * The plate size that fits a rows x cols grid inside `areaRef`, kept up to
 * date on resize. Changes of a pixel or less are ignored so sub-pixel
 * measurement noise can never make the board shimmer.
 */
export function useBoardFit(areaRef: RefObject<HTMLElement | null>, rows: number, cols: number, gap: number): number {
  const [cellSize, setCellSize] = useState(96);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    let last = 0;
    const measure = () => {
      const w = el.clientWidth - 40;
      const h = el.clientHeight - 40;
      const byWidth = (w - (cols - 1) * gap) / cols;
      const byHeight = (h - (rows - 1) * gap) / rows;
      const next = Math.max(56, Math.min(150, Math.floor(Math.min(byWidth, byHeight))));
      if (last !== 0 && Math.abs(next - last) <= 1) return;
      last = next;
      setCellSize(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [areaRef, rows, cols, gap]);

  return cellSize;
}

/**
 * Tray cake size from the screen width alone. It must not depend on the plate
 * size: the tray's height decides how much room the board gets, so tying the
 * two together creates a feedback loop.
 */
export function useTraySize(): number {
  const compute = () => Math.round(Math.min(120, Math.max(72, window.innerWidth / 7)));
  const [size, setSize] = useState(compute);
  useEffect(() => {
    const onResize = () => setSize(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}
