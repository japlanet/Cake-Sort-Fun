import { LEVELS } from "@/game/levels";
import { THEMES } from "@/game/themes";
import type { ThemeId } from "@/game/themes";
import { RewardBar } from "./RewardBar";
import { savedSitting } from "@/game/save";

interface LevelSelectProps {
  onSelectLevel: (levelId: number) => void;
  onCupboard: () => void;
  autoHelper: boolean;
  onToggleHelper: () => void;
  totalServed: number;
  themeId: ThemeId;
}

const CARD_STYLES: Record<number, string> = {
  1: "from-lime-200 to-emerald-300 candy-emerald",
  2: "from-sky-200 to-blue-300 candy-sky",
  3: "from-orange-200 to-rose-300 candy-rose",
};

export function LevelSelect({ onSelectLevel, onCupboard, autoHelper, onToggleHelper, totalServed, themeId }: LevelSelectProps) {
  const theme = THEMES[themeId];

  return (
    <div className={`screen game-bg ${theme.bg}`}>
      <div className="safe-top px-4 pb-2 text-center">
        <div className="text-6xl mb-1 bob" role="img" aria-label="cake">
          🎂
        </div>
        <h1 className="title-candy text-5xl">Cake Sort Fun</h1>
        <p className="text-base font-bold text-teal-700 mt-1">{totalServed > 0 ? `${totalServed} cakes baked!` : "Pick a game to bake!"}</p>
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

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex items-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mx-auto">
          {LEVELS.map(level => {
            const sitting = savedSitting(level);
            return (
            <button
              key={level.id}
              onClick={() => onSelectLevel(level.id)}
              className={`game-btn candy level-card relative rounded-3xl p-6 bg-gradient-to-b ${CARD_STYLES[level.id] ?? ""} flex flex-col items-center`}
              aria-label={`${level.name} game`}
            >
              <div className="text-7xl mb-2 bob" style={{ animationDelay: `${level.id * 0.3}s` }} role="img" aria-hidden="true">
                {level.emoji}
              </div>
              <div className="text-4xl font-black text-gray-800 drop-shadow-sm">{level.name}</div>
              <div className="text-lg font-bold text-gray-700 mt-1">
                {"🎂".repeat(level.flavorCount)}
              </div>
              <div className="text-sm font-bold text-gray-600 mt-1">
                {level.cols}×{level.rows} plates
              </div>
              {sitting !== null && (
                <div
                  className="absolute -top-3 -right-2 bg-white rounded-full px-3 py-1 shadow font-black text-pink-500 text-lg flex items-center gap-1"
                  aria-label={`Game in progress, ${sitting} cakes served`}
                >
                  <span aria-hidden="true">▶️</span>
                  <span aria-hidden="true">🎂</span>
                  {sitting}
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
