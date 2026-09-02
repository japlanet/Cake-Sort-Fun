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
  const [drag, setDrag] = useState<Drag | null>(null);
  // Mirror of `drag` that is always current, so a fast flick still places the cake.
  const dragRef = useRef<Drag | null>(null);
  const updateDrag = useCallback((next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);
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
      updateDrag({ trayIndex: index, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false, target: null });
    },
    [busy, updateDrag],
  );

  const onTrayPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const prev = dragRef.current;
      if (!prev) return;
      const moved = prev.moved || Math.hypot(e.clientX - prev.startX, e.clientY - prev.startY) > TAP_SLOP;
      updateDrag({ ...prev, x: e.clientX, y: e.clientY, moved, target: moved ? findTarget(e.clientX, e.clientY) : null });
    },
    [findTarget, updateDrag],
  );

  const onTrayPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      const d = dragRef.current;
      updateDrag(null);
      if (d && d.moved && d.target !== null) place(d.trayIndex, d.target);
    },
    [place, updateDrag],
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
          className="game-btn w-14 h-14 rounded-2xl bg-white/80 shadow flex items-center justify-center text-3xl font-black border-b-4 border-gray-200 shrink-0"
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
          className="game-btn w-14 h-14 rounded-2xl bg-white/80 shadow flex items-center justify-center text-2xl border-b-4 border-gray-200 shrink-0"
          aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
        >
          <span role="img" aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
        </button>

        <button
          onClick={callHelper}
          disabled={!bellReady}
          className={`game-btn w-16 h-14 rounded-2xl shadow flex items-center justify-center text-3xl border-b-4 shrink-0 ${
            bellReady ? "bg-amber-300 border-amber-500" : "bg-gray-200 border-gray-300 opacity-60"
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
              className="absolute text-6xl opacity-15"
              style={{ left: `${10 + i * 35}%`, top: `${15 + (i % 2) * 55}%` }}
            >
              {d}
            </span>
          ))}
        </div>
        <div className={`${theme.panel} rounded-3xl p-3 shadow-inner backdrop-blur-sm`}>
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
        <div className={`${theme.panel} rounded-3xl px-4 pt-4 pb-3 shadow max-w-xl mx-auto`}>
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
      {drag?.moved && tray[drag.trayIndex] && (
        <div
          className="drag-ghost"
          style={{ left: drag.x - ghostSize / 2, top: drag.y - ghostSize * 0.95, width: ghostSize, height: ghostSize }}
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
