import { useEffect, useRef, useState } from "react";

interface ParentPanelProps {
  onClose: () => void;
  onErase: () => void;
}

const HOLD_MS = 2000;

/** For grown-ups: erase everything, but only after holding the button for two seconds. */
export function ParentPanel({ onClose, onErase }: ParentPanelProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(0);
  const frameRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!holding) {
      cancelAnimationFrame(frameRef.current);
      setProgress(0);
      return;
    }
    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onErase();
        }
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [holding, onErase]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4">
      <div className="bounce-in bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border-4 border-gray-200 text-gray-800">
        <h2 className="text-2xl font-black mb-2">For grown-ups</h2>
        <p className="text-sm font-semibold text-gray-600 mb-4">
          Erasing removes every earned cake and background, the cake count, and any games in progress. It cannot be undone.
          Press and hold the button for two seconds to erase.
        </p>
        <button
          type="button"
          className="relative w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-lg overflow-hidden select-none"
          style={{ touchAction: "none" }}
          onPointerDown={e => {
            e.preventDefault();
            setHolding(true);
          }}
          onPointerUp={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onContextMenu={e => e.preventDefault()}
          aria-label="Hold for two seconds to erase all progress"
        >
          <span className="absolute inset-y-0 left-0 bg-rose-800/70" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
          <span className="relative">{holding ? "Keep holding…" : "Hold to erase all progress"}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold"
          aria-label="Close"
        >
          Close
        </button>
      </div>
    </div>
  );
}
