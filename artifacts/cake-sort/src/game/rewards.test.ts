import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAKES_PER_REWARD,
  REWARDS,
  SHELF_SIZE,
  nextReward,
  rewardProgress,
  rewardsBetween,
  shelfWithNewFlavor,
  unlockedFlavors,
  unlockedThemes,
} from "./rewards.ts";

test("rewards land every CAKES_PER_REWARD cakes and alternate to start", () => {
  assert.equal(REWARDS[0].at, CAKES_PER_REWARD);
  assert.equal(REWARDS[1].at, CAKES_PER_REWARD * 2);
  assert.equal(REWARDS[0].kind, "flavor");
  assert.equal(REWARDS[1].kind, "theme");
  assert.ok(!REWARDS.some(r => r.kind === "flavor" && r.flavor === "rainbow"), "rainbow cake is a starter, not a reward");
});

test("unlocks accumulate with total cakes served", () => {
  assert.deepEqual(unlockedFlavors(0), ["strawberry", "chocolate", "rainbow", "lemon", "kiwi"]);
  assert.deepEqual(unlockedFlavors(19), ["strawberry", "chocolate", "rainbow", "lemon", "kiwi"]);
  assert.deepEqual(unlockedFlavors(20), ["strawberry", "chocolate", "rainbow", "lemon", "kiwi", "blueberry"]);
  assert.deepEqual(unlockedThemes(39), ["bakery"]);
  assert.deepEqual(unlockedThemes(40), ["bakery", "ocean"]);
});

test("next reward and progress bar", () => {
  assert.equal(nextReward(0)?.at, 20);
  assert.equal(nextReward(20)?.at, 40);
  assert.deepEqual(rewardProgress(0), { done: 0, total: 20 });
  assert.deepEqual(rewardProgress(27), { done: 7, total: 20 });
  assert.deepEqual(rewardProgress(40), { done: 0, total: 20 });
  const last = REWARDS[REWARDS.length - 1].at;
  assert.equal(nextReward(last), null);
  assert.deepEqual(rewardProgress(last + 5), { done: 20, total: 20 });
});

test("rewardsBetween reports exactly the thresholds crossed", () => {
  assert.deepEqual(rewardsBetween(18, 19), []);
  assert.equal(rewardsBetween(19, 20).length, 1);
  assert.equal(rewardsBetween(19, 41).length, 2);
  assert.deepEqual(rewardsBetween(20, 20), []);
});

test("a new flavour goes to the front of the shelf and the shelf never overflows", () => {
  assert.deepEqual(shelfWithNewFlavor(["strawberry", "chocolate"], "rainbow"), ["rainbow", "strawberry", "chocolate"]);
  const full = shelfWithNewFlavor(["strawberry", "chocolate", "lemon", "kiwi", "blueberry"], "orange");
  assert.equal(full.length, SHELF_SIZE);
  assert.equal(full[0], "orange");
  assert.ok(!full.includes("blueberry"), "the last cake makes room");
  assert.deepEqual(shelfWithNewFlavor(["strawberry", "rainbow"], "rainbow"), ["rainbow", "strawberry"], "no duplicates");
});
