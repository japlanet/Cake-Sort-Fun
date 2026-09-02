import { useCallback, useState } from "react";
import { LevelSelect } from "./components/LevelSelect";
import { Cupboard } from "./components/Cupboard";
import { GamePage } from "./pages/Game";
import { useProgress } from "./hooks/useProgress";

type Screen = "menu" | "game" | "cupboard";

const COMPLETED_KEY = "cake-sort-completed";
const HELPER_KEY = "cake-sort-helper";

function readCompleted(): Set<number> {
  try {
    const saved = localStorage.getItem(COMPLETED_KEY);
    if (saved) return new Set(JSON.parse(saved) as number[]);
  } catch {}
  return new Set<number>();
}

function readHelper(): boolean {
  try {
    return localStorage.getItem(HELPER_KEY) !== "false";
  } catch {
    return true;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(readCompleted);
  const [autoHelper, setAutoHelper] = useState<boolean>(readHelper);
  const { progress, addServed, setShelf, setTheme } = useProgress();

  const handleSelectLevel = useCallback((levelId: number) => {
    setCurrentLevel(levelId);
    setScreen("game");
  }, []);

  const handleMenu = useCallback(() => setScreen("menu"), []);
  const handleCupboard = useCallback(() => setScreen("cupboard"), []);

  const handleLevelComplete = useCallback((levelId: number) => {
    setCompletedLevels(prev => {
      const next = new Set(prev);
      next.add(levelId);
      try {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

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

  if (screen === "game") {
    return (
      <GamePage
        key={currentLevel}
        levelId={currentLevel}
        autoHelper={autoHelper}
        shelf={progress.shelf}
        themeId={progress.themeId}
        totalServed={progress.totalServed}
        onCakeServed={handleCakeServed}
        onMenu={handleMenu}
        onNextLevel={handleSelectLevel}
        onLevelComplete={handleLevelComplete}
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
      completedLevels={completedLevels}
      autoHelper={autoHelper}
      onToggleHelper={handleToggleHelper}
      totalServed={progress.totalServed}
      themeId={progress.themeId}
    />
  );
}
