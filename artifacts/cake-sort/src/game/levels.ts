import type { Flavor, LevelConfig } from "./types.ts";

export interface FlavorStyle {
  emoji: string;
  /** Wedge fill. */
  color: string;
  name: string;
}

export const FLAVORS: Record<Flavor, FlavorStyle> = {
  strawberry: { emoji: "🍓", color: "#ff8fab", name: "Strawberry" },
  chocolate: { emoji: "🍫", color: "#a9744f", name: "Chocolate" },
  rainbow: { emoji: "🌈", color: "#f6ecdc", name: "Rainbow" },
  lemon: { emoji: "🍋", color: "#ffe066", name: "Lemon" },
  kiwi: { emoji: "🥝", color: "#9be564", name: "Kiwi" },
  blueberry: { emoji: "🫐", color: "#8fb8ff", name: "Blueberry" },
  orange: { emoji: "🍊", color: "#ffb266", name: "Orange" },
  grape: { emoji: "🍇", color: "#c39bff", name: "Grape" },
  cherry: { emoji: "🍒", color: "#ff5c7a", name: "Cherry" },
  peach: { emoji: "🍑", color: "#ffc2a3", name: "Peach" },
  watermelon: { emoji: "🍉", color: "#ff8c94", name: "Watermelon" },
  cookie: { emoji: "🍪", color: "#d9a066", name: "Cookie" },
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
