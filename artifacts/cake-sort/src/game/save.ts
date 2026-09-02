/**
 * Saving a game in progress so Home, a refresh, or iPad Safari dropping the
 * tab in the background never throws the board away. One save per difficulty.
 */
import type { Board, Cake, Flavor, LevelConfig } from "./types.ts";
import { FLAVORS } from "./levels.ts";

export interface SavedGame {
  v: 1;
  levelId: number;
  /** The settled board (never mid-animation). */
  board: Board;
  tray: Cake[];
  /** Cakes served this sitting. */
  served: number;
  turns: number;
  bellReadyAt: number;
}

export function saveKey(levelId: number): string {
  return `cake-sort-game-${levelId}`;
}

function isFlavor(x: unknown): x is Flavor {
  return typeof x === "string" && x in FLAVORS;
}

function isCake(x: unknown, capacity: number): x is Cake {
  if (!x || typeof x !== "object") return false;
  const c = x as { id?: unknown; groups?: unknown };
  if (typeof c.id !== "string" || !Array.isArray(c.groups) || c.groups.length === 0) return false;
  let total = 0;
  const seen = new Set<string>();
  for (const g of c.groups as { flavor?: unknown; count?: unknown }[]) {
    if (!g || !isFlavor(g.flavor) || typeof g.count !== "number" || !Number.isInteger(g.count) || g.count <= 0) return false;
    if (seen.has(g.flavor)) return false;
    seen.add(g.flavor);
    total += g.count;
  }
  return total <= capacity;
}

function isCount(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0;
}

/** Validate a stored save against the level it is for. Anything off returns null. */
export function parseSavedGame(raw: string | null, level: LevelConfig): SavedGame | null {
  if (!raw) return null;
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!p || typeof p !== "object") return null;
  const s = p as Partial<SavedGame>;
  if (s.v !== 1 || s.levelId !== level.id) return null;
  const b = s.board;
  if (!b || b.rows !== level.rows || b.cols !== level.cols || b.capacity !== level.capacity) return null;
  if (!Array.isArray(b.cells) || b.cells.length !== level.rows * level.cols) return null;
  for (const cell of b.cells) if (cell !== null && !isCake(cell, level.capacity)) return null;
  if (!Array.isArray(s.tray) || s.tray.length === 0) return null;
  for (const cake of s.tray) if (!isCake(cake, level.capacity)) return null;
  if (!isCount(s.served) || !isCount(s.turns) || !isCount(s.bellReadyAt)) return null;
  return {
    v: 1,
    levelId: level.id,
    board: { rows: b.rows, cols: b.cols, capacity: b.capacity, cells: b.cells },
    tray: s.tray,
    served: s.served,
    turns: s.turns,
    bellReadyAt: s.bellReadyAt,
  };
}

export function loadGame(level: LevelConfig): SavedGame | null {
  try {
    return parseSavedGame(localStorage.getItem(saveKey(level.id)), level);
  } catch {
    return null;
  }
}

export function storeGame(game: SavedGame): void {
  try {
    localStorage.setItem(saveKey(game.levelId), JSON.stringify(game));
  } catch {}
}

export function clearGame(levelId: number): void {
  try {
    localStorage.removeItem(saveKey(levelId));
  } catch {}
}

/** Cakes served in the saved sitting for a difficulty, or null when there is no save. */
export function savedSitting(level: LevelConfig): number | null {
  return loadGame(level)?.served ?? null;
}
