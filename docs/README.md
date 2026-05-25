# Documentation

## Strategy

Player-facing strategic guides. Universal concepts live in `concepts.md`;
ruleset-specific guides live alongside.

- [Concepts](strategy/concepts.md) — universal mahjong concepts (joker rules, concealed
  hands, Charleston mechanics, exposure reads, tile families).
- [American NMJL 2026](strategy/american-nmjl-2026.md) — verified 2026 card transcription,
  joker-friendly hand catalog, flexibility framework, cheat sheet.
- [Chinese Traditional](strategy/chinese-traditional.md) — placeholder with notes on
  how Chinese traditional differs from American.

## Architecture

Engineering-facing design docs for the evaluator.

- [Overview](architecture/overview.md) — design philosophy, the stockfish analogy,
  evaluation phases.
- [Ruleset abstraction](architecture/ruleset-abstraction.md) — the `Ruleset` interface
  and how it accommodates two structurally different rulesets.
- [Evaluation engine](architecture/evaluation-engine.md) — per-ruleset evaluation
  strategies (pattern matching vs generative search).
