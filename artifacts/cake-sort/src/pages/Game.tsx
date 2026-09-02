import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BoardView, cellCenter } from "@/components/Board";
import type { Anim } from "@/components/Board";
import { Tray } from "@/components/Tray";
import { CakeView } from "@/components/CakeView";
import { LevelComplete } from "@/components/LevelComplete";
import { BoardFull } from "@/components/BoardFull";
import { RewardPopup } from "@/components/RewardPopup";
import { RewardBar } from "@/components/RewardBar";
import { LEVELS } from "@/game/levels";
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
  onNextLevel: (levelId: number) => void;
  onLevelComplete: (levelId: number) => void;
}

const TRAY_SIZE = 3;
const GAP = 10;
const BELL_COOLDOWN_TURNS = 3;
const TAP_SLOP = 10;

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

function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function buildLevel(base: LevelConfig, shelf: Flavor[]): LevelConfig {
  const count = Math.max(2, Math.min(base.flavorCount, shelf.length));
  return { ...base, flavors: shelf.slice(0, count) };
}

export function GamePage({
  levelId, autoHelper, shelf, themeId, totalServed, onCakeServed, onMenu, onNextLevel, onLevelComplete,
}: GamePageProps) {
  const level = useMemo(() => buildLevel(LEVELS.find(l => l.id === levelId) ?? LEVELS[0], shelf), [levelId, shelf]);
  const theme = THEMES[themeId];

  // The settled board is the truth; `board` is what is on screen during animations.
  const logicRef = useRef<Board>(emptyBoard(level.rows, level.cols, level.capacity));
  const [board, setBoard] = useState<Board>(logicRef.current);
  const [tray, setTray] = useState<Cake[]>(() =>
    Array.from({ length: TRAY_SIZE }, () => generateCake(level, logicRef.current)),
  );
  const [selected, setSelected] = useState(0);
  const [served, setServed] = useState(0);
  const servedRef = useRef(0);
  const totalRef = useRef(totalServed);
  const [helperUses, setHelperUses] = useState(0);
  const [turns, setTurns] = useState(0);
  const [bellReadyAt, setBellReadyAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [nopeIndex, setNopeIndex] = useState<number | null>(null);
  const [poppedIndex, setPoppedIndex] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [boardFull, setBoardFull] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);
  // Drag coordinates live in a ref and move the ghost cake directly; React only
  // re-renders when the drop target changes, which keeps dragging smooth.
  const [drag, setDrag] = useState<DragView | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState(96);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);
  const animKey = useRef(0);

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
      const w = el.clientWidth - 24;
      const h = el.clientHeight - 24;
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

  // -------------------------------------------------------------------------
  // Animation playback
  // -------------------------------------------------------------------------

  const runSteps = useCallback(
    async (steps: Step[], before: Board) => {
      setBusy(true);
      let prev = before;
      for (const step of steps) {
        if (!aliveRef.current) return;
        const key = ++animKey.current;
        const e = step.event;
        if (e.type === "place") {
          setBoard(step.board);
          setPoppedIndex(e.index);
          sounds.playPlace();
          await wait(230);
          setPoppedIndex(null);
        } else if (e.type === "move") {
          setBoard(removeSlices(prev, e.from, e.flavor, e.count));
          setAnim({ type: "move", key, from: e.from, to: e.to, flavor: e.flavor, count: e.count });
          sounds.playSlide();
          await wait(350);
          setAnim(null);
          setBoard(step.board);
          await wait(70);
        } else if (e.type === "serve") {
          setAnim({ type: "serve", key, index: e.index });
          sounds.playServe();
          await wait(540);
          setAnim(null);
          setBoard(step.board);
          servedRef.current += 1;
          totalRef.current += 1;
          setServed(servedRef.current);
          onCakeServed();
          await wait(80);
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
      if (aliveRef.current) setBusy(false);
    },
    [sounds, onCakeServed],
  );

  const afterTurn = useCallback(
    (totalBefore: number) => {
      if (!aliveRef.current) return;
      const crossed = rewardsBetween(totalBefore, totalRef.current);
      if (crossed.length > 0) setPendingRewards(crossed);
      if (servedRef.current >= level.goal) {
        onLevelComplete(levelId);
        sounds.playComplete();
        setTimeout(() => aliveRef.current && setShowComplete(true), 350);
        return;
      }
      if (!autoHelper && emptyCells(logicRef.current).length === 0) {
        setBoardFull(true);
      }
    },
    [level.goal, levelId, onLevelComplete, sounds, autoHelper],
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

  const place = useCallback(
    (trayIndex: number, index: number) => {
      if (busy || showComplete || boardFull || pendingRewards.length > 0) return;
      const logic = logicRef.current;
      const cake = tray[trayIndex];
      if (!cake) return;
      if (logic.cells[index] !== null) {
        nope(index);
        return;
      }
      const result = playTurn(logic, index, cake, { autoHelper, helperThreshold: level.helperThreshold });
      logicRef.current = result.board;
      if (result.helperUsed) setHelperUses(h => h + 1);
      setTray(prev => {
        const next = prev.slice();
        next[trayIndex] = generateCake(level, result.board);
        return next;
      });
      setTurns(t => t + 1);
      const totalBefore = totalRef.current;
      void runSteps(result.steps, logic).then(() => afterTurn(totalBefore));
    },
    [busy, showComplete, boardFull, pendingRewards.length, tray, autoHelper, level, nope, runSteps, afterTurn],
  );

  const bellReady = !busy && turns >= bellReadyAt && emptyCells(logicRef.current).length < logicRef.current.cells.length;

  const callHelper = useCallback(() => {
    if (!bellReady || showComplete || pendingRewards.length > 0) return;
    const logic = logicRef.current;
    const result = helperRescue(logic);
    if (result.steps.length === 0) return;
    logicRef.current = result.board;
    setHelperUses(h => h + 1);
    setBellReadyAt(turns + BELL_COOLDOWN_TURNS);
    setBoardFull(false);
    const totalBefore = totalRef.current;
    void runSteps(result.steps, logic).then(() => afterTurn(totalBefore));
  }, [bellReady, showComplete, pendingRewards.length, turns, runSteps, afterTurn]);

  const handlePlateTap = useCallback(
    (index: number) => {
      if (drag) return;
      place(selected, index);
    },
    [drag, place, selected],
  );

  const handleRetry = useCallback(() => onNextLevel(levelId), [onNextLevel, levelId]);
  const handleNext = useCallback(() => {
    const nextId = levelId + 1;
    onNextLevel(nextId <= LEVELS.length ? nextId : levelId);
  }, [levelId, onNextLevel]);

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
  // Dragging cakes out of the tray
  // -------------------------------------------------------------------------

  const ghostSize = cellSize;

  const ghostTransform = useCallback(
    (x: number, y: number) => `translate(${x - ghostSize / 2}px, ${y - ghostSize * 0.95}px)`,
    [ghostSize],
  );

  const findTarget = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // Aim with the ghost cake's centre, which floats a little above the finger.
      const lx = clientX - rect.left;
      const ly = clientY - ghostSize * 0.45 - rect.top;
      const reach = cellSize * 0.85;
      let best: number | null = null;
      let bestDist = Infinity;
      for (const i of emptyCells(logicRef.current)) {
        const c = cellCenter(logicRef.current, i, cellSize, GAP);
        const d = Math.hypot(c.x - lx, c.y - ly);
        if (d < reach && d < bestDist) {
          best = i;
          bestDist = d;
        }
      }
      return best;
    },
    [cellSize, ghostSize],
  );

  const onTrayPointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLDivElement>) => {
      if (busy) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelected(index);
      dragRef.current = { trayIndex: index, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false, target: null };
      setDrag({ trayIndex: index, moved: false, target: null });
    },
    [busy],
  );

  const onTrayPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      d.x = e.clientX;
      d.y = e.clientY;
      const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > TAP_SLOP;
      const target = moved ? findTarget(e.clientX, e.clientY) : null;
      const changed = moved !== d.moved || target !== d.target;
      d.moved = moved;
      d.target = target;
      if (ghostRef.current) ghostRef.current.style.transform = ghostTransform(d.x, d.y);
      if (changed) setDrag({ trayIndex: d.trayIndex, moved, target });
    },
    [findTarget, ghostTransform],
  );

  const onTrayPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d && d.moved && d.target !== null) place(d.trayIndex, d.target);
    },
    [place],
  );

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const hintIndex = useMemo(() => {
    if (busy || showComplete) return null;
    const cake = tray[selected];
    return cake ? bestSpot(logicRef.current, cake) : null;
    // board is in the deps so the hint refreshes once an animation settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, showComplete, tray, selected, board]);

  const goalIcons = Array.from({ length: level.goal }, (_, i) => i < served);

  return (
    <div className={`screen game-bg ${theme.bg}`}>
      {/* Header */}
      <div className="safe-top px-3 pb-1 flex items-center gap-2">
        <button
          onClick={onMenu}
          className="game-btn candy w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl font-black text-gray-700 shrink-0"
          aria-label="Back to levels"
        >
          ←
        </button>

        <div
          className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden whitespace-nowrap"
          aria-label={`${served} of ${level.goal} cakes served`}
        >
          <span className="text-3xl mr-1 shrink-0" role="img" aria-hidden="true">
            {level.emoji}
          </span>
          {goalIcons.map((done, i) => (
            <span
              key={i}
              className="shrink-0 transition-transform"
              style={{
                fontSize: level.goal > 8 ? 22 : 28,
                opacity: done ? 1 : 0.28,
                filter: done ? "none" : "grayscale(1)",
                transform: done ? "scale(1.05)" : "scale(0.9)",
              }}
              role="img"
              aria-hidden="true"
            >
              🎂
            </span>
          ))}
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
        <div className="board-cloth rounded-3xl p-4" style={{ ["--cloth" as string]: theme.cloth }}>
          <BoardView
            board={board}
            cellSize={cellSize}
            gap={GAP}
            targetIndex={drag?.target ?? null}
            hintIndex={hintIndex}
            nopeIndex={nopeIndex}
            poppedIndex={poppedIndex}
            anim={anim}
            onPlateTap={handlePlateTap}
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
            disabled={busy}
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

      {pendingRewards.length > 0 && (
        <RewardPopup
          reward={pendingRewards[0]}
          onClose={() => setPendingRewards(prev => prev.slice(1))}
        />
      )}

      {boardFull && !showComplete && pendingRewards.length === 0 && (
        <BoardFull onCallHelper={callHelper} onRetry={handleRetry} />
      )}

      {showComplete && pendingRewards.length === 0 && (
        <LevelComplete
          levelId={levelId}
          totalLevels={LEVELS.length}
          helperUses={helperUses}
          onNextLevel={handleNext}
          onRetry={handleRetry}
          onMenu={onMenu}
        />
      )}
    </div>
  );
}
