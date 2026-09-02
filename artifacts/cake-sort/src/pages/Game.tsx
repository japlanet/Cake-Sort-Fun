import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BoardView, cellCenter } from "@/components/Board";
import type { Anim } from "@/components/Board";
import { Tray } from "@/components/Tray";
import { CakeView } from "@/components/CakeView";
import { Confetti } from "@/components/Confetti";
import { BoardFull } from "@/components/BoardFull";
import { RewardPopup } from "@/components/RewardPopup";
import { RewardBar } from "@/components/RewardBar";
import { CELEBRATE_EVERY, LEVELS } from "@/game/levels";
import { THEMES } from "@/game/themes";
import type { ThemeId } from "@/game/themes";
import { rewardsBetween } from "@/game/rewards";
import type { Reward } from "@/game/rewards";
import { bestSpot, emptyBoard, emptyCells, generateCake, helperRescue, playTurn, removeSlices } from "@/game/engine";
import type { Board, Cake, Flavor, LevelConfig, Step } from "@/game/types";
import { useGameSounds } from "@/hooks/useGameSounds";

interface GamePageProps {
  levelId: number;
  autoHelper: boolean;
  shelf: Flavor[];
  themeId: ThemeId;
  totalServed: number;
  onCakeServed: () => void;
  onMenu: () => void;
  onRestart: () => void;
}

const TRAY_SIZE = 3;
const GAP = 10;
const BELL_COOLDOWN_TURNS = 3;
const TAP_SLOP = 10;
/** The dragged cake sits this far above the finger (fraction of its size) so it stays visible. */
const GHOST_LIFT = 0.3;

interface Drag {
  trayIndex: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  target: number | null;
}

/** The part of a drag React needs to render; coordinates stay in a ref. */
interface DragView {
  trayIndex: number;
  moved: boolean;
  target: number | null;
}

interface Turn {
  steps: Step[];
  before: Board;
  totalBefore: number;
}

function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function buildLevel(base: LevelConfig, shelf: Flavor[]): LevelConfig {
  const count = Math.max(2, Math.min(base.flavorCount, shelf.length));
  return { ...base, flavors: shelf.slice(0, count) };
}

export function GamePage({
  levelId, autoHelper, shelf, themeId, totalServed, onCakeServed, onMenu, onRestart,
}: GamePageProps) {
  const level = useMemo(() => buildLevel(LEVELS.find(l => l.id === levelId) ?? LEVELS[0], shelf), [levelId, shelf]);
  const theme = THEMES[themeId];

  // The settled board is the truth; `board` is what is on screen while animations catch up.
  const logicRef = useRef<Board>(emptyBoard(level.rows, level.cols, level.capacity));
  const [board, setBoard] = useState<Board>(logicRef.current);
  const [tray, setTray] = useState<Cake[]>(() =>
    Array.from({ length: TRAY_SIZE }, () => generateCake(level, logicRef.current)),
  );
  const [selected, setSelected] = useState(0);
  const [served, setServed] = useState(0);
  const servedRef = useRef(0);
  const totalRef = useRef(totalServed);
  const [turns, setTurns] = useState(0);
  const [bellReadyAt, setBellReadyAt] = useState(0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [nopeIndex, setNopeIndex] = useState<number | null>(null);
  const [poppedIndex, setPoppedIndex] = useState<number | null>(null);
  const [boardFull, setBoardFull] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [cellSize, setCellSize] = useState(96);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);
  const animKey = useRef(0);

  // Drag coordinates live in a ref and move the ghost cake directly; React only
  // re-renders when the drop target changes, which keeps dragging smooth.
  const [drag, setDrag] = useState<DragView | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  // Turns queue up so the child can keep placing cakes while earlier ones animate.
  const queueRef = useRef<Turn[]>([]);
  const drainingRef = useRef(false);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("cake-sort-sound") !== "false";
    } catch {
      return true;
    }
  });
  const sounds = useGameSounds(soundEnabled);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Fit the board to the space between header and tray.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 40;
      const h = el.clientHeight - 40;
      const byWidth = (w - (level.cols - 1) * GAP) / level.cols;
      const byHeight = (h - (level.rows - 1) * GAP) / level.rows;
      setCellSize(Math.max(56, Math.min(150, Math.floor(Math.min(byWidth, byHeight)))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [level.rows, level.cols]);

  const traySize = Math.round(Math.min(cellSize * 0.95, 120));
  const ghostSize = Math.round(cellSize * 1.1);

  // -------------------------------------------------------------------------
  // Animation playback
  // -------------------------------------------------------------------------

  const playSteps = useCallback(
    async (steps: Step[], before: Board) => {
      let prev = before;
      for (const step of steps) {
        if (!aliveRef.current) return;
        const key = ++animKey.current;
        const e = step.event;
        if (e.type === "place") {
          setBoard(step.board);
          setPoppedIndex(e.index);
          sounds.playPlace();
          await wait(200);
          setPoppedIndex(null);
        } else if (e.type === "move") {
          setBoard(removeSlices(prev, e.from, e.flavor, e.count));
          setAnim({ type: "move", key, from: e.from, to: e.to, flavor: e.flavor, count: e.count });
          sounds.playSlide();
          await wait(340);
          setAnim(null);
          setBoard(step.board);
          await wait(50);
        } else if (e.type === "serve") {
          setAnim({ type: "serve", key, index: e.index });
          sounds.playServe();
          await wait(520);
          setAnim(null);
          setBoard(step.board);
          servedRef.current += 1;
          totalRef.current += 1;
          setServed(servedRef.current);
          onCakeServed();
          if (servedRef.current % CELEBRATE_EVERY === 0) {
            sounds.playComplete();
            setCelebrating(true);
            setTimeout(() => aliveRef.current && setCelebrating(false), 3500);
          }
          await wait(60);
        } else if (e.type === "helper") {
          setAnim({ type: "helper", key, index: e.index, phase: "arrive" });
          sounds.playHelper();
          await wait(650);
          setBoard(step.board);
          setAnim({ type: "helper", key, index: e.index, phase: "done" });
          await wait(600);
          setAnim(null);
        }
        prev = step.board;
      }
    },
    [sounds, onCakeServed],
  );

  const afterTurn = useCallback(
    (totalBefore: number) => {
      if (!aliveRef.current) return;
      const crossed = rewardsBetween(totalBefore, totalRef.current);
      if (crossed.length > 0) setPendingRewards(prev => [...prev, ...crossed]);
      if (!autoHelper && emptyCells(logicRef.current).length === 0) setBoardFull(true);
    },
    [autoHelper],
  );

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    while (queueRef.current.length > 0 && aliveRef.current) {
      const turn = queueRef.current.shift()!;
      await playSteps(turn.steps, turn.before);
      afterTurn(turn.totalBefore);
    }
    drainingRef.current = false;
  }, [playSteps, afterTurn]);

  const enqueue = useCallback(
    (turn: Turn) => {
      queueRef.current.push(turn);
      void drain();
    },
    [drain],
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const nope = useCallback(
    (index: number) => {
      sounds.playNope();
      setNopeIndex(index);
      setTimeout(() => aliveRef.current && setNopeIndex(null), 450);
    },
    [sounds],
  );

  const inputLocked = boardFull || pendingRewards.length > 0;

  const place = useCallback(
    (trayIndex: number, index: number) => {
      if (inputLocked) return;
      const logic = logicRef.current;
      const cake = tray[trayIndex];
      if (!cake) return;
      if (logic.cells[index] !== null) {
        nope(index);
        return;
      }
      const result = playTurn(logic, index, cake, { autoHelper, helperThreshold: level.helperThreshold });
      logicRef.current = result.board;
      setTray(prev => {
        const next = prev.slice();
        next[trayIndex] = generateCake(level, result.board);
        return next;
      });
      setTurns(t => t + 1);
      enqueue({ steps: result.steps, before: logic, totalBefore: totalRef.current });
    },
    [inputLocked, tray, autoHelper, level, nope, enqueue],
  );

  const bellReady = turns >= bellReadyAt && emptyCells(logicRef.current).length < logicRef.current.cells.length;

  const callHelper = useCallback(() => {
    if (!bellReady || pendingRewards.length > 0) return;
    const logic = logicRef.current;
    const result = helperRescue(logic);
    if (result.steps.length === 0) return;
    logicRef.current = result.board;
    setBellReadyAt(turns + BELL_COOLDOWN_TURNS);
    setBoardFull(false);
    enqueue({ steps: result.steps, before: logic, totalBefore: totalRef.current });
  }, [bellReady, pendingRewards.length, turns, enqueue]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem("cake-sort-sound", String(next));
      } catch {}
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Aiming: any point maps to the nearest plate
  // -------------------------------------------------------------------------

  /** Board-local coordinates of a viewport point, and whether it is over the board (with a generous margin). */
  const toBoard = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; over: boolean } | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const margin = cellSize * 0.6;
      const over =
        clientX >= rect.left - margin &&
        clientX <= rect.right + margin &&
        clientY >= rect.top - margin &&
        clientY <= rect.bottom + margin;
      return { x: clientX - rect.left, y: clientY - rect.top, over };
    },
    [cellSize],
  );

  /** Nearest plate to a board-local point within `reach`; `emptyOnly` skips full plates. */
  const nearestPlate = useCallback(
    (pt: { x: number; y: number }, reach: number, emptyOnly: boolean): number | null => {
      const logic = logicRef.current;
      let best: number | null = null;
      let bestDist = Infinity;
      logic.cells.forEach((cell, i) => {
        if (emptyOnly && cell !== null) return;
        const c = cellCenter(logic, i, cellSize, GAP);
        const d = Math.hypot(c.x - pt.x, c.y - pt.y);
        if (d < reach && d < bestDist) {
          best = i;
          bestDist = d;
        }
      });
      return best;
    },
    [cellSize],
  );

  /** A tap anywhere on the cloth snaps to the closest empty plate, however far away it is. */
  const handleBoardTap = useCallback(
    (clientX: number, clientY: number) => {
      const pt = toBoard(clientX, clientY);
      if (!pt) return;
      const empty = nearestPlate(pt, Infinity, true);
      if (empty !== null) {
        place(selected, empty);
        return;
      }
      const any = nearestPlate(pt, Infinity, false);
      if (any !== null) nope(any);
    },
    [toBoard, nearestPlate, place, selected, nope],
  );

  const boardPointerDown = useRef<{ x: number; y: number } | null>(null);
  const onBoardPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    boardPointerDown.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onBoardPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = boardPointerDown.current;
      boardPointerDown.current = null;
      if (dragRef.current) return; // a tray drag ending over the board is handled by the tray
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP * 3) return;
      handleBoardTap(e.clientX, e.clientY);
    },
    [handleBoardTap],
  );

  // -------------------------------------------------------------------------
  // Dragging cakes out of the tray
  // -------------------------------------------------------------------------

  const ghostTransform = useCallback(
    (x: number, y: number) => `translate(${x - ghostSize / 2}px, ${y - ghostSize / 2 - ghostSize * GHOST_LIFT}px)`,
    [ghostSize],
  );

  /** Where the ghost cake's centre is for a finger at (x, y). */
  const aimPoint = useCallback(
    (clientX: number, clientY: number) => toBoard(clientX, clientY - ghostSize * GHOST_LIFT),
    [toBoard, ghostSize],
  );

  /** Anywhere over the board counts: the cake goes to the nearest free plate. */
  const findDropTarget = useCallback(
    (clientX: number, clientY: number): number | null => {
      const pt = aimPoint(clientX, clientY);
      if (!pt || !pt.over) return null;
      return nearestPlate(pt, Infinity, true);
    },
    [aimPoint, nearestPlate],
  );

  const onTrayPointerDown = useCallback((index: number, e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setSelected(index);
    dragRef.current = { trayIndex: index, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false, target: null };
    setDrag({ trayIndex: index, moved: false, target: null });
  }, []);

  const onTrayPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      d.x = e.clientX;
      d.y = e.clientY;
      const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > TAP_SLOP;
      const target = moved ? findDropTarget(e.clientX, e.clientY) : null;
      const changed = moved !== d.moved || target !== d.target;
      d.moved = moved;
      d.target = target;
      if (ghostRef.current) ghostRef.current.style.transform = ghostTransform(d.x, d.y);
      if (changed) setDrag({ trayIndex: d.trayIndex, moved, target });
    },
    [findDropTarget, ghostTransform],
  );

  const onTrayPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d || !d.moved) return;
      const target = d.target ?? findDropTarget(e.clientX, e.clientY);
      if (target !== null) {
        place(d.trayIndex, target);
        return;
      }
      // Dropped over the board but no plate is free: wiggle the closest one.
      const pt = aimPoint(e.clientX, e.clientY);
      if (pt && pt.over) {
        const any = nearestPlate(pt, Infinity, false);
        if (any !== null) nope(any);
      }
    },
    [findDropTarget, place, aimPoint, nearestPlate, nope],
  );

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const hintIndex = useMemo(() => {
    if (inputLocked) return null;
    const cake = tray[selected];
    return cake ? bestSpot(logicRef.current, cake) : null;
    // `board` is in the deps so the hint refreshes as animations settle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputLocked, tray, selected, board]);

  return (
    <div className={`screen game-bg ${theme.bg}`}>
      {/* Header */}
      <div className="safe-top px-3 pb-1 flex items-center gap-2">
        <button
          onClick={onMenu}
          className="game-btn candy w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl font-black text-gray-700 shrink-0"
          aria-label="Back to the menu"
        >
          ←
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2" aria-label={`${served} cakes served`}>
          <span className="text-3xl shrink-0" role="img" aria-hidden="true">
            {level.emoji}
          </span>
          <div className="candy bg-white/90 rounded-2xl px-3 py-1 flex items-center gap-2">
            <span className="text-3xl" role="img" aria-hidden="true">
              🎂
            </span>
            <span className="text-3xl font-black text-pink-500 tabular-nums">{served}</span>
          </div>
        </div>

        <button
          onClick={handleToggleSound}
          className="game-btn candy w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl shrink-0"
          aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
        >
          <span role="img" aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
        </button>

        <button
          onClick={callHelper}
          disabled={!bellReady}
          className={`game-btn candy w-16 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${
            bellReady ? "bg-gradient-to-b from-amber-300 to-amber-400 candy-amber" : "bg-gray-200 opacity-60"
          }`}
          aria-label="Ring the bell for Chef Bear"
        >
          <span role="img" aria-hidden="true">🐻</span>
        </button>
      </div>

      {/* Progress to the next reward */}
      <div className="px-3 pb-1 max-w-xl w-full mx-auto">
        <RewardBar totalServed={totalRef.current} compact />
      </div>

      {/* Board */}
      <div ref={areaRef} className="flex-1 min-h-0 flex items-center justify-center px-3 py-2 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {theme.decor.map((d, i) => (
            <span
              key={i}
              className="decor absolute"
              style={{
                left: `${[4, 88, 6, 90, 2, 92][i % 6]}%`,
                top: `${[8, 14, 48, 52, 84, 82][i % 6]}%`,
                fontSize: 56 + (i % 3) * 12,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${5 + (i % 3)}s`,
              }}
            >
              {d}
            </span>
          ))}
        </div>
        <div
          className="board-cloth rounded-3xl p-4"
          style={{ ["--cloth" as string]: theme.cloth, touchAction: "none" }}
          onPointerDown={onBoardPointerDown}
          onPointerUp={onBoardPointerUp}
        >
          <BoardView
            board={board}
            cellSize={cellSize}
            gap={GAP}
            targetIndex={drag?.target ?? null}
            hintIndex={hintIndex}
            nopeIndex={nopeIndex}
            poppedIndex={poppedIndex}
            anim={anim}
            boardRef={boardRef}
          />
        </div>
      </div>

      {/* Tray */}
      <div className="safe-bottom px-3 pt-2">
        <div className="tray-wood rounded-3xl px-4 pt-4 pb-3 max-w-xl mx-auto">
          <Tray
            tray={tray}
            capacity={level.capacity}
            size={traySize}
            selected={selected}
            draggingIndex={drag?.moved ? drag.trayIndex : null}
            disabled={inputLocked}
            onPointerDown={onTrayPointerDown}
            onPointerMove={onTrayPointerMove}
            onPointerUp={onTrayPointerUp}
          />
        </div>
      </div>

      {/* Dragged cake */}
      {drag?.moved && tray[drag.trayIndex] && dragRef.current && (
        <div
          ref={ghostRef}
          className="drag-ghost"
          style={{ transform: ghostTransform(dragRef.current.x, dragRef.current.y), width: ghostSize, height: ghostSize }}
        >
          <CakeView cake={tray[drag.trayIndex]} capacity={level.capacity} size={ghostSize} />
        </div>
      )}

      {celebrating && <Confetti />}

      {pendingRewards.length > 0 && (
        <RewardPopup reward={pendingRewards[0]} onClose={() => setPendingRewards(prev => prev.slice(1))} />
      )}

      {boardFull && pendingRewards.length === 0 && <BoardFull onCallHelper={callHelper} onRetry={onRestart} />}
    </div>
  );
}
