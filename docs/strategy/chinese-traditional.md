# Chinese Traditional Strategy

This is the **modern Hong Kong-style** Chinese mahjong variant played in the user's
household, based on the ruleset documented at
<https://themahjongline.com/pages/how-to-play-chinese-mahjong>, with one house-rule
extension called out below.

The implementation lives at `src/lib/rulesets/chinese-traditional/`. The architecture
notes — why it's generative rather than pattern-matched — are in
`docs/architecture/ruleset-abstraction.md`.

## Tiles

Standard 144-tile set:

- 3 suits × 9 ranks × 4 copies = 108 number tiles (萬 cracks, 索 bams, 筒 dots)
- 4 winds × 4 copies = 16 wind tiles (E/S/W/N)
- 3 dragons × 4 copies = 12 dragon tiles (red, green, white)
- 4 flowers + 4 seasons = 8 bonus tiles

**No jokers, no blanks.** The engine's tile pool still includes joker definitions for
NMJL compatibility; the Chinese decomposer strips them defensively if it ever sees one.

## Winning shape

**Exactly four sets and one pair.** Sets are:

- **Chow** — three consecutive number tiles in the same suit (e.g., 4–5–6 bamboo).
- **Pung** — three identical tiles.
- **Kong** — four identical tiles. Counts as one of the four sets, but consumes four
  tiles, so a hand with K kongs has `13 + K` structural tiles plus the winning tile.

Honors (winds, dragons) form pungs and kongs only — never chows.

Bonus tiles (flowers, seasons) sit in a separate stack; they don't participate in
the four-sets-plus-pair structure but score +1 each.

## Calling and turn order

- Play moves counterclockwise (right around the table from the dealer's perspective).
- **Pung/kong**: any player may call a discard from anyone to complete a pung or kong.
- **Chow**: only from the previous player (the seat to your left), and equivalently
  only on your own turn.
- A player can claim a discard for a pair only if it's the final tile to declare
  Mahjong.
- An exposed pung cannot be promoted to a kong via a discard — the upgrade only
  happens by self-draw.

## No Charleston

Play begins immediately after the deal. The `suggestCharlestonPass` method on the
Chinese ruleset returns an empty suggestion with a "no Charleston" rationale; the
shared UI still calls it because the interface requires it.

## Scoring

The advisor ranks targets by **completion × expected points**, surfacing both the
percent-complete bar and the point total in each target's notes string.

Points (per the linked source):

| Source | Points |
| --- | ---: |
| All Pungs (4 pungs/kongs, any pair) | 6 |
| All Chows (4 chows, number pair) | 2 |
| One dragon pung/kong | 2 |
| Two dragon pungs/kongs | 6 (replaces the linear 2 × 2) |
| Three dragon pungs/kongs | 8 (small extension; the source is silent) |
| Seat wind pung/kong | 2 |
| Round (prevalent) wind pung/kong | 2 |
| Self-draw win | 1 |
| Each flower or season | 1 |

The seat wind and round wind bonuses stack — a pung of East when you're the East
seat in an East round scores 2 + 2 = 4.

Shape bonuses added by this advisor (not in the source's explicit table, but standard
elsewhere in HK play):

| Source | Points | Notes |
| --- | ---: | --- |
| Half Flush | 3 | One number suit + honors. Tunable constant. |
| Pure Suit | 6 | One number suit, no honors. Tunable constant. |

### House-rule extension

**Three Suits Represented (+2 points).** When at least one set comes from each of the
three suits, an additional +2 is awarded. This isn't in the linked source — it's
specific to the user's household. The bonus is controlled by
`includeThreeSuitBonus` in the scoring context (`true` by default).

### No minimum to declare Mahjong

The source describes an optional 8-point minimum-to-win rule; this implementation does
**not** enforce it. Any structural completion of four sets plus one pair wins,
regardless of point value. If the rule is later wanted it's a one-line guard in
`isWinning`.

## Advisor architecture

The Chinese ruleset is generative rather than pattern-matched:

- **`decomposer.ts`** — recursive search that partitions a tile multiset into one
  pair plus four sets (chow/pung/kong), memoized by multiset key. Returns the
  partition that minimizes "needed tiles + floats." Supports an `exposures` input so
  already-claimed melds are taken as fixed.
- **`archetypes.ts`** — the user-facing targets: Common Hand, All Pungs, All Chows,
  Half Flush, Pure Suit, Three Suits. Each archetype is a filter applied to the
  decomposer's search plus a shape-bonus ceiling for ranking.
- **`scoring.ts`** — the point table above, applied to the hypothetically-completed
  decomposition.
- **`evaluator.ts`** — for each archetype, runs the constrained decomposer, promotes
  partial melds to complete melds for scoring, and returns a `TargetEvaluation`.
- **`discard.ts`** — sums each tile's utility across archetypes (weighted by
  completion × expected points), plus a small multiplicity bonus for tiles held in
  pair/triplet form (so a near-pung doesn't look like a singleton just because the
  canonical partition didn't pick it), and recommends the lowest-utility tile.
- **`index.ts`** — wires it into the `Ruleset` interface.

## Strategic notes

- **Suit concentration scores heavily.** Pure Suit's +6 and Half Flush's +3 mean a
  three-chow hand in one suit is worth committing to early when the deal cooperates.
- **Pung vs chow tension.** Chow sets are easier to complete (more wait tiles) but
  score less; pung-heavy hands score the All Pungs +6 and qualify for dragon and
  wind bonuses, but each pung needs two more of the same tile.
- **Honors gate the highest-scoring hands.** A pung of seat wind or round wind earns
  2 points each, and dragon pungs stack — three dragon pungs is worth 8 alone.
- **Defensive value of safe tiles.** No fixed hand list means every discard is
  potentially someone's winning tile; late-game defense reads exposures and discards
  more than fixed-target patterns.

## Open follow-ups

These are tracked in `TODO.md` and not implemented in this advisor:

- Rare archetypes — Seven Pairs (七对子), All Terminals, Greater/Lesser Sequence,
  Thirteen Orphans. Add as more `archetypes.ts` entries when they're wanted.
- Scoring-mode parity for NMJL. The Chinese ruleset already ranks by score; NMJL
  still ranks purely by completion.
- Seat / round wind UI control. The fields live on `GameState` (default East/East)
  but no UI exposes them yet.
- Tile-pool tracker integration. Once the tracker lands, the discard heuristic can
  downgrade tiles statistically unreachable in the remaining wall.
