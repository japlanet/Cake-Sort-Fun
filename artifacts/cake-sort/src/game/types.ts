export type Flavor =
  | "strawberry"
  | "chocolate"
  | "lemon"
  | "kiwi"
  | "blueberry"
  | "orange"
  | "rainbow"
  | "grape"
  | "cherry"
  | "peach"
  | "watermelon"
  | "cookie";

/** A run of same-flavour slices on a plate. Groups on a plate are contiguous and ordered. */
export interface SliceGroup {
  flavor: Flavor;
  count: number;
}

/** A cake sitting on a plate (or waiting in the tray). Never has zero slices. */
export interface Cake {
  id: string;
  groups: SliceGroup[];
}

export type Cell = Cake | null;

export interface Board {
  rows: number;
  cols: number;
  /** Slices a plate can hold. A plate full of one flavour is a finished cake. */
  capacity: number;
  /** Row-major, length rows * cols. `null` is an empty plate. */
  cells: Cell[];
}

export interface LevelConfig {
  id: number;
  name: string;
  emoji: string;
  rows: number;
  cols: number;
  capacity: number;
  /** Flavours in play. The game fills this from the player's shelf; tests set it directly. */
  flavors: Flavor[];
  /** How many of the shelf's flavours this level uses. */
  flavorCount: number;
  /** Most distinct flavours on one new cake from the tray. */
  maxFlavorsPerCake: number;
  /** Slices on a new cake, inclusive range. Never a full plate. */
  minSlices: number;
  maxSlices: number;
  /** 0..1 chance each flavour on a new cake is one already on the board. */
  kindness: number;
  /** Helper steps in when this many (or fewer) plates are empty after a move. */
  helperThreshold: number;
  bgColor: string;
}

export type StepEvent =
  | { type: "place"; index: number; cake: Cake }
  | { type: "move"; from: number; to: number; flavor: Flavor; count: number }
  | { type: "serve"; index: number; flavor: Flavor }
  | { type: "helper"; index: number; flavor: Flavor };

/** One animatable change and the board as it looks once that change is done. */
export interface Step {
  event: StepEvent;
  board: Board;
}

export interface TurnResult {
  steps: Step[];
  board: Board;
  /** Cakes served during this turn, helper-finished ones included. */
  served: number;
  helperUsed: boolean;
}
