# Cake Sort Fun 🎂

A gentle Cake Sort style puzzle for a 4-5 year old on an iPad. No reading needed.

- Drag (or tap) a cake from the tray onto an empty plate.
- Slices of the same flavour on neighbouring plates gather together on their own.
- A plate full of one flavour is served. Play is endless: pick Easy, Medium or Hard and keep
  baking. Every ten cakes in a sitting gets a little confetti.
- **Chef Bear** finishes the cake closest to done whenever the board is nearly full, so the
  game never gets stuck. The 🐻 button calls him early (with a short cooldown). The
  automatic help can be switched off on the home screen for an older child.
- A game in progress is saved per difficulty, so Home, a refresh, or the iPad dropping the tab
  in the background all resume where he left off. The menu shows a ▶️ badge on a saved game.
- Installs to the iPad Home Screen with a proper icon and plays offline after the first visit
  (`public/manifest.webmanifest`, `public/sw.js`).
- Every 20 cakes served earns a reward: a new cake flavour or a new background. The 🌈 rainbow
  cake is there from the start. The **cupboard** shows everything earned; up to five cakes sit on the shelf
  and levels use the first few of them.

## Layout

Same pnpm workspace shape as Tile-Match-Fun. The game lives in `artifacts/cake-sort`.

| Path | What |
| --- | --- |
| `src/game/engine.ts` | The rules: slice transfers, cascades, serving, the helper, the hint, cake generation. Pure functions. |
| `src/game/engine.test.ts` | Unit tests for the rules, including a 300-seed random-play invariant check. |
| `src/game/levels.ts` | The three difficulties and the flavour styles. |
| `src/game/rewards.ts` | Reward ladder, shelf rules. |
| `src/game/themes.ts` | Backgrounds. |
| `src/game/save.ts` | Saving and validating a game in progress. |
| `src/pages/Game.tsx` | The play screen: drag and drop with snap-to-plate, queued animation playback, helper. |
| `src/components/` | Cake drawing (SVG pie), board, tray, popups, cupboard, level select. |

## Commands

```bash
pnpm install
pnpm --filter @workspace/cake-sort run test        # rules tests (node --test, no extra deps)
pnpm --filter @workspace/cake-sort run typecheck
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/cake-sort run dev
pnpm run build                                      # typecheck + tests + vite build
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. `BASE_PATH` in
that file must match the repository name (`/Cake-Sort-Fun/` by default). In the repository
settings, set Pages to deploy from GitHub Actions.
