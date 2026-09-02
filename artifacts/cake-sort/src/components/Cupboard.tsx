import type { Flavor } from "@/game/types";
import type { ThemeId } from "@/game/themes";
import { FLAVORS } from "@/game/levels";
import { THEMES, THEME_ORDER } from "@/game/themes";
import { REWARDS, SHELF_SIZE, unlockedFlavors, unlockedThemes } from "@/game/rewards";
import { CakeView } from "./CakeView";
import { RewardBar } from "./RewardBar";

interface CupboardProps {
  totalServed: number;
  shelf: Flavor[];
  themeId: ThemeId;
  onChangeShelf: (shelf: Flavor[]) => void;
  onChangeTheme: (theme: ThemeId) => void;
  onBack: () => void;
}

const ALL_FLAVORS = Object.keys(FLAVORS) as Flavor[];
const MIN_SHELF = 2;

function unlockAt(kind: "flavor", id: Flavor): number | null;
function unlockAt(kind: "theme", id: ThemeId): number | null;
function unlockAt(kind: "flavor" | "theme", id: string): number | null {
  const r = REWARDS.find(r => (r.kind === "flavor" ? r.flavor : r.theme) === id && r.kind === kind);
  return r ? r.at : null;
}

/** Where earned cakes and backgrounds live. Tap a cake to put it on (or take it off) the shelf. */
export function Cupboard({ totalServed, shelf, themeId, onChangeShelf, onChangeTheme, onBack }: CupboardProps) {
  const theme = THEMES[themeId];
  const haveFlavors = unlockedFlavors(totalServed);
  const haveThemes = unlockedThemes(totalServed);

  function toggleFlavor(f: Flavor) {
    if (!haveFlavors.includes(f)) return;
    if (shelf.includes(f)) {
      if (shelf.length <= MIN_SHELF) return;
      onChangeShelf(shelf.filter(x => x !== f));
    } else if (shelf.length < SHELF_SIZE) {
      onChangeShelf([...shelf, f]);
    } else {
      // Shelf full: the new pick replaces the last cake on the shelf.
      onChangeShelf([...shelf.slice(0, SHELF_SIZE - 1), f]);
    }
  }

  return (
    <div className={`screen game-bg ${theme.bg}`}>
      <div className="safe-top px-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="game-btn w-14 h-14 rounded-2xl bg-white/80 shadow flex items-center justify-center text-3xl font-black border-b-4 border-gray-200"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-3xl font-black text-fuchsia-600 flex-1" style={{ textShadow: "2px 2px 0 rgba(255,255,255,0.8)" }}>
          🗄️ Cupboard
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <div className={`${theme.panel} rounded-3xl p-4 shadow`}>
            <RewardBar totalServed={totalServed} />
          </div>

          {/* Shelf */}
          <section className={`${theme.panel} rounded-3xl p-4 shadow`}>
            <h2 className="text-xl font-black text-gray-700 mb-3">🍽️ On the shelf</h2>
            <div className="flex justify-center gap-3 flex-wrap">
              {Array.from({ length: SHELF_SIZE }, (_, i) => {
                const f = shelf[i];
                return (
                  <button
                    key={i}
                    onClick={() => f && toggleFlavor(f)}
                    className={`game-btn rounded-full ${f ? "" : "opacity-40"} bg-white/70 shadow p-1`}
                    style={{ width: 92, height: 92 }}
                    aria-label={f ? `${FLAVORS[f].name} cake on the shelf, tap to take off` : "Empty shelf slot"}
                    disabled={!f}
                  >
                    {f ? (
                      <CakeView cake={{ id: `shelf-${f}`, groups: [{ flavor: f, count: 6 }] }} capacity={6} size={84} />
                    ) : (
                      <CakeView cake={null} capacity={6} size={84} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cakes */}
          <section className={`${theme.panel} rounded-3xl p-4 shadow`}>
            <h2 className="text-xl font-black text-gray-700 mb-3">🎂 My cakes</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {ALL_FLAVORS.map(f => {
                const have = haveFlavors.includes(f);
                const onShelf = shelf.includes(f);
                const at = unlockAt("flavor", f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleFlavor(f)}
                    disabled={!have}
                    className={`game-btn relative rounded-3xl p-2 flex flex-col items-center gap-1 shadow ${
                      onShelf ? "bg-sky-100 ring-4 ring-sky-400" : "bg-white/70"
                    } ${have ? "" : "opacity-60"}`}
                    aria-label={have ? `${FLAVORS[f].name} cake${onShelf ? ", on the shelf" : ""}` : `${FLAVORS[f].name} cake, locked`}
                  >
                    {have ? (
                      <CakeView cake={{ id: `cb-${f}`, groups: [{ flavor: f, count: 6 }] }} capacity={6} size={72} />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-full bg-gray-200 flex items-center justify-center text-4xl">🔒</div>
                    )}
                    <span className="text-xs font-bold text-gray-700">
                      {have ? `${FLAVORS[f].emoji} ${FLAVORS[f].name}` : at ? `🎂 ${at}` : ""}
                    </span>
                    {onShelf && (
                      <span className="absolute -top-2 -right-2 text-2xl" aria-hidden="true">
                        ✅
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Backgrounds */}
          <section className={`${theme.panel} rounded-3xl p-4 shadow`}>
            <h2 className="text-xl font-black text-gray-700 mb-3">🖼️ Backgrounds</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {THEME_ORDER.map(id => {
                const t = THEMES[id];
                const have = haveThemes.includes(id);
                const active = themeId === id;
                const at = unlockAt("theme", id);
                return (
                  <button
                    key={id}
                    onClick={() => have && onChangeTheme(id)}
                    disabled={!have}
                    className={`game-btn relative rounded-3xl h-24 flex flex-col items-center justify-center gap-1 shadow border-4 ${
                      active ? "border-sky-400 ring-4 ring-sky-300" : "border-white"
                    } ${have ? t.bg : "bg-gray-200 opacity-60"}`}
                    aria-label={have ? `${t.name} background${active ? ", in use" : ""}` : `${t.name} background, locked`}
                  >
                    <span className="text-4xl" role="img" aria-hidden="true">
                      {have ? t.emoji : "🔒"}
                    </span>
                    <span className="text-xs font-bold text-gray-800 bg-white/70 rounded-full px-2">
                      {have ? t.name : at ? `🎂 ${at}` : ""}
                    </span>
                    {active && (
                      <span className="absolute -top-2 -right-2 text-2xl" aria-hidden="true">
                        ✅
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
