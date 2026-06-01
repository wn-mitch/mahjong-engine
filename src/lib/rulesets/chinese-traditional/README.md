# Chinese Traditional Ruleset

Modern Hong Kong-style Chinese mahjong, per
<https://themahjongline.com/pages/how-to-play-chinese-mahjong> with a household
three-suits scoring bonus on top.

Full rules and strategy notes live in `docs/strategy/chinese-traditional.md`.

## Files

- `decomposer.ts` — recursive partition into pair + 4 sets, memoized
- `archetypes.ts` — scoring-pattern targets (Common Hand, All Pungs, All Chows,
  Half Flush, Pure Suit, Three Suits)
- `scoring.ts` — point table + house-rule constants
- `evaluator.ts` — runs archetypes, promotes partials, returns `TargetEvaluation`
- `discard.ts` — completion × points cross-archetype utility, multiplicity bonus
- `index.ts` — `ChineseTraditionalRuleset` implementing the `Ruleset` interface
