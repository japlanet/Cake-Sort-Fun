interface ConfirmRestartProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Start a fresh board?" in pictures: a big yes and a big no. */
export function ConfirmRestart({ onConfirm, onCancel }: ConfirmRestartProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4">
      <div className="bounce-in modal-card rounded-3xl p-8 max-w-sm w-full text-center border-4 border-sky-300">
        <div className="text-7xl mb-2" role="img" aria-label="fresh plates">
          🍽️✨
        </div>
        <h2 className="title-candy text-4xl mb-6">New board?</h2>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="game-btn candy candy-sky flex-1 py-4 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-400 text-white font-black text-3xl"
            aria-label="No, keep playing"
          >
            ↩️
          </button>
          <button
            onClick={onConfirm}
            className="game-btn candy candy-rose flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-black text-3xl"
            aria-label="Yes, start a new board"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  );
}
