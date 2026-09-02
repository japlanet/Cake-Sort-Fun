interface BoardFullProps {
  onCallHelper: () => void;
  onRetry: () => void;
}

/** Only shown when the automatic helper is switched off and every plate is taken. */
export function BoardFull({ onCallHelper, onRetry }: BoardFullProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4">
      <div className="bounce-in bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-sky-300">
        <div className="text-7xl mb-3" role="img" aria-label="full plates">
          🍽️
        </div>
        <h2 className="text-3xl font-black text-sky-500 mb-5">All full!</h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={onCallHelper}
            className="game-btn w-full py-4 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 text-white font-black text-2xl shadow-lg border-b-4 border-orange-600 active:border-b-0"
            aria-label="Ask Chef Bear for help"
          >
            🐻 Help!
          </button>
          <button
            onClick={onRetry}
            className="game-btn w-full py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-400 text-white font-black text-xl shadow-lg border-b-4 border-sky-600 active:border-b-0"
            aria-label="Start this level again"
          >
            🔄 Again
          </button>
        </div>
      </div>
    </div>
  );
}
