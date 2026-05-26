# TODO

Next steps queued for follow-up work. Roughly ordered by what unblocks the most downstream value.

## Engine — make NMJL actually evaluate

- [x] Encode the 2026 NMJL hand patterns as data in `src/lib/rulesets/nmjl-2026/hands.ts` (slot-variable DSL with suit/num/dragon vars + offsets). Source: `docs/strategy/american-nmjl-2026.md`.
- [x] Implement `NMJLRuleset.evaluateTargets` — slot-assignment search in `nmjl-2026/matcher.ts`, scoring per-hand by missing tiles.
- [x] Implement `NMJLRuleset.isWinningHand` — true iff any hand has score 1.0.
- [x] Implement `NMJLRuleset.suggestDiscard` — discards lowest-cross-hand-utility tile not in the top target's needs.
- [x] Implement `NMJLRuleset.suggestCharlestonPass` — candidate-set scoring over a winnowing retained slice of `evaluateTargets` (right: 8, across: 5, left: 2), with a never-pass guard (jokers, flowers, protected pairs, all tiles needed by top-2 retained candidates). Lives in `src/lib/rulesets/nmjl-2026/charleston.ts`.
- [ ] Add tile-pool tracking to `engine/evaluator.ts` (4 of each suit number, 4 of each wind, 4 of each dragon, 8 flowers, 8 jokers; subtract seen tiles, including Charleston reveals).
    - Charleston tile reveals must feed the tracker: each pass is shown to the receiver, so by end-of-Charleston every passed tile is known in-hand or exposed, not in the wall. `suggestCharlestonPass` already returns the tiles being passed; the tracker should consume both sides of every pass.
- [x] Add pivot scoring overlay: bonus to hands sharing tile bases with current top candidate. Generalized to a candidate-set score over a winnowing retained slice of `evaluateTargets` (right: 8, across: 5, left: 2). Replaces the family heuristic; family fit emerges implicitly from the retained set.
- [ ] Tighten matcher exposure handling: today exposed tiles are merged into the pool. Per NMJL rules each exposure must align to one Group of matching kind; mis-aligned exposures should drop the target's reachable score to 0.
- [ ] Enforce "at least one real tile per exposed group" joker rule (today all-joker groups are accepted, which is wrong for exposures).

## Engine — Chinese Traditional

- [ ] Choose a regional variant to target first (Hong Kong / Taiwanese / Cantonese / mainland). Document choice in `docs/strategy/chinese-traditional.md`.
- [ ] Implement generative hand enumeration in `ChineseTraditionalRuleset.evaluateTargets` — combinatorial search for 4 sets + 1 pair, with pruning
- [ ] Encode fan/faan scoring rules in `src/lib/rulesets/chinese-traditional/scoring.ts`
- [ ] Implement `isWinningHand` and `suggestDiscard`

## UI — Svelte components

- [ ] Tile-picker component: visual grid of all tile types, click to add to hand
- [ ] Hand display: current hand sorted, with exposures and discards
- [ ] Evaluation panel: ranked target hands with completion scores, tiles needed, joker slot count
- [ ] Discard suggestion display
- [ ] Ruleset selector (NMJL 2026 / Chinese Traditional)
- [ ] Game-state JSON import/export for sharing positions

## Assets

- [ ] Source or generate visual mahjong tile images (suits, winds, dragons, flowers, jokers)
- [ ] Decide on license-compatible tile art (existing public-domain sets exist)

## Tests

- [ ] Tile equality + counting tests
- [ ] Game-state construction tests
- [ ] NMJL hand-distance computation tests (once `evaluateTargets` lands)
- [ ] Chinese hand enumeration tests
- [ ] Vitest coverage report setup

## Docs

- [ ] Write the Chinese traditional strategy guide (currently a placeholder)
- [ ] Add per-year NMJL ruleset onboarding doc (how to add a new card year)
- [ ] Document the joker-substitution algorithm once implemented

## Tooling

- [ ] Add ESLint + Prettier configs (skipped during initial scaffold)
- [ ] Add CI: GitHub Actions running `pnpm check && pnpm test` on push
- [ ] Decide on adapter for deployment (static, node, vercel) when ready to ship

## Reach goals

- [ ] WebGL "clacky" tiles: real digital tiles that shoot onto the board with physics and a satisfying clack. Aspirational presentation layer.
    - Lives entirely in `src/lib/components/` — purely presentational, never touches `engine/` or the rulesets (the core has no notion of a board or a deal).
    - Pick a renderer: raw WebGL is heavy for this; evaluate `three.js` (full 3D + physics) vs. a lighter 2.5D approach (CSS 3D transforms / `pixi.js` sprites) before committing.
    - Physics for the "shoot on + clack": either a real engine (`cannon-es`/`rapier`) or scripted tweened arcs with a settle bounce. Scripted is cheaper and more art-directable; full physics is more "real."
    - Audio: positional clack samples on tile-settle; respect `prefers-reduced-motion` (and a mute toggle) — motion/sound must be opt-out.
    - Needs tile art with real faces (see Assets) — the flat-typography glyphs won't carry a 3D treatment. This is the long pole.
    - Integration question to resolve first: the app is a position *editor*, not a game with a deal animation, so define what event "shoots a tile onto the board" (adding a tile to hand? committing a Charleston pass?).

## Out of scope / parking lot

- Persistence and state sync across sessions
- Multiplayer or live-game integration
- Mobile-specific UI considerations
- Public deployment / hosting
