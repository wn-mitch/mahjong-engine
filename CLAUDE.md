# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is `pnpm` (workspace declared but single package). Node tooling is SvelteKit + Vite + Vitest.

```sh
pnpm install
pnpm dev              # SvelteKit dev server (default http://localhost:5173)
pnpm build            # Production build via adapter-auto
pnpm preview          # Serve the production build
pnpm check            # svelte-kit sync + svelte-check (TS + Svelte typecheck)
pnpm check:watch
pnpm test             # vitest run (one-shot)
pnpm test:watch       # vitest (interactive)
```

Run a single test file or filter by name:
```sh
pnpm test tests/nmjl.test.ts
pnpm test -t "evaluates a winning hand"
```

There is no lint/format step configured (ESLint + Prettier are on the TODO). `pnpm check` is the closest thing to a gate.

`scripts/pw-charleston.mjs` is an ad-hoc Playwright probe against the running dev server (set `URL=...` to point it elsewhere). It is **not** part of `pnpm test` and is hand-run for UI smoke-checks of the Charleston flow.

## Project documents (read these before non-trivial work)

These are the operating documents of the project — they are authoritative and updated:

- **`PRODUCT.md`** — what the app is, who it's for, voice/tone, anti-references. Read before any UI or copy change.
- **`DESIGN.md`** — the "Reading Room" design system. OKLCH-only palette tinted toward hue 80, Bookmark Indigo as the sole accent (≤10% of any screen), tiles as flat 2D typography with CJK suit-marks, flat-by-default elevation (rings, not shadows). Read before any visual change. The frontmatter is the token source of truth.
- **`TODO.md`** — current work queue, ordered by what unblocks the most downstream value. Reflects real priority; check here before proposing what to do next.
- **`docs/`** — strategy guides (`docs/strategy/`, including the verified NMJL 2026 card transcription) and architecture docs (`docs/architecture/`). The strategy docs are the source for hand patterns; the architecture docs explain the ruleset abstraction and per-ruleset evaluation strategy.

When the user asks for UI work, the answer is almost always "do less, lean on tone and hairlines" — the design rejects casino chrome, toy-mahjong solitaire, generic SaaS dashboards, and Asian-pastiche decor explicitly.

## Architecture

### Layering

```
src/lib/engine/        — ruleset-agnostic core: tiles, GameState, Ruleset interface
src/lib/rulesets/      — per-ruleset implementations of Ruleset
  nmjl-2026/           — American NMJL 2026 (active; pattern-matching evaluator)
  chinese-traditional/ — stub (interface implemented, returns empty)
src/lib/components/    — Svelte 5 components
src/lib/state/         — runes-based position store, provided via Svelte context
src/routes/            — SvelteKit pages (single page at `/`)
tests/                 — Vitest suites (`engine.test.ts`, `nmjl.test.ts`)
```

Path alias `$lib` → `src/lib` (SvelteKit default). Use it in imports.

### The Ruleset interface (`src/lib/engine/ruleset.ts`)

The core abstraction. Every ruleset implements:

- `evaluateTargets(state)` → ranked `TargetEvaluation[]`, each with a `completionScore` (0..1), `tilesNeeded`, `jokerSlotsRemaining`, and `patternSlots` describing which physical tiles fill which pattern slot.
- `isWinningHand(state)` → true iff some target has score ≥ 1.
- `suggestDiscard(state, target?)` → which tile to discard and why. Optional `target` lets the UI pin a non-top target.
- `suggestCharlestonPass(state, direction)` → which three tiles to pass; direction-sensitive.
- `evaluateReceivedTiles?(state, direction, received)` — optional; what to keep vs pass through.

The engine layer is **ruleset-agnostic** by design. Anything that's specific to NMJL (joker rules, hand patterns, dragon/suit pairing) lives in `rulesets/nmjl-2026/`, never in `engine/`.

### NMJL 2026 evaluator (the meat)

The NMJL ruleset uses **declarative pattern matching with a slot-variable DSL**, not generative hand enumeration:

- **`hands.ts`** — every 2026 card hand encoded as a `NMJLHand` with typed `Group`s and `TileSpec`s. Patterns use suit variables (`A/B/C`), number variables (`X/Y` with optional offsets), and dragon variables (`D1/D2`). Constraints (`distinctSuits`, `numberDomains`, `windDomain`, `dragonsAllSame`) restrict the variable domain.
- **`matcher.ts`** — `evaluateHand(hand, state)` does slot-assignment search: enumerate suit/number/dragon variable bindings within their domains, score each binding by how many slot tiles are present in `hand + exposures` (with jokers filling eligible slots), pick the best binding, and return a `TargetEvaluation`.
- **`charleston.ts`** — family-aware pass logic (Evens / Odds / Honors / Consecutive) with direction-specific commitment and a never-pass guard (jokers, flowers, white dragons under Evens, pairs, top-6 needed by the current top target).
- **`index.ts`** — `NMJLRuleset` glues everything together and adds `crossHandUtility(tile)` for the discard heuristic (lowest-utility tile not needed by the top target).

The matcher is the right place for changes to scoring, joker rules, or exposure handling. The TODO lists known gaps (pivot scoring overlay, tighter exposure handling, all-joker-exposure rejection).

### State management (Svelte 5 runes)

- `src/lib/state/positionStore.svelte.ts` — the `PositionStore` factory. Uses `$state`/`$derived` runes (the `.svelte.ts` extension is required for runes outside components). Holds the full `GameState`, ruleset selection, focus target, and selectors. **Do not** convert this to a legacy `writable` store.
- `src/lib/state/context.ts` — `provideStore(store)` / `useStore()` helpers. The single store is created in `+page.svelte` and provided via Svelte context — child components grab it with `useStore()` rather than receiving props.
- `svelte.config.js` forces runes mode on for everything outside `node_modules`. Components use `$props`, `$state`, `$derived`, `$effect` — not the legacy reactive syntax.

### Tile model (`src/lib/engine/tiles.ts`)

`Tile` is a discriminated union: `number | wind | dragon | flower | joker`. Flowers and jokers compare equal regardless of `index` (every flower is interchangeable for matching purposes; jokers are wildcards). Use `tileEquals`, `countTile`, and `multisetDiff` rather than rolling your own comparisons. The canonical sort order is suit groups → winds → dragons → flowers → jokers, via `compareTiles`.

`fullTilePool()` returns 152 tiles (3×9×4 numbers + 4×4 winds + 3×4 dragons + 8 flowers + 8 jokers). The tile-pool tracker that subtracts seen tiles for probability calculations is **on the TODO**, not yet implemented.

## Conventions

- **Commit messages**: conventional commits, bare prefix (no scopes): `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`. Branches: `wnmitch/<short-name>`.
- **TypeScript**: strict mode on; `rewriteRelativeImportExtensions` is enabled so `.ts` extensions on relative imports are fine and expected.
- **Tailwind**: v4 via `@tailwindcss/vite`. Design tokens from `DESIGN.md` frontmatter are the source — don't introduce ad-hoc hex colors. Custom color names in markup (e.g. `border-line`, `bg-bg-sunk`, `text-accent`) map to the Reading Room palette.
- **No README/docs creation unless asked** — the project already has rich docs; adding more usually adds noise.
- **TODO.md is real** — when finishing a task listed there, check the box rather than deleting the line, so the history of completed work stays visible.
