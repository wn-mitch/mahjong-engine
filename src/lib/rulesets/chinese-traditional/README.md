# Chinese Traditional Ruleset

Chinese traditional (or "classical") mahjong.

## Semantics (vs American NMJL)

- **Winning structure**: 4 sets + 1 pair, where each set is a chi (run), pung (triplet),
  or kong (quad). No fixed hand list — winning combinations are *generated* from tiles.
- **No jokers** in most regional variants.
- **Scoring**: pattern-based fan/faan after the win. Common patterns include all-pungs,
  pure suit, terminals, dragons, etc.
- **Calling**: can call discards for pung/kong, and for chi only from the player to the left.
- **No flowers/seasons in some variants**; when present, they score bonus points but do
  not count in the 14-tile hand.

## Files

- `index.ts` — `ChineseTraditionalRuleset` class implementing the `Ruleset` interface
- `scoring.ts` — `SCORING_RULES` array typed for fan-based patterns (currently empty stub)

## Status

Skeleton. No evaluation or scoring logic implemented. The key architectural challenge here
is that `evaluateTargets` must *generate* candidate winning hands combinatorially rather
than iterating over a fixed list. See `docs/architecture/evaluation-engine.md`.
