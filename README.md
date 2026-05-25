# mahjong-engine

A stockfish-style evaluator for mahjong. Input your tiles and game state, get a ranked list of viable target hands and a suggested discard.

**Status**: skeleton scaffold. No evaluation logic implemented yet.

## Why

Mahjong has fewer well-engineered analysis tools than chess. This project explores whether the stockfish pattern — fast static evaluation feeding suggestions, not full search — translates to mahjong's hidden-information, probabilistic structure.

## Supported rulesets

| Ruleset | Module | Status |
|---|---|---|
| American NMJL 2026 | `src/lib/rulesets/nmjl-2026/` | interface stub |
| Chinese Traditional | `src/lib/rulesets/chinese-traditional/` | interface stub |

Adding a ruleset means implementing the `Ruleset` interface in `src/lib/engine/ruleset.ts`. See [docs/architecture/ruleset-abstraction.md](docs/architecture/ruleset-abstraction.md).

## Repository layout

```
docs/
  strategy/       — player-facing strategy guides (universal + per-ruleset)
  architecture/   — engineering design docs
src/
  lib/
    engine/       — ruleset-agnostic core (tiles, game state, Ruleset interface)
    rulesets/     — ruleset implementations
    components/   — Svelte UI components (none yet)
  routes/         — SvelteKit pages
tests/            — Vitest suites
```

## Quickstart

```sh
pnpm install
pnpm dev           # SvelteKit dev server
pnpm check         # TypeScript + Svelte type checking
pnpm test          # Vitest
```

## Docs

- [Documentation index](docs/README.md)
- [Architecture overview](docs/architecture/overview.md)
- [Ruleset abstraction](docs/architecture/ruleset-abstraction.md)
- [Evaluation engine design](docs/architecture/evaluation-engine.md)
- [American NMJL 2026 strategy](docs/strategy/american-nmjl-2026.md)
- [Universal concepts](docs/strategy/concepts.md)

## License

MIT
