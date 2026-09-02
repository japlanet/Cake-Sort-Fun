import { useCallback, useState } from "react";
import type { Flavor } from "@/game/types";
import type { ThemeId } from "@/game/themes";
import { STARTER_FLAVORS } from "@/game/levels";
import { THEMES } from "@/game/themes";
import { rewardsBetween, shelfWithNewFlavor, unlockedFlavors, unlockedThemes } from "@/game/rewards";

const KEY = "cake-sort-progress";

export interface Progress {
  totalServed: number;
  shelf: Flavor[];
  themeId: ThemeId;
  /** Bumped when the starter set changes, so saved shelves pick up new starters once. */
  version?: number;
}

const VERSION = 2;
const DEFAULT: Progress = { totalServed: 0, shelf: [...STARTER_FLAVORS], themeId: "bakery", version: VERSION };

function isFlavorList(x: unknown): x is Flavor[] {
  return Array.isArray(x) && x.every(f => typeof f === "string");
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<Progress>;
    const totalServed = typeof p.totalServed === "number" && p.totalServed >= 0 ? p.totalServed : 0;
    const allowed = unlockedFlavors(totalServed);
    let shelf = isFlavorList(p.shelf) ? p.shelf.filter(f => allowed.includes(f)) : [];
    if ((p.version ?? 1) < 2 && !shelf.includes("rainbow")) shelf = shelfWithNewFlavor(shelf, "rainbow");
    const themeId = p.themeId && THEMES[p.themeId] && unlockedThemes(totalServed).includes(p.themeId) ? p.themeId : "bakery";
    return { totalServed, shelf: shelf.length >= 2 ? shelf : [...STARTER_FLAVORS], themeId, version: VERSION };
  } catch {
    return DEFAULT;
  }
}

function write(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Lifetime cakes served, the shelf of active cakes, and the chosen background. Persisted. */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(read);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress(prev => {
      const next = fn(prev);
      write(next);
      return next;
    });
  }, []);

  /** Count served cakes; freshly earned cakes jump onto the shelf and new backgrounds switch on. */
  const addServed = useCallback(
    (n: number) => {
      update(prev => {
        const totalServed = prev.totalServed + n;
        let shelf = prev.shelf;
        let themeId = prev.themeId;
        for (const r of rewardsBetween(prev.totalServed, totalServed)) {
          if (r.kind === "flavor") shelf = shelfWithNewFlavor(shelf, r.flavor);
          else themeId = r.theme;
        }
        return { totalServed, shelf, themeId, version: VERSION };
      });
    },
    [update],
  );

  const setShelf = useCallback((shelf: Flavor[]) => update(p => ({ ...p, shelf })), [update]);
  const setTheme = useCallback((themeId: ThemeId) => update(p => ({ ...p, themeId })), [update]);

  return { progress, addServed, setShelf, setTheme };
}
