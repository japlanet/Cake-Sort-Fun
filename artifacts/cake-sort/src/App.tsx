import { useCallback, useState } from "react";
import { LevelSelect } from "./components/LevelSelect";
import { Cupboard } from "./components/Cupboard";
import { GamePage } from "./pages/Game";
import { useProgress } from "./hooks/useProgress";
import { clearGame } from "./game/save";
import { eraseAllProgress } from "./game/save";
import { LEVELS } from "./game/levels";

type Screen = "menu" | "game" | "cupboard";

const HELPER_KEY = "cake-sort-helper";
const LEVEL_KEY = "cake-sort-level";

function readHelper(): boolean {
  try {
    return localStorage.getItem(HELPER_KEY) !== "false";
  } catch {
    return true;
  }
}

function readLevel(): number {
  try {
    const n = Number(localStorage.getItem(LEVEL_KEY));
    return LEVELS.some(l => l.id === n) ? n : LEVELS[0].id;
  } catch {
    return 1;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [currentLevel, setCurrentLevel] = useState<number>(readLevel);
  // Bumping this restarts the current game with a fresh board.
  const [gameRun, setGameRun] = useState(0);
  const [autoHelper, setAutoHelper] = useState<boolean>(readHelper);
  const { progress, addServed, setShelf, setTheme } = useProgress();

  const handleSelectLevel = useCallback((levelId: number) => {
    setCurrentLevel(levelId);
    try {
      localStorage.setItem(LEVEL_KEY, String(levelId));
    } catch {}
    setGameRun(r => r + 1);
    setScreen("game");
  }, []);

  const handleRestart = useCallback(() => {
    clearGame(currentLevel);
    setGameRun(r => r + 1);
  }, [currentLevel]);
  const handleMenu = useCallback(() => setScreen("menu"), []);
  const handleCupboard = useCallback(() => setScreen("cupboard"), []);

  const handleToggleHelper = useCallback(() => {
    setAutoHelper(prev => {
      const next = !prev;
      try {
        localStorage.setItem(HELPER_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleCakeServed = useCallback(() => addServed(1), [addServed]);

  const handleEraseAll = useCallback(() => {
    eraseAllProgress();
    window.location.reload();
  }, []);

  if (screen === "game") {
    return (
      <GamePage
        key={`${currentLevel}-${gameRun}`}
        levelId={currentLevel}
        autoHelper={autoHelper}
        shelf={progress.shelf}
        themeId={progress.themeId}
        totalServed={progress.totalServed}
        onCakeServed={handleCakeServed}
        onMenu={handleMenu}
        onRestart={handleRestart}
      />
    );
  }

  if (screen === "cupboard") {
    return (
      <Cupboard
        totalServed={progress.totalServed}
        shelf={progress.shelf}
        themeId={progress.themeId}
        onChangeShelf={setShelf}
        onChangeTheme={setTheme}
        onBack={handleMenu}
      />
    );
  }

  return (
    <LevelSelect
      onSelectLevel={handleSelectLevel}
      onCupboard={handleCupboard}
      autoHelper={autoHelper}
      onToggleHelper={handleToggleHelper}
      totalServed={progress.totalServed}
      themeId={progress.themeId}
      onEraseAll={handleEraseAll}
    />
  );
}
