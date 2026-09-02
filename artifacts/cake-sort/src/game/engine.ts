/**
 * Cake Sort rules engine. Pure functions, no DOM, no randomness except where a
 * `rand` function is passed in.
 *
 * THE RULES
 *
 * 1. A plate holds up to `capacity` slices. Slices of one flavour sit together
 *    as a group; a plate lists its groups in the order they arrived.
 *
 * 2. Slices only ever move between two plates that are side by side (up, down,
 *    left, right) AND both already hold that flavour. Nothing spreads onto an
 *    empty plate and nothing jumps diagonally.
 *
 * 3. Direction. Slices of a flavour gather on the plate that has MORE of them.
 *    - Small pile -> big pile: as many slices as fit move (a partial move is fine,
 *      it is how a nearly-done cake gets finished).
 *    - Big pile -> small pile: only if the WHOLE big pile fits. A big pile never
 *      splits itself. This is what frees a full, mixed plate when its neighbour
 *      has room.
 *    - Equal piles: either direction is allowed; the scoring below decides.
 *
 * 4. When several transfers are possible the engine performs the best one, then
 *    looks again, until nothing can move. "Best" prefers, in order: a move that
 *    finishes a cake, the biggest consolidation (measured as the gain in the sum
 *    of squared pile sizes), a receiver that holds only that flavour (so the
 *    pile can still be finished later), a move that empties the giving plate,
 *    the purer receiver, and a receiver that is not the cake just placed.
 *
 * 5. A plate that holds `capacity` slices of a single flavour is served straight
 *    away and becomes empty.
 *
 * 6. Every move strictly increases the sum of squared pile sizes, which is
 *    bounded, so the cascade always terminates.
 *
 * 7. The helper picks the plate whose largest group is biggest, turns the whole
 *    plate into that flavour, and serves it. It runs automatically when the
 *    number of empty plates drops to the level's threshold, or when summoned.
 */
import type {
  Board,
  Cake,
  Cell,
  Flavor,
  LevelConfig,
  SliceGroup,
  Step,
  TurnResult,
} from "./types.ts";

let cakeCounter = 0;
// Ids carry a random tail so cakes restored from a save never clash with new ones.
const cakeSalt = Math.random().toString(36).slice(2, 7);
export function makeCake(groups: SliceGroup[], id?: string): Cake {
  cakeCounter += 1;
  return { id: id ?? `cake-${cakeSalt}-${cakeCounter}`, groups: groups.map(g => ({ ...g })) };
}

// ---------------------------------------------------------------------------
// Cake helpers
// ---------------------------------------------------------------------------

export function cakeSlices(cake: Cake | null): number {
  if (!cake) return 0;
  let n = 0;
  for (const g of cake.groups) n += g.count;
  return n;
}

export function cakeCount(cake: Cake | null, flavor: Flavor): number {
  if (!cake) return 0;
  for (const g of cake.groups) if (g.flavor === flavor) return g.count;
  return 0;
}

export function cakeFree(cake: Cake | null, capacity: number): number {
  return capacity - cakeSlices(cake);
}

export function isFinishedCake(cake: Cake | null, capacity: number): boolean {
  return cake !== null && cake.groups.length === 1 && cake.groups[0].count === capacity;
}

export function largestGroup(cake: Cake): SliceGroup {
  let best = cake.groups[0];
  for (const g of cake.groups) if (g.count > best.count) best = g;
  return best;
}

function withAdded(cake: Cake, flavor: Flavor, n: number): Cake {
  const groups = cake.groups.map(g => ({ ...g }));
  const existing = groups.find(g => g.flavor === flavor);
  if (existing) existing.count += n;
  else groups.push({ flavor, count: n });
  return { id: cake.id, groups };
}

function withRemoved(cake: Cake, flavor: Flavor, n: number): Cake | null {
  const groups = cake.groups
    .map(g => (g.flavor === flavor ? { ...g, count: g.count - n } : { ...g }))
    .filter(g => g.count > 0);
  if (groups.length === 0) return null;
  return { id: cake.id, groups };
}

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

export function emptyBoard(rows: number, cols: number, capacity: number): Board {
  return { rows, cols, capacity, cells: Array.from({ length: rows * cols }, () => null) };
}

function setCell(board: Board, index: number, cell: Cell): Board {
  const cells = board.cells.slice();
  cells[index] = cell;
  return { ...board, cells };
}

/** Orthogonal neighbours in a fixed order: up, right, down, left. */
export function neighborsOf(board: Board, index: number): number[] {
  const r = Math.floor(index / board.cols);
  const c = index % board.cols;
  const out: number[] = [];
  if (r > 0) out.push(index - board.cols);
  if (c < board.cols - 1) out.push(index + 1);
  if (r < board.rows - 1) out.push(index + board.cols);
  if (c > 0) out.push(index - 1);
  return out;
}

export function emptyCells(board: Board): number[] {
  const out: number[] = [];
  board.cells.forEach((cell, i) => {
    if (cell === null) out.push(i);
  });
  return out;
}

export function flavorsOnBoard(board: Board): Map<Flavor, number> {
  const totals = new Map<Flavor, number>();
  for (const cell of board.cells) {
    if (!cell) continue;
    for (const g of cell.groups) totals.set(g.flavor, (totals.get(g.flavor) ?? 0) + g.count);
  }
  return totals;
}

/** Sum of squared group sizes. Every transfer strictly increases this. */
export function consolidationScore(board: Board): number {
  let s = 0;
  for (const cell of board.cells) {
    if (!cell) continue;
    for (const g of cell.groups) s += g.count * g.count;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export interface Transfer {
  from: number;
  to: number;
  flavor: Flavor;
  count: number;
  score: number;
}

function evaluateTransfer(
  board: Board,
  from: number,
  to: number,
  flavor: Flavor,
  placedIndex: number,
): Transfer | null {
  const giver = board.cells[from];
  const receiver = board.cells[to];
  if (!giver || !receiver) return null;

  const cg = cakeCount(giver, flavor);
  const cr = cakeCount(receiver, flavor);
  if (cg === 0 || cr === 0) return null;

  const free = cakeFree(receiver, board.capacity);
  if (free === 0) return null;

  let count: number;
  if (cr >= cg) {
    // Towards the bigger (or equal) pile: partial moves allowed.
    count = Math.min(cg, free);
  } else {
    // Bigger pile only moves as a whole. It never splits.
    count = cg <= free ? cg : 0;
  }
  if (count === 0) return null;

  const receiverPure = receiver.groups.length === 1;
  const finishes = receiverPure && cr + count === board.capacity;
  const gain = (cr + count) ** 2 + (cg - count) ** 2 - cr ** 2 - cg ** 2;
  const emptiesGiver = cg === count && giver.groups.length === 1;
  const purity = cr / cakeSlices(receiver);

  const score =
    (finishes ? 10000 : 0) +
    gain * 10 +
    (receiverPure ? 8 : 0) +
    (emptiesGiver ? 5 : 0) +
    purity * 2 +
    (to !== placedIndex ? 1 : 0) +
    count * 0.01;

  return { from, to, flavor, count, score };
}

/** Every legal transfer on the board right now. */
export function transferCandidates(board: Board, placedIndex = -1): Transfer[] {
  const out: Transfer[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    const a = board.cells[i];
    if (!a) continue;
    for (const j of neighborsOf(board, i)) {
      if (j < i) continue; // each pair once
      const b = board.cells[j];
      if (!b) continue;
      for (const g of a.groups) {
        if (cakeCount(b, g.flavor) === 0) continue;
        const ab = evaluateTransfer(board, i, j, g.flavor, placedIndex);
        const ba = evaluateTransfer(board, j, i, g.flavor, placedIndex);
        if (ab) out.push(ab);
        if (ba) out.push(ba);
      }
    }
  }
  return out;
}

function pickBest(candidates: Transfer[]): Transfer {
  let best = candidates[0];
  for (const t of candidates) {
    if (
      t.score > best.score ||
      (t.score === best.score && (t.from < best.from || (t.from === best.from && t.to < best.to)))
    ) {
      best = t;
    }
  }
  return best;
}

/** The board with `count` slices of `flavor` lifted off plate `index` (used mid-animation). */
export function removeSlices(board: Board, index: number, flavor: Flavor, count: number): Board {
  const cell = board.cells[index];
  if (!cell) return board;
  return setCell(board, index, withRemoved(cell, flavor, count));
}

export function applyTransfer(board: Board, t: Transfer): Board {
  const giver = board.cells[t.from];
  const receiver = board.cells[t.to];
  if (!giver || !receiver) throw new Error("applyTransfer on empty plate");
  let next = setCell(board, t.from, withRemoved(giver, t.flavor, t.count));
  next = setCell(next, t.to, withAdded(receiver, t.flavor, t.count));
  return next;
}

/** Serve any finished cake at `index`; appends a serve step if it did. */
function serveIfFinished(board: Board, index: number, steps: Step[]): Board {
  const cell = board.cells[index];
  if (!isFinishedCake(cell, board.capacity)) return board;
  const next = setCell(board, index, null);
  steps.push({ event: { type: "serve", index, flavor: cell!.groups[0].flavor }, board: next });
  return next;
}

const MAX_CASCADE = 1000;

/**
 * Run transfers until nothing can move, serving finished cakes along the way.
 * Returns the settled board; the steps taken are appended to `steps`.
 */
export function settle(board: Board, steps: Step[], placedIndex = -1): Board {
  let current = board;
  for (let guard = 0; guard < MAX_CASCADE; guard++) {
    const candidates = transferCandidates(current, placedIndex);
    if (candidates.length === 0) return current;
    const best = pickBest(candidates);
    current = applyTransfer(current, best);
    steps.push({
      event: { type: "move", from: best.from, to: best.to, flavor: best.flavor, count: best.count },
      board: current,
    });
    current = serveIfFinished(current, best.to, steps);
  }
  throw new Error("settle did not terminate");
}

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

export function placeCake(board: Board, index: number, cake: Cake): { steps: Step[]; board: Board } {
  if (index < 0 || index >= board.cells.length) throw new Error(`bad index ${index}`);
  if (board.cells[index] !== null) throw new Error(`plate ${index} is not empty`);
  if (cakeSlices(cake) > board.capacity) throw new Error("cake does not fit on a plate");

  const steps: Step[] = [];
  let current = setCell(board, index, cake);
  steps.push({ event: { type: "place", index, cake }, board: current });
  current = serveIfFinished(current, index, steps);
  current = settle(current, steps, index);
  return { steps, board: current };
}

/** The plate the helper will finish: biggest single-flavour group wins. */
export function chooseHelperTarget(board: Board): number | null {
  let bestIndex: number | null = null;
  let bestGroup = 0;
  let bestSlices = 0;
  board.cells.forEach((cell, i) => {
    if (!cell) return;
    const g = largestGroup(cell).count;
    const s = cakeSlices(cell);
    if (g > bestGroup || (g === bestGroup && s > bestSlices)) {
      bestIndex = i;
      bestGroup = g;
      bestSlices = s;
    }
  });
  return bestIndex;
}

/** Chef Bear finishes one cake. No-op on an empty board. */
export function helperRescue(board: Board): { steps: Step[]; board: Board } {
  const index = chooseHelperTarget(board);
  if (index === null) return { steps: [], board };
  const cell = board.cells[index]!;
  const flavor = largestGroup(cell).flavor;
  const finished: Cake = { id: cell.id, groups: [{ flavor, count: board.capacity }] };
  const steps: Step[] = [];
  let current = setCell(board, index, finished);
  steps.push({ event: { type: "helper", index, flavor }, board: current });
  current = serveIfFinished(current, index, steps);
  return { steps, board: current };
}

export interface TurnOptions {
  autoHelper: boolean;
  helperThreshold: number;
}

/** A full player turn: place, cascade, and let the helper in if the board is nearly full. */
export function playTurn(board: Board, index: number, cake: Cake, opts: TurnOptions): TurnResult {
  const placed = placeCake(board, index, cake);
  const steps = placed.steps.slice();
  let current = placed.board;
  let helperUsed = false;

  if (opts.autoHelper && emptyCells(current).length <= opts.helperThreshold) {
    const rescue = helperRescue(current);
    if (rescue.steps.length > 0) {
      helperUsed = true;
      steps.push(...rescue.steps);
      current = rescue.board;
    }
  }

  return { steps, board: current, served: countServed(steps), helperUsed };
}

export function countServed(steps: Step[]): number {
  return steps.filter(s => s.event.type === "serve").length;
}

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------

/**
 * The empty plate where `cake` would do the most good, or null when no spot
 * causes any slices to move. Serving beats moving; more slices moved beats fewer.
 */
export function bestSpot(board: Board, cake: Cake): number | null {
  let best: number | null = null;
  let bestScore = 0;
  for (const index of emptyCells(board)) {
    const { steps } = placeCake(board, index, cake);
    let score = 0;
    for (const s of steps) {
      if (s.event.type === "serve") score += 100;
      if (s.event.type === "move") score += s.event.count;
    }
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Cake generator
// ---------------------------------------------------------------------------

export type Rand = () => number;

function randInt(rand: Rand, lo: number, hi: number): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

function pickWeighted<T>(rand: Rand, items: T[], weights: number[]): T {
  let total = 0;
  for (const w of weights) total += w;
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * A new tray cake. Flavour count leans towards fewer flavours; with probability
 * `kindness` each flavour is drawn from what is already on the board, weighted
 * by how many slices of it are there, so merges keep happening.
 */
export function generateCake(level: LevelConfig, board: Board, rand: Rand = Math.random): Cake {
  const maxSlices = Math.min(level.maxSlices, level.capacity - 1);
  const minSlices = Math.max(1, Math.min(level.minSlices, maxSlices));
  const slices = randInt(rand, minSlices, maxSlices);

  const maxFlavors = Math.max(1, Math.min(level.maxFlavorsPerCake, slices, level.flavors.length));
  const flavorCountChoices = Array.from({ length: maxFlavors }, (_, i) => i + 1);
  const flavorCountWeights = flavorCountChoices.map(k => 1 / k); // 1, 1/2, 1/3 ...
  const k = pickWeighted(rand, flavorCountChoices, flavorCountWeights);

  const onBoard = flavorsOnBoard(board);
  const chosen: Flavor[] = [];
  for (let i = 0; i < k; i++) {
    const boardPool = [...onBoard.entries()].filter(([f]) => !chosen.includes(f));
    const levelPool = level.flavors.filter(f => !chosen.includes(f));
    if (boardPool.length > 0 && rand() < level.kindness) {
      chosen.push(pickWeighted(rand, boardPool.map(([f]) => f), boardPool.map(([, n]) => n)));
    } else {
      chosen.push(levelPool[randInt(rand, 0, levelPool.length - 1)]);
    }
  }

  // Split `slices` into k positive parts.
  const counts = new Array<number>(k).fill(1);
  for (let i = k; i < slices; i++) counts[randInt(rand, 0, k - 1)] += 1;

  return makeCake(chosen.map((flavor, i) => ({ flavor, count: counts[i] })));
}
