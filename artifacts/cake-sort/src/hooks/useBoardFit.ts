import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

/** The plate size that fits a rows x cols grid inside `areaRef`, kept up to date on resize. */
export function useBoardFit(areaRef: RefObject<HTMLElement | null>, rows: number, cols: number, gap: number): number {
  const [cellSize, setCellSize] = useState(96);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 40;
      const h = el.clientHeight - 40;
      const byWidth = (w - (cols - 1) * gap) / cols;
      const byHeight = (h - (rows - 1) * gap) / rows;
      setCellSize(Math.max(56, Math.min(150, Math.floor(Math.min(byWidth, byHeight)))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [areaRef, rows, cols, gap]);

  return cellSize;
}
