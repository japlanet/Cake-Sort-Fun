import { useCallback, useEffect, useRef, useState } from "react";
import type { Anim } from "@/components/Board";
import { removeSlices } from "@/game/engine";
import type { Board, Step } from "@/game/types";
import { audio } from "@/audio/engine";

export interface Turn {
  steps: Step[];
  /** The settled board before this turn; animations start from it. */
  before: Board;
  /** Lifetime cakes served before this turn, for reward checks afterwards. */
  totalBefore: number;
}

interface Options {
  initialBoard: Board;
  /** A cake was served on screen. */
  onServed: () => void;
  /** A whole turn's animation has finished. */
  onTurnDone: (totalBefore: number) => void;
}

function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/**
 * Plays turns back one step at a time. The displayed board lags the settled
 * one while slices fly; turns queue up so the child can keep placing cakes
 * while earlier ones animate.
 */
export function useTurnQueue({ initialBoard, onServed, onTurnDone }: Options) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [poppedIndex, setPoppedIndex] = useState<number | null>(null);
  const aliveRef = useRef(true);
  const animKey = useRef(0);
  const queueRef = useRef<Turn[]>([]);
  const drainingRef = useRef(false);
  const callbacks = useRef({ onServed, onTurnDone });
  callbacks.current = { onServed, onTurnDone };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const playSteps = useCallback(async (steps: Step[], before: Board) => {
    let prev = before;
    for (const step of steps) {
      if (!aliveRef.current) return;
      const key = ++animKey.current;
      const e = step.event;
      if (e.type === "place") {
        setBoard(step.board);
        setPoppedIndex(e.index);
        audio.playPlace();
        await wait(200);
        setPoppedIndex(null);
      } else if (e.type === "move") {
        setBoard(removeSlices(prev, e.from, e.flavor, e.count));
        setAnim({ type: "move", key, from: e.from, to: e.to, flavor: e.flavor, count: e.count });
        audio.playSlide();
        await wait(340);
        setAnim(null);
        setBoard(step.board);
        await wait(50);
      } else if (e.type === "serve") {
        setAnim({ type: "serve", key, index: e.index });
        audio.playServe();
        await wait(520);
        setAnim(null);
        setBoard(step.board);
        callbacks.current.onServed();
        await wait(60);
      } else if (e.type === "helper") {
        setAnim({ type: "helper", key, index: e.index, phase: "arrive" });
        audio.playHelper();
        await wait(650);
        setBoard(step.board);
        setAnim({ type: "helper", key, index: e.index, phase: "done" });
        await wait(600);
        setAnim(null);
      }
      prev = step.board;
    }
  }, []);

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    while (queueRef.current.length > 0 && aliveRef.current) {
      const turn = queueRef.current.shift()!;
      await playSteps(turn.steps, turn.before);
      if (aliveRef.current) callbacks.current.onTurnDone(turn.totalBefore);
    }
    drainingRef.current = false;
  }, [playSteps]);

  const enqueue = useCallback(
    (turn: Turn) => {
      queueRef.current.push(turn);
      void drain();
    },
    [drain],
  );

  return { board, anim, poppedIndex, enqueue, aliveRef };
}
