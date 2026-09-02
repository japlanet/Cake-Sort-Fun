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
        <div className="text-6xl mb-1 bob" role="img" aria-label="cake">
          🎂
        </div>
        <h1 className="title-candy text-5xl">Cake Sort Fun</h1>
        <p className="text-base font-bold text-teal-700 mt-1 min-h-6">
          {completedLevels.size > 0 ? "⭐".repeat(Math.min(completedLevels.size, LEVELS.length)) : "Tap a level to bake!"}
        </p>
      </div>

      <div className="px-4 pb-3 max-w-3xl w-full mx-auto">
        <button
          onClick={onCupboard}
          className="game-btn candy w-full bg-white/85 rounded-3xl px-4 py-3 flex items-center gap-3"
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
                className="game-btn candy level-card relative rounded-3xl p-4 bg-white/85"
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
          className={`game-btn candy flex items-center gap-3 px-5 py-3 rounded-full font-black text-lg ${
            autoHelper ? "bg-gradient-to-b from-amber-200 to-amber-300 candy-amber text-amber-900" : "bg-gray-200 text-gray-600"
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
