# NMJL 2026 Ruleset

American National Mah Jongg League card for 2026.

## Semantics

- Winning requires matching one of ~70 fixed hand patterns on the card
- Jokers substitute in groups of 3+ (pungs, kongs, quints, sextets); never in pairs or singles
- Hands marked `concealed` cannot be built by calling discards (except the final winning tile)
- White dragon acts as zero `0` and is usable with any suit
- Card refreshes annually each spring

## Files

- `index.ts` — `NMJLRuleset` class implementing the `Ruleset` interface
- `hands.ts` — `HANDS` array of `NMJLHand` definitions (currently empty stub)

## Status

Skeleton. Hand patterns are not yet encoded. See `docs/strategy/american-nmjl-2026.md` for
the verified card transcription that will eventually populate `hands.ts`.
