import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardView } from "@/components/Board";
import { Tray } from "@/components/Tray";
import { CakeView } from "@/components/CakeView";
import { Confetti } from "@/components/Confetti";
import { BoardFull } from "@/components/BoardFull";
import { ConfirmRestart } from "@/components/ConfirmRestart";
import { RewardPopup } from "@/components/RewardPopup";
import { RewardBar } from "@/components/RewardBar";
import { ChefBear } from "@/components/ChefBear";
import type { BearMood } from "@/components/ChefBear";
import { CELEBRATE_EVERY, LEVELS } from "@/game/levels";
import { THEMES } from "@/game/themes";
import type { ThemeId } from "@/game/themes";
import { rewardsBetween } from "@/game/rewards";
import type { Reward } from "@/game/rewards";
import { bestSpot, emptyBoard, emptyCells, generateCake, helperRescue, playTurn } from "@/game/engine";
import type { Board, Cake, Flavor, LevelConfig } from "@/game/types";
import { loadGame, storeGame } from "@/game/save";
import type { SavedGame } from "@/game/save";
import { audio } from "@/audio/engine";
import { useBoardFit } from "@/hooks/useBoardFit";
import { useTurnQueue } from "@/hooks/useTurnQueue";
import { useCakeDrag } from "@/hooks/useCakeDrag";
import { useStoredFlag } from "@/hooks/useStoredFlag";

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

function buildLevel(base: LevelConfig, shelf: Flavor[]): LevelConfig {
  const count = Math.max(2, Math.min(base.flavorCount, shelf.length));
  return { ...base, flavors: shelf.slice(0, count) };
}

function freshGame(level: LevelConfig): SavedGame {
  const board = emptyBoard(level.rows, level.cols, level.capacity);
  return {
    v: 1,
    levelId: level.id,
    board,
    tray: Array.from({ length: TRAY_SIZE }, () => generateCake(level, board)),
    served: 0,
    turns: 0,
    bellReadyAt: 0,
  };
}

export function GamePage({
  levelId, autoHelper, shelf, themeId, totalServed, onCakeServed, onMenu, onRestart,
}: GamePageProps) {
  const level = useMemo(() => buildLevel(LEVELS.find(l => l.id === levelId) ?? LEVELS[0], shelf), [levelId, shelf]);
  const theme = THEMES[themeId];

  // ---- game state (a game in progress is saved per difficulty) -------------

  const [saved] = useState<SavedGame>(() => loadGame(level) ?? freshGame(level));
  const savedRef = useRef<SavedGame>(saved);
  const persist = useCallback((patch: Partial<SavedGame>) => {
    savedRef.current = { ...savedRef.current, ...patch };
    storeGame(savedRef.current);
  }, []);

  // The settled board is the truth; the queue below shows it catching up.
  const logicRef = useRef<Board>(saved.board);
  const [tray, setTray] = useState<Cake[]>(saved.tray);
  const [selected, setSelected] = useState(0);
  const [served, setServed] = useState(saved.served);
  const servedRef = useRef(saved.served);
  const totalRef = useRef(totalServed);
  const [turns, setTurns] = useState(saved.turns);
  const [bellReadyAt, setBellReadyAt] = useState(saved.bellReadyAt);
  const [nopeIndex, setNopeIndex] = useState<number | null>(null);
  const [boardFull, setBoardFull] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);
  const [celebrating, setCelebrating] = useState(false);

  // ---- sound ----------------------------------------------------------------

  const [soundEnabled, setSoundEnabled] = useStoredFlag("cake-sort-sound", true);
  const [musicEnabled, setMusicEnabled] = useStoredFlag("cake-sort-music", true);
  audio.sfxEnabled = soundEnabled;

  // Audio may only start inside a user gesture (iOS), so the first press on the
  // play screen unlocks it. The tune pauses while hidden and stops on leaving.
  useEffect(() => {
    audio.setMusic(musicEnabled);
  }, [musicEnabled]);
  useEffect(() => {
    const unlock = () => audio.unlock();
    const onVisibility = () => audio.setHidden(document.hidden);
    window.addEventListener("pointerdown", unlock, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("visibilitychange", onVisibility);
      audio.stopMusic();
    };
  }, []);

  // ---- animation playback ----------------------------------------------------

  const { board, anim, poppedIndex, enqueue, aliveRef } = useTurnQueue({
    initialBoard: saved.board,
    onServed: () => {
      servedRef.current += 1;
      totalRef.current += 1;
      setServed(servedRef.current);
      persist({ served: servedRef.current });
      onCakeServed();
      if (servedRef.current % CELEBRATE_EVERY === 0) {
        audio.playComplete();
        setCelebrating(true);
        setTimeout(() => aliveRef.current && setCelebrating(false), 3500);
      }
    },
    onTurnDone: totalBefore => {
      const crossed = rewardsBetween(totalBefore, totalRef.current);
      if (crossed.length > 0) setPendingRewards(prev => [...prev, ...crossed]);
      if (!autoHelper && emptyCells(logicRef.current).length === 0) setBoardFull(true);
    },
  });

  // ---- actions ---------------------------------------------------------------

  const nope = useCallback(
    (index: number) => {
      audio.playNope();
      setNopeIndex(index);
      setTimeout(() => aliveRef.current && setNopeIndex(null), 450);
    },
    [aliveRef],
  );

  const inputLocked = boardFull || confirmRestart || pendingRewards.length > 0;

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
      const nextTray = tray.slice();
      nextTray[trayIndex] = generateCake(level, result.board);
      setTray(nextTray);
      setTurns(turns + 1);
      persist({ board: result.board, tray: nextTray, turns: turns + 1 });
      enqueue({ steps: result.steps, before: logic, totalBefore: totalRef.current });
    },
    [inputLocked, tray, turns, autoHelper, level, nope, enqueue, persist],
  );

  const emptyCount = emptyCells(logicRef.current).length;
  const boardHasCakes = emptyCount < logicRef.current.cells.length;
  const bellReady = turns >= bellReadyAt && boardHasCakes;

  /** Chef Bear finishes a cake. `force` skips the bell's cooldown (the "All full" popup). */
  const callHelper = useCallback(
    (force = false) => {
      if (pendingRewards.length > 0 || !boardHasCakes) return;
      if (!force && !bellReady) return;
      const logic = logicRef.current;
      const result = helperRescue(logic);
      if (result.steps.length === 0) return;
      logicRef.current = result.board;
      const readyAt = turns + BELL_COOLDOWN_TURNS;
      setBellReadyAt(readyAt);
      setBoardFull(false);
      persist({ board: result.board, bellReadyAt: readyAt });
      enqueue({ steps: result.steps, before: logic, totalBefore: totalRef.current });
    },
    [bellReady, boardHasCakes, pendingRewards.length, turns, enqueue, persist],
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      audio.sfxEnabled = !prev;
      if (!prev) audio.playTick();
      return !prev;
    });
  }, [setSoundEnabled]);

  const toggleMusic = useCallback(() => setMusicEnabled(prev => !prev), [setMusicEnabled]);

  // ---- layout, drag and tap --------------------------------------------------

  const areaRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cellSize = useBoardFit(areaRef, level.rows, level.cols, GAP);
  const traySize = Math.round(Math.min(cellSize * 0.95, 120));
  const ghostSize = Math.round(cellSize * 1.1);

  const getBoard = useCallback(() => logicRef.current, []);
  const onTap = useCallback((index: number) => place(selected, index), [place, selected]);

  const { drag, ghostRef, ghostInitialTransform, onTrayPointerDown, onBoardPointerDown, onBoardPointerUp } = useCakeDrag({
    boardRef,
    getBoard,
    cellSize,
    gap: GAP,
    ghostSize,
    onPick: setSelected,
    onDrop: place,
    onTap,
    onMiss: nope,
  });

  // ---- derived ---------------------------------------------------------------

  const hintIndex = useMemo(() => {
    if (inputLocked) return null;
    const cake = tray[selected];
    return cake ? bestSpot(logicRef.current, cake) : null;
    // `board` is in the deps so the hint refreshes as animations settle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputLocked, tray, selected, board]);

  // Chef Bear dozes while there is room, watches as plates fill, and waves when he could help.
  const bearMood: BearMood =
    emptyCount <= level.helperThreshold + 1 && bellReady ? "ready" : emptyCount <= level.helperThreshold + 2 ? "watch" : "sleep";

  const headerButton = "game-btn candy w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0";

  return (
    <div className={`screen game-bg ${theme.bg}`}>
      {/* Header */}
      <div className="safe-top px-3 pb-1 flex items-center gap-2">
        <button onClick={onMenu} className={`${headerButton} text-3xl font-black text-gray-700`} aria-label="Back to the menu">
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

        <button onClick={() => setConfirmRestart(true)} className={`${headerButton} text-2xl`} aria-label="Start a new board">
          <span role="img" aria-hidden="true">🔄</span>
        </button>
        <button onClick={toggleSound} className={`${headerButton} text-2xl`} aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}>
          <span role="img" aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
        </button>
        <button onClick={toggleMusic} className={`${headerButton} text-2xl`} aria-label={musicEnabled ? "Turn music off" : "Turn music on"}>
          <span role="img" aria-hidden="true" style={{ opacity: musicEnabled ? 1 : 0.35 }}>🎵</span>
        </button>
        <button
          onClick={() => callHelper()}
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

      {/* Tray, with Chef Bear tucked behind it */}
      <div className="safe-bottom px-3 pt-2">
        <div className="relative max-w-xl mx-auto">
          <ChefBear mood={bearMood} size={Math.round(traySize * 1.15)} hidden={anim?.type === "helper"} onTap={() => callHelper()} />
          <div className="tray-wood relative z-10 rounded-3xl px-4 pt-4 pb-3">
            <Tray
              tray={tray}
              capacity={level.capacity}
              size={traySize}
              selected={selected}
              draggingIndex={drag?.moved ? drag.trayIndex : null}
              disabled={inputLocked}
              onPointerDown={onTrayPointerDown}
            />
          </div>
        </div>
      </div>

      {/* Dragged cake */}
      {drag?.moved && tray[drag.trayIndex] && (
        <div ref={ghostRef} className="drag-ghost" style={{ transform: ghostInitialTransform(), width: ghostSize, height: ghostSize }}>
          <CakeView cake={tray[drag.trayIndex]} capacity={level.capacity} size={ghostSize} />
        </div>
      )}

      {celebrating && <Confetti />}

      {pendingRewards.length > 0 && (
        <RewardPopup reward={pendingRewards[0]} onClose={() => setPendingRewards(prev => prev.slice(1))} />
      )}

      {confirmRestart && <ConfirmRestart onConfirm={onRestart} onCancel={() => setConfirmRestart(false)} />}

      {boardFull && pendingRewards.length === 0 && <BoardFull onCallHelper={() => callHelper(true)} onRetry={onRestart} />}
    </div>
  );
}
