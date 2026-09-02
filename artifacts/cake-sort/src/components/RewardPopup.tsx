import { Confetti } from "./Confetti";
import { CakeView } from "./CakeView";
import type { Reward } from "@/game/rewards";
import { FLAVORS } from "@/game/levels";
import { THEMES } from "@/game/themes";

interface RewardPopupProps {
  reward: Reward;
  onClose: () => void;
}

/** "You earned a new cake / background!" */
export function RewardPopup({ reward, onClose }: RewardPopupProps) {
  const isFlavor = reward.kind === "flavor";
  const title = isFlavor ? "New cake!" : "New background!";
  const name = isFlavor ? FLAVORS[reward.flavor].name : THEMES[reward.theme].name;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/40 backdrop-blur-sm p-4">
      <Confetti />
      <div className="bounce-in bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-fuchsia-300">
        <div className="text-5xl mb-2" role="img" aria-label="gift">
          🎁
        </div>
        <h2 className="text-3xl font-black text-fuchsia-500 mb-4">{title}</h2>

        <div className="flex justify-center mb-2">
          {isFlavor ? (
            <div className="star-in">
              <CakeView cake={{ id: "prize", groups: [{ flavor: reward.flavor, count: 6 }] }} capacity={6} size={170} />
            </div>
          ) : (
            <div className={`star-in w-44 h-44 rounded-3xl shadow-inner border-4 border-white ${THEMES[reward.theme].bg} flex items-center justify-center`}>
              <span className="text-7xl" role="img" aria-hidden="true">
                {THEMES[reward.theme].emoji}
              </span>
            </div>
          )}
        </div>
        <p className="text-2xl font-black text-gray-700 mb-6">
          {isFlavor ? FLAVORS[reward.flavor].emoji : THEMES[reward.theme].emoji} {name}
        </p>

        <button
          onClick={onClose}
          className="game-btn w-full py-4 rounded-2xl bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white font-black text-2xl shadow-lg border-b-4 border-fuchsia-600 active:border-b-0"
          aria-label="Hooray, keep playing"
        >
          ✨ Yay!
        </button>
      </div>
    </div>
  );
}
