# Architecture Overview

## Design Philosophy

The tool is a **stockfish-style evaluator** for mahjong: given a game state (your tiles, exposures, observed discards), produce a ranked list of viable target hands and a suggested discard.

Key principles:

1. **Ruleset-agnostic core, ruleset-specific data.** The engine knows about tiles, game state, and the shape of an evaluation — it does not know any specific ruleset's winning conditions. Rulesets plug in via the `Ruleset` interface.
2. **Evaluation is suggestion, not automation.** Output is a ranked list with notes, not a single committed move. Player retains all decisions.
3. **Static analysis first, probability later.** Phase one: distance-to-completion and group-fit. Phase two: probabilistic refinement using tile-count tracking.
4. **No tile semantics leak across ruleset boundaries.** Joker, white-dragon-as-zero, chi sets — all live inside their respective ruleset modules.

## Game Phases

The tool operates over three phases of a round, each with different inputs and outputs:

### 1. Charleston (American only)
- **Input**: 13 starting tiles
- **Output**: ranked candidate target hands, tiles to consider passing, tiles to hold
- **Strategy**: maximize the number of *viable* hands kept alive

### 2. Mid-round play
- **Input**: current concealed hand + own exposures + opponent exposures + discard pool
- **Output**: ranked target hands with completion estimates, suggested discard
- **Strategy**: balance progress on committed hand against pivot optionality

### 3. Endgame
- **Input**: same as mid-round, plus turns-remaining estimate
- **Output**: if win is reachable, suggested moves; if not, defensive discard ranking
- **Strategy**: switch from offense to defense when target completion probability drops below threshold

## Module Map

```
src/lib/
├── engine/        — ruleset-agnostic core
│   ├── tiles      — tile types and helpers
│   ├── gameState  — player state, exposures, discards
│   ├── ruleset    — Ruleset interface + supporting types
│   └── evaluator  — orchestrator (calls ruleset.evaluateTargets)
├── rulesets/      — concrete rulesets
│   ├── nmjl-2026  — American NMJL 2026 card
│   └── chinese-traditional  — Chinese traditional (classical)
└── components/    — Svelte UI components (empty for now)
```

## Stockfish Analogy (and Where It Breaks)

| Stockfish | Mahjong Engine |
|---|---|
| Board position | Game state (hand + exposures + discards) |
| Legal moves | Discards, calls, declarations |
| Evaluation function | `evaluateTargets` returning completion scores |
| Best move | Suggested discard for committed/top target |
| Search depth | (TBD) tile-draw lookahead |

**Where it differs:** chess has perfect information; mahjong has hidden state (opponent hands, wall order). The engine's evaluation will be probabilistic and bounded, not search-tree exhaustive. Long-horizon planning relies on exposed information + discard tracking, not lookahead through opponent moves.

## Status

Skeleton scaffold only. No ruleset has working evaluation. See per-ruleset READMEs and `evaluation-engine.md` for the planned approach.
