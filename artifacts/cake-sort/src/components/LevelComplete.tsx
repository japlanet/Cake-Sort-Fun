import { Confetti } from "./Confetti";

interface LevelCompleteProps {
  levelId: number;
  totalLevels: number;
  helperUses: number;
  onNextLevel: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export function LevelComplete({ levelId, totalLevels, helperUses, onNextLevel, onRetry, onMenu }: LevelCompleteProps) {
  const isLastLevel = levelId >= totalLevels;
  const stars = helperUses === 0 ? 3 : helperUses <= 2 ? 2 : 1;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4">
      <Confetti />
      <div className="bounce-in bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-yellow-300">
        <div className="text-7xl mb-3" role="img" aria-label="celebration">
          {isLastLevel ? "🏆" : "🎂"}
        </div>
        <h2 className="text-3xl font-black text-pink-500 mb-1">{isLastLevel ? "Super Baker!" : "Yummy!"}</h2>
        <p className="text-lg font-bold text-teal-600 mb-5">
          {isLastLevel ? "You baked every cake!" : "All the cakes are served!"}
        </p>

        <div className="flex gap-2 justify-center mb-6" aria-label={`${stars} stars`}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="text-5xl star-in"
              style={{ animationDelay: `${0.2 + i * 0.2}s`, opacity: i < stars ? 1 : 0.2, filter: i < stars ? "none" : "grayscale(1)" }}
            >
              ⭐
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {!isLastLevel && (
            <button
              onClick={onNextLevel}
              className="game-btn w-full py-4 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-black text-2xl shadow-lg border-b-4 border-rose-600 active:border-b-0"
              aria-label="Play next level"
            >
              ▶️ Next
            </button>
          )}
          <button
            onClick={onRetry}
            className="game-btn w-full py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-400 text-white font-black text-xl shadow-lg border-b-4 border-sky-600 active:border-b-0"
            aria-label="Play this level again"
          >
            🔄 Again
          </button>
          <button
            onClick={onMenu}
            className="game-btn w-full py-3 rounded-2xl bg-gradient-to-r from-violet-400 to-purple-400 text-white font-black text-xl shadow-lg border-b-4 border-violet-600 active:border-b-0"
            aria-label="Go to level select"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}
