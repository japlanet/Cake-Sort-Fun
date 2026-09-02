import type { Flavor } from "./types.ts";
import type { ThemeId } from "./themes.ts";
import { STARTER_FLAVORS } from "./levels.ts";

export const CAKES_PER_REWARD = 20;
export const SHELF_SIZE = 5;

export type Reward =
  | { kind: "flavor"; at: number; flavor: Flavor }
  | { kind: "theme"; at: number; theme: ThemeId };

/** One reward every CAKES_PER_REWARD cakes, cakes and backgrounds taking turns. */
const SEQUENCE: (Omit<Extract<Reward, { kind: "flavor" }>, "at"> | Omit<Extract<Reward, { kind: "theme" }>, "at">)[] = [
  { kind: "flavor", flavor: "blueberry" },
  { kind: "theme", theme: "ocean" },
  { kind: "flavor", flavor: "orange" },
  { kind: "theme", theme: "forest" },
  { kind: "flavor", flavor: "rainbow" },
  { kind: "theme", theme: "sunset" },
  { kind: "flavor", flavor: "grape" },
  { kind: "theme", theme: "candy" },
  { kind: "flavor", flavor: "cherry" },
  { kind: "theme", theme: "space" },
  { kind: "flavor", flavor: "peach" },
  { kind: "flavor", flavor: "watermelon" },
  { kind: "flavor", flavor: "cookie" },
];

export const REWARDS: Reward[] = SEQUENCE.map((r, i) => ({ ...r, at: (i + 1) * CAKES_PER_REWARD }) as Reward);

export function unlockedFlavors(totalServed: number): Flavor[] {
  const out = [...STARTER_FLAVORS];
  for (const r of REWARDS) if (r.kind === "flavor" && totalServed >= r.at) out.push(r.flavor);
  return out;
}

export function unlockedThemes(totalServed: number): ThemeId[] {
  const out: ThemeId[] = ["bakery"];
  for (const r of REWARDS) if (r.kind === "theme" && totalServed >= r.at) out.push(r.theme);
  return out;
}

/** The next reward still to earn, or null when everything is unlocked. */
export function nextReward(totalServed: number): Reward | null {
  return REWARDS.find(r => r.at > totalServed) ?? null;
}

/** Rewards whose threshold was crossed going from `before` to `after` cakes. */
export function rewardsBetween(before: number, after: number): Reward[] {
  return REWARDS.filter(r => r.at > before && r.at <= after);
}

/** Progress towards the next reward as {done, total}; total is CAKES_PER_REWARD. */
export function rewardProgress(totalServed: number): { done: number; total: number } {
  const next = nextReward(totalServed);
  if (!next) return { done: CAKES_PER_REWARD, total: CAKES_PER_REWARD };
  const start = next.at - CAKES_PER_REWARD;
  return { done: totalServed - start, total: CAKES_PER_REWARD };
}

/** Put a freshly unlocked flavour at the front of the shelf so it shows up straight away. */
export function shelfWithNewFlavor(shelf: Flavor[], flavor: Flavor): Flavor[] {
  const rest = shelf.filter(f => f !== flavor);
  return [flavor, ...rest].slice(0, SHELF_SIZE);
}
