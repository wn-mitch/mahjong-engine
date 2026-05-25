# Mahjong Concepts (Universal)

Cross-ruleset concepts. Specific rulesets refine these in their own strategy guides.

## Tile Groups

A mahjong hand is built from groups of tiles. Across rulesets, the relevant group sizes are:

| Group | Tiles | Notes |
|---|---|---|
| Single | 1 | Standalone tile |
| Pair | 2 | Two identical tiles |
| Chi / Run | 3 | Three consecutive numbers in one suit (Chinese trad. only) |
| Pung | 3 | Three identical tiles |
| Kong | 4 | Four identical tiles |
| Quint | 5 | Five identical tiles (American only, via jokers) |
| Sextet | 6 | Six identical tiles (American only, via jokers) |

## Jokers (American Only)

- Substitute for any tile in a group of **3 or more identical tiles** (pung, kong, quint, sextet)
- Cannot substitute in pairs or singles
- Can be redeemed: if a joker is in an opponent's exposed meld, you can swap your matching natural tile for it on your turn

Chinese traditional generally does not use jokers.

## Concealed vs Open

- **Open / exposed**: standard play; you may call discards and place melds face-up on your rack
- **Concealed**: build the entire hand from your own draws; cannot call discards during play (except the final winning tile in most rulesets)

In American, the card explicitly marks some hands as concealed-only. In Chinese traditional, concealment is a scoring bonus applied to any hand.

## Charleston (American Only)

Three mandatory passes at round start, plus one optional courtesy pass:
1. **Right** — pass 3 tiles to the player on your right
2. **Across** — pass 3 to the player opposite
3. **Left** — pass 3 to the player on your left
4. **Courtesy (optional, across)** — agreed pass of 0-3 tiles

Strategic priority during Charleston:
- Pass tiles that fit no plausible candidate hand
- Never pass jokers or flowers
- Keep pairs intact (you cannot reconstitute them — jokers don't substitute in pairs)
- Use the tiles you receive as signal about what your neighbors are *not* building

## Exposures

When a player calls a discard for a pung/kong (or chi in Chinese trad.), they reveal the meld face-up. Each exposure narrows their possible target hand. By the second exposure, an opponent's hand is usually constrained to 1-2 possibilities — track this.

## Tile Family Framework

A "tile family" is a set of tile types that overlap across multiple potential winning hands. Holding tiles concentrated in one family keeps several hands viable simultaneously and lets you defer commitment.

Common families in American play:
- **Evens** (2, 4, 6, 8) — feeds 2026, 2468, and 369 sections
- **Odds** (1, 3, 5, 7, 9) — feeds 13579, Like Numbers, some Consecutive Run
- **Honors** (winds, dragons, flowers) — feeds Winds-Dragons section and most hands' flower groups
- **Consecutive clusters** (any 3-4 adjacent numbers) — feeds the Consecutive Run section

In Chinese traditional, the analogous concept is suit concentration (going for a flush or half-flush).

## Unscored Play

When the table does not track scoring, the optimal objective collapses from expected-value to win-rate. Practical implications:

- Pick the easiest hand, not the highest-value one
- Skip concealed hands (you forfeit the speed benefit of calling for no payoff)
- Call exposures aggressively (no concealment penalty)
- Spend jokers immediately as they fit a committed group (hoarding has zero EV)

## Reading Discards

A player's discards reveal what they don't need:
- Early-discarded suits suggest they aren't pursuing hands in those suits
- A tile they previously discarded becoming "hot" (no longer discarded) suggests a hand pivot
- A player who discards quickly without calling is usually on a concealed hand or struggling

Defensive play in late-game: prefer tiles already discarded (lower call risk) and tiles absent from all visible exposures.
