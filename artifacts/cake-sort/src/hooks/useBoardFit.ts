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

/** The tray's width: the max-w-xl (36rem) box inside the px-3 page padding. */
const TRAY_MAX = 576;
const PAGE_PAD = 24;
/** Narrowest gap beside the tray that Chef Bear can stand in. */
const MIN_BEAR = 70;

export interface BearSpot {
  /** Stand beside the tray (clear of the plates), or peek over its left end when there is no room. */
  side: boolean;
  size: number;
}

/** Where Chef Bear stands: in the gap left of the tray when there is one, so he never covers a plate. */
export function useBearSpot(traySize: number): BearSpot {
  const compute = (): BearSpot => {
    const w = window.innerWidth;
    const gap = (w - Math.min(w - PAGE_PAD, TRAY_MAX)) / 2;
    const full = Math.round(traySize * 1.15);
    return gap - 10 >= MIN_BEAR ? { side: true, size: Math.min(full, Math.floor(gap - 10)) } : { side: false, size: full };
  };
  const [spot, setSpot] = useState(compute);
  useEffect(() => {
    const onResize = () => setSpot(compute());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traySize]);
  return spot;
}
