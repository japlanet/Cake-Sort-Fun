import type { Flavor, LevelConfig } from "./types.ts";

export interface FlavorStyle {
  emoji: string;
  /** Wedge fill. */
  color: string;
  /** Per-slice fills that override `color` (rainbow). */
  colors?: string[];
  name: string;
}

export const FLAVORS: Record<Flavor, FlavorStyle> = {
  strawberry: { emoji: "🍓", color: "#ff8fab", name: "Strawberry" },
  chocolate: { emoji: "🍫", color: "#a9744f", name: "Chocolate" },
  lemon: { emoji: "🍋", color: "#ffe066", name: "Lemon" },
  kiwi: { emoji: "🥝", color: "#9be564", name: "Kiwi" },
  blueberry: { emoji: "🫐", color: "#8fb8ff", name: "Blueberry" },
  orange: { emoji: "🍊", color: "#ffb266", name: "Orange" },
  rainbow: {
    emoji: "🌈",
    color: "#ff7eb6",
    colors: ["#ff6b6b", "#ffa94d", "#ffe066", "#8ce99a", "#74c0fc", "#b197fc"],
    name: "Rainbow",
  },
  grape: { emoji: "🍇", color: "#c39bff", name: "Grape" },
  cherry: { emoji: "🍒", color: "#ff5c7a", name: "Cherry" },
  peach: { emoji: "🍑", color: "#ffc2a3", name: "Peach" },
  watermelon: { emoji: "🍉", color: "#ff8c94", name: "Watermelon" },
  cookie: { emoji: "🍪", color: "#d9a066", name: "Cookie" },
};

/** Flavours a brand-new player starts with, in shelf order. */
export const STARTER_FLAVORS: Flavor[] = ["strawberry", "chocolate", "lemon", "kiwi"];

function level(
  id: number,
  name: string,
  emoji: string,
  cfg: Partial<LevelConfig> & Pick<LevelConfig, "rows" | "cols" | "capacity" | "goal" | "flavorCount">,
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
    bgColor: "",
    ...cfg,
  };
}

export const LEVELS: LevelConfig[] = [
  level(1, "First Bake", "🧁", { rows: 2, cols: 3, capacity: 4, goal: 3, flavorCount: 2, maxFlavorsPerCake: 1, kindness: 1 }),
  level(2, "Two Flavours", "🍓", { rows: 2, cols: 3, capacity: 4, goal: 4, flavorCount: 2, kindness: 0.95 }),
  level(3, "Three Flavours", "🍋", { rows: 3, cols: 3, capacity: 4, goal: 5, flavorCount: 3, kindness: 0.9 }),
  level(4, "Big Cakes", "🎂", { rows: 3, cols: 3, capacity: 6, goal: 5, flavorCount: 3, kindness: 0.9 }),
  level(5, "Mixed Up", "🥝", { rows: 3, cols: 3, capacity: 6, goal: 6, flavorCount: 3, maxFlavorsPerCake: 3, kindness: 0.85 }),
  level(6, "Four Flavours", "🎉", { rows: 3, cols: 3, capacity: 6, goal: 7, flavorCount: 4, maxFlavorsPerCake: 3, kindness: 0.8 }),
  level(7, "More Plates", "🍽️", { rows: 4, cols: 3, capacity: 6, goal: 8, flavorCount: 4, maxFlavorsPerCake: 3, kindness: 0.8 }),
  level(8, "Busy Bakery", "🧑‍🍳", { rows: 4, cols: 3, capacity: 6, goal: 8, flavorCount: 5, maxFlavorsPerCake: 3, kindness: 0.75 }),
  level(9, "Cake Parade", "🎈", { rows: 4, cols: 3, capacity: 6, goal: 10, flavorCount: 5, maxFlavorsPerCake: 3, kindness: 0.7 }),
  level(10, "Bakery Boss", "👑", { rows: 4, cols: 4, capacity: 6, goal: 12, flavorCount: 5, maxFlavorsPerCake: 3, kindness: 0.6, helperThreshold: 2 }),
];
