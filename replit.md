# Cake Sort Fun

pnpm workspace (same layout as the Tile Match workspace), one frontend artifact, no backend.

## Artifacts

### Cake Sort (`artifacts/cake-sort`)
- **Type**: React + Vite + Tailwind, frontend only
- **Audience**: a 4-5 year old on an iPad. No reading needed, everything is pictorial.
- **Game**: Cake Sort style. Drag (or tap) a cake from the tray onto an empty plate.
  Slices of the same flavour on neighbouring plates gather together automatically.
  A plate that fills up with one flavour is served. Endless play in three difficulties (Easy, Medium, Hard).
- **Helper**: when the board is nearly full, Chef Bear finishes the cake closest to done
  so the child never gets stuck. A bell button summons the helper on demand.
- **Rules engine**: `src/game/engine.ts` (pure, fully unit tested in `src/game/engine.test.ts`)
- **Levels**: `src/game/levels.ts`

## Commands
- `pnpm install`
- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/cake-sort run dev`
- `pnpm --filter @workspace/cake-sort run test` (node:test, no extra deps)
- `pnpm run build` (typecheck + tests + vite build)
