# Product

A study tool for the mahjong-engine — a position analyzer for American NMJL (and eventually Chinese traditional) that exposes its reasoning instead of hiding it.

## Register

`product` — this is a tool surface, not marketing. The design serves the work; the work is reading mahjong positions.

## Users

NMJL learners who already know how to play but want to understand *why* one discard or pass is better than another. They have the 2026 card in hand or nearby. They've read the rules, they've played a few games, and they want to develop intuition by watching a competent engine reason through positions they construct.

Secondary: the engine's author, validating that `evaluateTargets` / `suggestDiscard` produce sensible output on hand-built positions.

Not for: beginners learning the rules from scratch, live in-game play, gambling, multiplayer.

## Voice & tone

- Explanatory without condescension. The user knows mahjong; they don't necessarily know the engine.
- Tile glyphs are the loudest element on screen. The chrome around them is austere on purpose — type, line, neutral surfaces. No decorative borders, no gradient flair.
- Reasoning is always traceable. The engine's discard suggestion is never a black-box verdict; the UI shows which target hand drove it and which tiles that hand still needs.
- When something is uncertain (low completion scores across the board, unenforceable joker constraints), say so plainly.

## Strategic principles

1. **Tiles are typography.** Their relative sizing, weight, and rhythm carry the meaning. Hover, focus, and selection states are restrained — a tile is information, not a button.
2. **Editing is the primary action.** Every part of the position (hand, exposures, opponent exposures, discards, phase) is inline-editable. No modal pickers, no separate "edit mode."
3. **Calm under load.** A full position is dense — 13+ concealed tiles, up to 4 exposed groups, 3 opponents × multiple exposures, growing discard pile. The screen must not feel like an air-traffic-control panel even at maximum density.
4. **Show the engine's seam.** Ranked targets are visible by default with their completion scores and missing tiles. The user can pin a target to override the engine's choice and see how the suggestion changes.
5. **Real tile vocabulary.** Use the engine's tile model directly. No simplified suit names, no renamed dragons. The user learns the same vocabulary the engine speaks.

## Anti-references

What this is explicitly *not*:

- **Casino / gambling apps.** Felt-green tables, gold trim, Vegas typography, animated coin showers. None of that.
- **Toy mahjong solitaire apps.** Bright primaries, cartoon tile faces, sticker UI, confetti on win.
- **Generic SaaS dashboards.** Metric cards with up-arrows, "12% increase" deltas, gradient-tinted KPI tiles. There are no KPIs here.
- **Stockfish chess analyzers verbatim.** The framing is inspirational but the aesthetic is not — chess analyzer UIs lean heavily on board geometry and arrow overlays; mahjong has no such spatial structure to lean on.
- **Asian-pastiche decor.** Bamboo backgrounds, dragon flourishes, ornamental frames, calligraphic display fonts borrowed from East Asian visual culture for flavor. The tiles already are the cultural artifact; surrounding them in cosplay cheapens them.
