import { LEVELS } from "@/game/levels";
import { THEMES } from "@/game/themes";
import type { ThemeId } from "@/game/themes";
import { RewardBar } from "./RewardBar";

interface LevelSelectProps {
  onSelectLevel: (levelId: number) => void;
  onCupboard: () => void;
  completedLevels: Set<number>;
  autoHelper: boolean;
  onToggleHelper: () => void;
  totalServed: number;
  themeId: ThemeId;
}

export function LevelSelect({
  onSelectLevel, onCupboard, completedLevels, autoHelper, onToggleHelper, totalServed, themeId,
}: LevelSelectProps) {
  const theme = THEMES[themeId];

  return (
    <div className={`screen game-bg ${theme.bg}`}>
      <div className="safe-top px-4 pb-2 text-center">
        <div className="text-6xl mb-1" role="img" aria-label="cake">
          🎂
        </div>
        <h1 className="text-4xl font-black text-pink-500" style={{ textShadow: "2px 2px 0 rgba(255,255,255,0.8)" }}>
          Cake Sort Fun
        </h1>
        <p className="text-base font-bold text-teal-700 mt-1 min-h-6">
          {completedLevels.size > 0 ? "⭐".repeat(Math.min(completedLevels.size, LEVELS.length)) : "Tap a level to bake!"}
        </p>
      </div>

      <div className="px-4 pb-3 max-w-3xl w-full mx-auto">
        <button
          onClick={onCupboard}
          className={`game-btn w-full ${theme.panel} rounded-3xl px-4 py-3 shadow flex items-center gap-3 border-b-4 border-black/10 active:border-b-0`}
          aria-label="Open the cupboard to see earned cakes and backgrounds"
        >
          <span className="text-4xl" role="img" aria-hidden="true">
            🗄️
          </span>
          <div className="flex-1">
            <RewardBar totalServed={totalServed} />
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
          {LEVELS.map(level => {
            const done = completedLevels.has(level.id);
            return (
              <button
                key={level.id}
                onClick={() => onSelectLevel(level.id)}
                className="game-btn relative rounded-3xl p-4 shadow-lg border-b-8 active:border-b-0 bg-white/75 border-black/10"
                aria-label={`Level ${level.id}, ${level.name}${done ? ", completed" : ""}`}
              >
                <div className="text-5xl mb-1" role="img" aria-hidden="true">
                  {level.emoji}
                </div>
                <div className="text-3xl font-black text-gray-800">{level.id}</div>
                <div className="text-xs font-bold text-gray-600">{level.name}</div>
                <div className="text-xs font-bold text-gray-500 mt-1">
                  {"🎂".repeat(Math.min(level.goal, 6))}
                  {level.goal > 6 ? "+" : ""}
                </div>
                {done && (
                  <div className="absolute -top-2 -right-2 text-3xl" role="img" aria-label="completed">
                    ⭐
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="safe-bottom px-4 pt-2 flex justify-center">
        <button
          onClick={onToggleHelper}
          className={`game-btn flex items-center gap-3 px-5 py-3 rounded-full shadow font-black text-lg border-b-4 active:border-b-0 ${
            autoHelper ? "bg-amber-200 border-amber-400 text-amber-900" : "bg-gray-200 border-gray-400 text-gray-600"
          }`}
          aria-label={autoHelper ? "Chef Bear helps automatically. Tap to turn off." : "Chef Bear only helps when called. Tap to turn on."}
        >
          <span className="text-3xl" role="img" aria-hidden="true">
            🐻
          </span>
          <span>{autoHelper ? "Chef Bear helps" : "Chef Bear waits"}</span>
          <span
            className={`inline-block w-12 h-7 rounded-full relative transition-colors ${autoHelper ? "bg-green-500" : "bg-gray-400"}`}
            aria-hidden="true"
          >
            <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: autoHelper ? 26 : 4 }} />
          </span>
        </button>
      </div>
    </div>
  );
}
