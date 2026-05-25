# Ruleset Abstraction

The `Ruleset` interface (`src/lib/engine/ruleset.ts`) is the seam between the ruleset-agnostic engine and concrete mahjong variants. It is small on purpose.

## The Interface

```ts
interface Ruleset {
  readonly id: string;        // 'nmjl-2026', 'chinese-traditional'
  readonly name: string;
  readonly version: string;

  evaluateTargets(state: GameState): TargetEvaluation[];
  isWinningHand(state: GameState): boolean;
  suggestDiscard(state: GameState, target?: TargetHand): TileSuggestion;
}
```

Three methods. All take a `GameState` (defined in `gameState.ts`). All return primitives the UI can render directly.

## Why This Shape

The two rulesets we target are *structurally different*:

| Aspect | American NMJL | Chinese Traditional |
|---|---|---|
| Winning hand | Match fixed card pattern | Any valid 4 sets + 1 pair |
| Hand definition | Static list (~70 patterns) | Generative (combinatorial) |
| Jokers | Yes, substitute in 3+ groups | No (in most variants) |
| Chi (runs) | Only in specific card hands | Universal |
| Scoring timing | After win, multiplier-based | After win, fan-based |
| Concealment | Some hands required concealed | Concealment is a fan bonus |

Despite these differences, the *output shape* the player needs is the same: a list of candidate hands with progress estimates, and a discard suggestion. So the interface lifts those output types out, and ruleset implementations differ only in how they compute them.

## Per-Ruleset Implementation Strategy

### NMJL: Pattern Matching
- Maintain `HANDS: NMJLHand[]` — encoded card patterns
- For each hand, compute distance from current tiles (with joker substitution)
- Rank by distance + flexibility heuristics

The card data is static for a year. `evaluateTargets` is roughly `HANDS.map(distanceFrom).sort()`.

### Chinese Traditional: Generative Search
- No fixed hand list. Enumerate possible 4-set + 1-pair structures from current tiles
- For each candidate structure, compute distance to completion
- Rank by (distance, expected fan score)

The expensive part is enumeration. This will need pruning heuristics — likely "only consider structures consistent with the suit/honor distribution actually held."

## What Lives Outside the Ruleset

These belong in `engine/`, not in any ruleset:

- Tile types and equality (`tiles.ts`)
- Game state shape (`gameState.ts`)
- Evaluator orchestration (`evaluator.ts`)
- Discard pool tracking and tile-count math
- UI rendering of evaluations

## What Lives Inside the Ruleset

- Winning-hand definitions (data or generation)
- Joker / wild-tile rules
- Calling rules (which discards can be called, by whom)
- Scoring rules (if used)
- Hand-specific notation parsing (e.g., NMJL's `FFFF 1111 1111 1111` shorthand)

## Future Considerations

- **Per-year NMJL rulesets**: each annual card will be its own module (`nmjl-2027`, etc.) since hand patterns change. The `Ruleset` interface accommodates this — they're separate ruleset instances with different IDs.
- **Regional Chinese variants**: Hong Kong, Taiwanese, Cantonese, etc. Each can be a separate ruleset implementation when needed, all reusing common tile and game-state types.
