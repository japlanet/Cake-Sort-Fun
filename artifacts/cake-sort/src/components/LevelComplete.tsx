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
      <div className="bounce-in modal-card rounded-3xl p-8 max-w-sm w-full text-center border-4 border-yellow-300">
        <div className="text-7xl mb-3" role="img" aria-label="celebration">
          {isLastLevel ? "🏆" : "🎂"}
        </div>
        <h2 className="title-candy text-4xl mb-1">{isLastLevel ? "Super Baker!" : "Yummy!"}</h2>
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
              className="game-btn candy candy-rose w-full py-4 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-black text-2xl"
              aria-label="Play next level"
            >
              ▶️ Next
            </button>
          )}
          <button
            onClick={onRetry}
            className="game-btn candy candy-sky w-full py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-400 text-white font-black text-xl"
            aria-label="Play this level again"
          >
            🔄 Again
          </button>
          <button
            onClick={onMenu}
            className="game-btn candy candy-violet w-full py-3 rounded-2xl bg-gradient-to-r from-violet-400 to-purple-400 text-white font-black text-xl"
            aria-label="Go to level select"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}
