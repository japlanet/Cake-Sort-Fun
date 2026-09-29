import type { Flavor, LevelConfig } from "./types.ts";

/**
 * A second cue drawn inside every wedge so flavours that sit near each other in
 * colour still look different: seeds, a rind, chips, stripes and so on.
 */
export type FlavorPattern = "plain" | "seeds" | "rind" | "chips" | "stripes" | "segments" | "blush" | "kiwi" | "berries";

export interface FlavorStyle {
  emoji: string;
  /** Wedge fill (frosting). The cake side underneath is a darker shade of it. */
  color: string;
  /** What is drawn on top of the frosting. */
  pattern: FlavorPattern;
  name: string;
}

/**
 * Each flavour gets its own hue and lightness so a 4-5 year old can sort by colour alone,
 * even with two flavours side by side on a small Hard-board cake. None of them is close
 * to the cream plate.
 */
export const FLAVORS: Record<Flavor, FlavorStyle> = {
  strawberry: { emoji: "🍓", color: "#ff8cc6", pattern: "seeds", name: "Strawberry" },
  chocolate: { emoji: "🍫", color: "#6b3a1f", pattern: "plain", name: "Chocolate" },
  rainbow: { emoji: "🌈", color: "#ff5f5f", pattern: "stripes", name: "Rainbow" },
  lemon: { emoji: "🍋", color: "#ffe047", pattern: "plain", name: "Lemon" },
  kiwi: { emoji: "🥝", color: "#86d44a", pattern: "kiwi", name: "Kiwi" },
  blueberry: { emoji: "🫐", color: "#4f8ff0", pattern: "berries", name: "Blueberry" },
  orange: { emoji: "🍊", color: "#ff8c0a", pattern: "segments", name: "Orange" },
  grape: { emoji: "🍇", color: "#9d5ce6", pattern: "plain", name: "Grape" },
  cherry: { emoji: "🍒", color: "#c41e3a", pattern: "plain", name: "Cherry" },
  peach: { emoji: "🍑", color: "#ffbfa6", pattern: "blush", name: "Peach" },
  watermelon: { emoji: "🍉", color: "#ff5a6e", pattern: "rind", name: "Watermelon" },
  cookie: { emoji: "🍪", color: "#b87a3d", pattern: "chips", name: "Cookie" },
};

/** Flavours a brand-new player starts with, in shelf order. Rainbow is in from day one. */
export const STARTER_FLAVORS: Flavor[] = ["strawberry", "chocolate", "rainbow", "lemon", "kiwi"];

function level(
  id: number,
  name: string,
  emoji: string,
  cfg: Partial<LevelConfig> & Pick<LevelConfig, "rows" | "cols" | "capacity" | "flavorCount">,
): LevelConfig {
  return {
    id,
    name,
    emoji,
    flavors: STARTER_FLAVORS.slice(0, cfg.flavorCount),
    maxFlavorsPerCake: 2,
    minSlices: 1,
    maxSlices: cfg.capacity - 1,
    kindness: 0.85,
    helperThreshold: 1,
    ...cfg,
  };
}

/** Three endless difficulties. Play goes on for as long as you like. */
export const LEVELS: LevelConfig[] = [
  level(1, "Easy", "🌱", { rows: 3, cols: 3, capacity: 4, flavorCount: 3, kindness: 0.9 }),
  level(2, "Medium", "🌟", { rows: 4, cols: 3, capacity: 6, flavorCount: 4, maxFlavorsPerCake: 3, kindness: 0.8 }),
  level(3, "Hard", "🔥", { rows: 4, cols: 4, capacity: 6, flavorCount: 5, maxFlavorsPerCake: 3, kindness: 0.6, helperThreshold: 2 }),
];

/** Cakes served in one sitting between little celebrations. */
export const CELEBRATE_EVERY = 10;
