import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyTransfer,
  bestSpot,
  cakeSlices,
  chooseHelperTarget,
  consolidationScore,
  emptyBoard,
  emptyCells,
  generateCake,
  helperRescue,
  makeCake,
  neighborsOf,
  placeCake,
  playTurn,
  settle,
  transferCandidates,
} from "./engine.ts";
import type { Board, Cake, Cell, Flavor, LevelConfig, Step, StepEvent } from "./types.ts";

const S: Flavor = "strawberry";
const C: Flavor = "chocolate";
const L: Flavor = "lemon";
const K: Flavor = "kiwi";

function cake(...parts: [Flavor, number][]): Cake {
  return makeCake(parts.map(([flavor, count]) => ({ flavor, count })));
}

/** Build a board from a row-major list of cells; `null` for an empty plate. */
function board(rows: number, cols: number, capacity: number, cells: Cell[]): Board {
  assert.equal(cells.length, rows * cols);
  return { rows, cols, capacity, cells };
}

function groupsAt(b: Board, i: number): [Flavor, number][] {
  return (b.cells[i]?.groups ?? []).map(g => [g.flavor, g.count]);
}

function events(steps: Step[]): StepEvent[] {
  return steps.map(s => s.event);
}

function moves(steps: Step[]): string[] {
  return steps
    .filter(s => s.event.type === "move")
    .map(s => {
      const e = s.event as Extract<StepEvent, { type: "move" }>;
      return `${e.count}${e.flavor[0]} ${e.from}->${e.to}`;
    });
}

// ---------------------------------------------------------------------------
// Adjacency
// ---------------------------------------------------------------------------

test("neighbours are orthogonal only, in up/right/down/left order", () => {
  const b = emptyBoard(3, 3, 6);
  assert.deepEqual(neighborsOf(b, 4), [1, 5, 7, 3]);
  assert.deepEqual(neighborsOf(b, 0), [1, 3]);
  assert.deepEqual(neighborsOf(b, 8), [5, 7]);
  assert.deepEqual(neighborsOf(b, 2), [5, 1]);
});

// ---------------------------------------------------------------------------
// Direction rules
// ---------------------------------------------------------------------------

test("slices gather on the plate with more of that flavour", () => {
  // [3S] [ ] [2S]  -> place the 2S next to the 3S: the 2 move over
  const b = board(1, 3, 6, [cake([S, 3]), null, null]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 2]));
  assert.deepEqual(moves(steps), ["2s 1->0"]);
  assert.deepEqual(groupsAt(after, 0), [[S, 5]]);
  assert.equal(after.cells[1], null);
});

test("a partial move finishes the receiver and the giver keeps the rest", () => {
  // receiver 4S with 2 free, giver 3S: 2 move, receiver is served, 1S stays
  const b = board(1, 2, 6, [cake([S, 4]), null]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 3]));
  assert.deepEqual(moves(steps), ["2s 1->0"]);
  assert.ok(events(steps).some(e => e.type === "serve" && e.index === 0));
  assert.equal(after.cells[0], null);
  assert.deepEqual(groupsAt(after, 1), [[S, 1]]);
});

test("a big pile moves whole onto a smaller pile when the big plate is full", () => {
  // plate 0: 3S + 3C (full). plate 1: 1S + 2L (3 free). 3S fit -> they move.
  const b = board(1, 2, 6, [cake([S, 3], [C, 3]), null]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 1], [L, 2]));
  assert.deepEqual(moves(steps), ["3s 0->1"]);
  assert.deepEqual(groupsAt(after, 0), [[C, 3]]);
  assert.deepEqual(groupsAt(after, 1), [[S, 4], [L, 2]]);
});

test("a big pile never splits itself", () => {
  // plate 0: 4S + 2C (full). plate 1: 1S + 3L (2 free). 4S do not fit -> nothing moves
  // ... except the small pile can't move either, receiver is full. Stable.
  const b = board(1, 2, 6, [cake([S, 4], [C, 2]), null]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 1], [L, 3]));
  assert.deepEqual(moves(steps), []);
  assert.deepEqual(groupsAt(after, 0), [[S, 4], [C, 2]]);
  assert.deepEqual(groupsAt(after, 1), [[S, 1], [L, 3]]);
});

test("nothing moves onto an empty plate or between plates without a shared flavour", () => {
  const b = board(1, 3, 6, [cake([S, 3]), null, cake([C, 2])]);
  assert.deepEqual(transferCandidates(b), []);
  const { steps } = placeCake(b, 1, cake([L, 2]));
  assert.deepEqual(moves(steps), []);
});

test("equal piles: the purer plate receives, and the just-placed cake gives", () => {
  // plate 0: 2S + 1C ; place 2S at 1 -> the new cake holds only strawberry, so
  // it receives even though it was just placed and even though moving the other
  // way would free a plate.
  const b1 = board(1, 2, 6, [cake([S, 2], [C, 1]), null]);
  const r1 = placeCake(b1, 1, cake([S, 2]));
  assert.deepEqual(moves(r1.steps), ["2s 0->1"]);
  assert.deepEqual(groupsAt(r1.board, 0), [[C, 1]]);
  assert.deepEqual(groupsAt(r1.board, 1), [[S, 4]]);

  // Identical pure plates: the placed one gives.
  const b2 = board(1, 2, 6, [cake([S, 2]), null]);
  const r2 = placeCake(b2, 1, cake([S, 2]));
  assert.deepEqual(moves(r2.steps), ["2s 1->0"]);
});

// ---------------------------------------------------------------------------
// Cascades and ordering
// ---------------------------------------------------------------------------

test("the move that finishes a cake goes first, even if another merge is available", () => {
  // 1x3: [2S] [3S+1C placed] [4S]. Naive up-first order would pull the 2S into
  // the middle and block the 4S. Correct order: middle gives 2S to the 4S plate
  // (served), then the leftover 1S joins the 2S on the left.
  // Then the leftover 1S joins the pure 2S on the left rather than the 2S
  // hopping onto the chocolate plate: a pure pile can still be finished.
  const b = board(1, 3, 6, [cake([S, 2]), null, cake([S, 4])]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 3], [C, 1]));
  assert.deepEqual(moves(steps), ["2s 1->2", "1s 1->0"]);
  assert.equal(after.cells[2], null, "the 4S plate was served");
  assert.deepEqual(groupsAt(after, 0), [[S, 3]]);
  assert.deepEqual(groupsAt(after, 1), [[C, 1]]);
});

test("chain reaction across three plates", () => {
  // [3S] [ ] [1S+2C] [2C]  -> place 1S in the gap. (Plates 2 and 3 start
  // unsettled on purpose; in real play only the placed plate is ever unsettled.)
  // The bigger consolidation goes first: plate 2's chocolate (purity 2/3) and
  // plate 3's chocolate (pure) are equal piles, the purer plate 3 receives.
  // Then 1S joins the 3S (4S) and its plate empties, so plate 2's strawberry is
  // cut off from plate 0 and stays put.
  const b = board(1, 4, 6, [cake([S, 3]), null, cake([S, 1], [C, 2]), cake([C, 2])]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 1]));
  assert.deepEqual(moves(steps), ["2c 2->3", "1s 1->0"]);
  assert.deepEqual(groupsAt(after, 0), [[S, 4]]);
  assert.equal(after.cells[1], null);
  assert.deepEqual(groupsAt(after, 2), [[S, 1]]);
  // chocolate consolidated onto exactly one plate
  const chocPlates = after.cells.filter(c => c && c.groups.some(g => g.flavor === C));
  assert.equal(chocPlates.length, 1);
  assert.equal(cakeSlices(chocPlates[0]), 4);
});

test("a served plate frees space that lets a later merge happen", () => {
  // 2x2 board, capacity 4:
  // [3S] [1S placed]
  // [2C] [ ]
  // 1S joins 3S -> served. Board left with 2C only.
  const b = board(2, 2, 4, [cake([S, 3]), null, cake([C, 2]), null]);
  const { steps, board: after } = placeCake(b, 1, cake([S, 1]));
  assert.deepEqual(events(steps).map(e => e.type), ["place", "move", "serve"]);
  assert.deepEqual(after.cells.map(c => (c ? cakeSlices(c) : 0)), [0, 0, 2, 0]);
});

test("placing an already-finished cake serves it immediately", () => {
  const b = emptyBoard(1, 2, 4);
  const { steps, board: after } = placeCake(b, 0, cake([S, 4]));
  assert.deepEqual(events(steps).map(e => e.type), ["place", "serve"]);
  assert.equal(after.cells[0], null);
});

// ---------------------------------------------------------------------------
// Invariants under random play
// ---------------------------------------------------------------------------

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FUZZ_LEVEL: LevelConfig = {
  id: 0,
  name: "fuzz",
  emoji: "",
  rows: 3,
  cols: 3,
  capacity: 6,
  flavors: [S, C, L, K],
  flavorCount: 4,
  maxFlavorsPerCake: 3,
  minSlices: 1,
  maxSlices: 5,
  kindness: 0.5,
  helperThreshold: 1,
  bgColor: "",
};

function checkBoard(b: Board) {
  for (const cell of b.cells) {
    if (!cell) continue;
    assert.ok(cell.groups.length > 0, "no empty cakes on the board");
    const seen = new Set<Flavor>();
    for (const g of cell.groups) {
      assert.ok(g.count > 0, "no zero-size groups");
      assert.ok(!seen.has(g.flavor), "one group per flavour per plate");
      seen.add(g.flavor);
    }
    assert.ok(cakeSlices(cell) <= b.capacity, "never over capacity");
  }
}

test("random play: slices conserved, capacity respected, consolidation monotonic, always settles", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rand = lcg(seed);
    let b = emptyBoard(3, 3, 6);
    for (let turn = 0; turn < 40; turn++) {
      const empties = emptyCells(b);
      if (empties.length === 0) break;
      const index = empties[Math.floor(rand() * empties.length)];
      const c = generateCake(FUZZ_LEVEL, b, rand);
      const before = b.cells.reduce((n, cell) => n + cakeSlices(cell), 0) + cakeSlices(c);
      const result = playTurn(b, index, c, { autoHelper: turn % 2 === 0, helperThreshold: 1 });

      let prevBoard = b;
      let servedSlices = 0;
      let helperAdded = 0;
      for (const step of result.steps) {
        checkBoard(step.board);
        if (step.event.type === "move") {
          assert.ok(
            consolidationScore(step.board) > consolidationScore(prevBoard),
            `seed ${seed}: every move must raise consolidation`,
          );
        }
        if (step.event.type === "serve") servedSlices += 6;
        if (step.event.type === "helper") {
          // the helper tops the plate up to a full cake; account for the added slices
          helperAdded += 6 - cakeSlices(prevBoard.cells[step.event.index]);
        }
        prevBoard = step.board;
      }
      const after = result.board.cells.reduce((n, cell) => n + cakeSlices(cell), 0);
      assert.equal(after + servedSlices - helperAdded, before, `seed ${seed} turn ${turn}: slices conserved`);
      assert.equal(result.served, result.steps.filter(s => s.event.type === "serve").length);
      // A settled board has no legal transfer left.
      assert.deepEqual(transferCandidates(result.board), [], `seed ${seed}: board must be settled`);
      b = result.board;
    }
  }
});

test("settle on an already-settled board is a no-op", () => {
  const b = board(1, 2, 6, [cake([S, 3]), cake([C, 2])]);
  const steps: Step[] = [];
  const after = settle(b, steps);
  assert.deepEqual(steps, []);
  assert.deepEqual(after, b);
});

test("applyTransfer removes the group when it hits zero and clears an emptied plate", () => {
  const b = board(1, 2, 6, [cake([S, 2]), cake([S, 3])]);
  const after = applyTransfer(b, { from: 0, to: 1, flavor: S, count: 2, score: 0 });
  assert.equal(after.cells[0], null);
  assert.deepEqual(groupsAt(after, 1), [[S, 5]]);
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

test("helper finishes the plate closest to done and serves it", () => {
  const b = board(1, 3, 6, [cake([S, 2], [C, 1]), cake([L, 4], [K, 1]), cake([K, 3])]);
  assert.equal(chooseHelperTarget(b), 1);
  const { steps, board: after } = helperRescue(b);
  assert.deepEqual(events(steps).map(e => e.type), ["helper", "serve"]);
  const helperEvent = steps[0].event as Extract<StepEvent, { type: "helper" }>;
  assert.equal(helperEvent.flavor, L);
  assert.equal(after.cells[1], null);
  assert.deepEqual(groupsAt(after, 0), [[S, 2], [C, 1]]);
});

test("helper on an empty board does nothing", () => {
  const { steps, board: after } = helperRescue(emptyBoard(2, 2, 4));
  assert.deepEqual(steps, []);
  assert.equal(emptyCells(after).length, 4);
});

test("auto helper steps in when empties drop to the threshold, and not before", () => {
  // 1x3 with different flavours so nothing merges.
  const b = board(1, 3, 6, [cake([S, 2]), cake([C, 2]), null]);
  const relaxed = playTurn(b, 2, cake([L, 2]), { autoHelper: true, helperThreshold: 0 });
  assert.equal(relaxed.helperUsed, true, "board full -> helper");
  assert.equal(emptyCells(relaxed.board).length, 1);
  assert.equal(relaxed.served, 1, "helper-served cakes count towards the goal");

  const off = playTurn(b, 2, cake([L, 2]), { autoHelper: false, helperThreshold: 0 });
  assert.equal(off.helperUsed, false);
  assert.equal(emptyCells(off.board).length, 0);

  const early = playTurn(board(1, 3, 6, [cake([S, 2]), null, null]), 1, cake([C, 2]), {
    autoHelper: true,
    helperThreshold: 0,
  });
  assert.equal(early.helperUsed, false, "one plate still empty -> no helper");
});

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------

test("bestSpot prefers the spot that serves a cake, and is null when nothing would move", () => {
  // [4S] [ ] [ ] [2S]   with a 2S cake: spot 1 finishes the 4S, spot 2 only merges.
  const b = board(1, 4, 6, [cake([S, 4]), null, null, cake([S, 2])]);
  assert.equal(bestSpot(b, cake([S, 2])), 1);
  assert.equal(bestSpot(b, cake([C, 2])), null);
});

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

test("generated cakes respect the level limits", () => {
  const level: LevelConfig = { ...FUZZ_LEVEL, capacity: 4, maxFlavorsPerCake: 2, minSlices: 2, maxSlices: 9, flavors: [S, C] };
  const rand = lcg(7);
  for (let i = 0; i < 500; i++) {
    const c = generateCake(level, emptyBoard(2, 2, 4), rand);
    const n = cakeSlices(c);
    assert.ok(n >= 2 && n <= 3, "never a full plate, never below minSlices");
    assert.ok(c.groups.length <= 2);
    for (const g of c.groups) {
      assert.ok(g.count > 0);
      assert.ok(level.flavors.includes(g.flavor));
    }
    assert.equal(new Set(c.groups.map(g => g.flavor)).size, c.groups.length, "no duplicate flavours");
  }
});

test("kindness 1 only deals flavours that are already on the board", () => {
  const level: LevelConfig = { ...FUZZ_LEVEL, kindness: 1, maxFlavorsPerCake: 1 };
  const b = board(1, 2, 6, [cake([K, 2]), null]);
  const rand = lcg(11);
  for (let i = 0; i < 100; i++) {
    const c = generateCake(level, b, rand);
    assert.deepEqual(c.groups.map(g => g.flavor), [K]);
  }
});

test("single-flavour levels never deal mixed cakes", () => {
  const level: LevelConfig = { ...FUZZ_LEVEL, maxFlavorsPerCake: 1 };
  const rand = lcg(3);
  for (let i = 0; i < 200; i++) {
    assert.equal(generateCake(level, emptyBoard(2, 2, 6), rand).groups.length, 1);
  }
});
