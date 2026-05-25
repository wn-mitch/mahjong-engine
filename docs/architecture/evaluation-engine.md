# Evaluation Engine

How `evaluateTargets` produces a ranked list of viable hands for each ruleset.

## Common Shape

```ts
interface TargetEvaluation {
  target: TargetHand;
  tilesNeeded: Tile[];        // delta from current concealed + exposed tiles
  jokerSlotsRemaining: number;
  completionScore: number;    // 0-1; higher is closer to completion
  notes?: string;
}
```

`completionScore` is ruleset-specific. The contract is: higher means closer to mah jongg, scores are comparable within a ruleset but not necessarily across rulesets.

## NMJL Evaluation (Pattern Matching)

### Algorithm sketch

1. For each `NMJLHand` in `HANDS`:
   1. Parse hand pattern into groups (e.g., `222 444 6666 8888` → `[pung 2, pung 4, kong 6, kong 8]`)
   2. For each group, compute the minimum tiles needed from current state (considering jokers as substitutes in groups of 3+)
   3. Sum the tile gap across all groups → distance
   4. Compute `completionScore = 1 - distance / 14`
2. Filter out concealed hands if config says skip-concealed
3. Sort by `completionScore` descending
4. Return top N (default 10)

### Joker substitution rules
- Jokers can fill any slot in a group of 3+
- Cannot fill pairs or singles
- Pairs that need 1 tile and singles that need 1 tile must be filled with natural tiles

### Pivoting heuristic
The notes field on each evaluation can flag "this hand shares X tiles with your current top candidate" — supporting flexibility-aware suggestions.

## Chinese Traditional Evaluation (Generative)

### Algorithm sketch

1. From current tiles (concealed + already-melded), enumerate candidate decompositions into 4 sets + 1 pair
   - Each set is a pung, kong, or chi (consecutive numbers in one suit)
2. Prune decompositions inconsistent with current tile distribution
3. For each candidate decomposition:
   1. Compute tile gap (tiles needed to complete this structure)
   2. Estimate fan/faan score for the completed hand
   3. `completionScore = f(distance, fan)` — weighted toward distance for speed, fan for value
4. Sort and return top N

### Key challenges
- Enumeration combinatorial explosion → need aggressive pruning
- Fan estimation depends on regional variant → variant-specific scoring module
- Wall composition affects probability (which tiles are left in play)

## Tile Pool Tracking

The engine should track which tiles have been "seen" (in your hand, in exposures, in discards) to estimate how many of each tile remain. This refines `completionScore` from "tiles needed exist somewhere" to "tiles needed are still drawable."

Pool math:
- 4 copies of each suit number tile (1-9 in bam/crack/dot = 108)
- 4 copies of each wind (N, E, W, S = 16)
- 4 copies of each dragon (R, G, W = 12)
- Flowers: 8 (typically 2 sets of 4)
- Jokers (American): 8

Seen count = `count in your hand + count in your exposures + count in opponent exposures + count in discard pool`. Remaining = total - seen.

If a tile you need has 0 remaining, the hand is dead.

## Phases of Evaluation

The orchestrator (`engine/evaluator.ts`) is currently a thin pass-through. Future phases may add:

1. **Pre-filter**: skip hands the ruleset says are not viable given hard constraints (e.g., suit incompatibility, dead tiles)
2. **Pivot scoring**: bonus to hands that share tile bases with the current top candidate
3. **Defensive overlay**: when scores are low across all targets, flag defensive discards

## Status

Not implemented. Both ruleset `evaluateTargets` methods return `[]`. This document is the design target for the first real implementation pass.
