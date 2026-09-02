import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSavedGame } from "./save.ts";
import type { SavedGame } from "./save.ts";
import { LEVELS } from "./levels.ts";
import { emptyBoard, makeCake } from "./engine.ts";

const level = LEVELS[0];

function sample(): SavedGame {
  const board = emptyBoard(level.rows, level.cols, level.capacity);
  board.cells[0] = makeCake([{ flavor: "strawberry", count: 2 }]);
  return {
    v: 1,
    levelId: level.id,
    board,
    tray: [makeCake([{ flavor: "lemon", count: 1 }]), makeCake([{ flavor: "kiwi", count: 2 }, { flavor: "chocolate", count: 1 }])],
    served: 7,
    turns: 12,
    bellReadyAt: 3,
  };
}

test("a save round-trips through JSON", () => {
  const g = sample();
  const back = parseSavedGame(JSON.stringify(g), level);
  assert.deepEqual(back, g);
});

test("garbage, wrong level, or wrong board shape is rejected", () => {
  assert.equal(parseSavedGame(null, level), null);
  assert.equal(parseSavedGame("not json", level), null);
  assert.equal(parseSavedGame(JSON.stringify({ ...sample(), levelId: 99 }), level), null);
  const wrongSize = sample();
  wrongSize.board.cells.push(null);
  assert.equal(parseSavedGame(JSON.stringify(wrongSize), level), null);
  assert.equal(parseSavedGame(JSON.stringify(sample()), LEVELS[2]), null, "a save for Easy is not a Hard save");
});

test("bad cakes are rejected", () => {
  const tooMany = sample();
  tooMany.board.cells[1] = makeCake([{ flavor: "lemon", count: level.capacity + 1 }]);
  assert.equal(parseSavedGame(JSON.stringify(tooMany), level), null);
  const unknownFlavor = sample();
  unknownFlavor.tray[0] = { id: "x", groups: [{ flavor: "pickle" as never, count: 1 }] };
  assert.equal(parseSavedGame(JSON.stringify(unknownFlavor), level), null);
  const negative = sample();
  negative.served = -1;
  assert.equal(parseSavedGame(JSON.stringify(negative), level), null);
});
