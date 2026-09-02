export type ThemeId = "bakery" | "ocean" | "forest" | "sunset" | "candy" | "space";

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  /** Tailwind gradient classes for the play screen. Keep them literal so Tailwind sees them. */
  bg: string;
  /** Header and panel tint. */
  panel: string;
  /** Decorative emoji scattered faintly behind the board. */
  decor: string[];
}

export const THEMES: Record<ThemeId, Theme> = {
  bakery: {
    id: "bakery",
    name: "Bakery",
    emoji: "🧁",
    bg: "bg-gradient-to-br from-pink-300 via-amber-200 to-sky-300",
    panel: "bg-white/60",
    decor: ["🧁", "🍰", "🥐"],
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    bg: "bg-gradient-to-br from-cyan-300 via-sky-300 to-blue-400",
    panel: "bg-white/60",
    decor: ["🐟", "🐚", "🐙"],
  },
  forest: {
    id: "forest",
    name: "Forest",
    emoji: "🌳",
    bg: "bg-gradient-to-br from-lime-300 via-green-300 to-emerald-400",
    panel: "bg-white/60",
    decor: ["🌲", "🍄", "🦊"],
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    bg: "bg-gradient-to-br from-orange-300 via-rose-300 to-purple-400",
    panel: "bg-white/60",
    decor: ["🌞", "☁️", "🦩"],
  },
  candy: {
    id: "candy",
    name: "Candy",
    emoji: "🍭",
    bg: "bg-gradient-to-br from-fuchsia-300 via-pink-300 to-violet-400",
    panel: "bg-white/60",
    decor: ["🍬", "🍭", "🍩"],
  },
  space: {
    id: "space",
    name: "Space",
    emoji: "🚀",
    bg: "bg-gradient-to-br from-indigo-400 via-violet-400 to-slate-700",
    panel: "bg-white/70",
    decor: ["⭐", "🪐", "🚀"],
  },
};

export const THEME_ORDER: ThemeId[] = ["bakery", "ocean", "forest", "sunset", "candy", "space"];
