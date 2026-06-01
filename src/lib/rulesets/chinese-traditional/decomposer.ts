import type { NumberTile, Suit, Tile } from '../../engine/tiles';
import { compareTiles, tileEquals, tileKey } from '../../engine/tiles';

// Decomposes a tile multiset into the standard mahjong winning shape (1 pair + 4 sets) — or
// the best partial approximation when the hand isn't yet complete. Used by both `isWinningHand`
// and target evaluation. The decomposer is intentionally ruleset-agnostic about scoring: it
// finds *structural* decompositions and reports what's missing; the caller filters and scores.

export type SetKind = 'chow' | 'pung' | 'kong';

// A meld in the decomposition. `tiles` lists the physical tiles that fill the meld in canonical
// order (chow: ascending rank in one suit; pung: 3 copies; kong: 4). `filled` says how many of
// those positions are actually present in the input hand+exposures; the rest are `needed`.
// For complete melds `needed` is empty.
export interface DecompSet {
	kind: SetKind;
	tiles: Tile[];
	filled: number;
	needed: Tile[];
	fromExposure: boolean;
}

export interface DecompPair {
	tile: Tile;
	filled: 0 | 1 | 2;
	needed: Tile[]; // 0, 1, or 2 tiles
}

export interface Decomposition {
	pair: DecompPair | null;
	sets: DecompSet[];
	tilesNeeded: Tile[];
	// Concealed tiles that the partition wasn't able to assign to a pair or set. These exist
	// only when the hand is far from tenpai (every partial-meld attempt would have made things
	// worse). The completion score penalizes them as wasted tiles.
	floats: Tile[];
}

export interface DecomposeOptions {
	// Pre-decomposed exposures (each one a complete pung/kong/chow). The decomposer treats
	// these as fixed slots in the partition and only searches the concealed remainder.
	exposures?: DecompSet[];
	// If supplied, only decompositions whose set list passes this predicate are kept. The
	// caller (an archetype) uses this to enforce "all pungs", "pure suit", etc. during search
	// — pruning early is much cheaper than enumerating then filtering.
	filter?: (sets: DecompSet[], pair: DecompPair | null) => boolean;
}

// ---------------------------------------------------------------------------------------------
// Tile-multiset operations. We work on a sorted array (canonical order from `compareTiles`) and
// shrink it with pure removals. A pre-sort up front keeps every recursive step's "lowest tile"
// at index 0.

function sortTiles(tiles: Tile[]): Tile[] {
	return [...tiles].sort(compareTiles);
}

function multisetKey(tiles: Tile[]): string {
	// Tiles are pre-sorted, so the joined key uniquely identifies the multiset.
	let out = '';
	for (const t of tiles) out += tileKey(t) + ',';
	return out;
}

function removeOne(tiles: Tile[], target: Tile): Tile[] {
	const out: Tile[] = [];
	let removed = false;
	for (const t of tiles) {
		if (!removed && tileEquals(t, target)) {
			removed = true;
			continue;
		}
		out.push(t);
	}
	return out;
}

function removeMany(tiles: Tile[], targets: Tile[]): Tile[] {
	let remaining = tiles;
	for (const t of targets) remaining = removeOne(remaining, t);
	return remaining;
}

function countOf(tiles: Tile[], target: Tile): number {
	let n = 0;
	for (const t of tiles) if (tileEquals(t, target)) n++;
	return n;
}

function isHonor(t: Tile): boolean {
	return t.kind === 'wind' || t.kind === 'dragon';
}

function isNumber(t: Tile): t is NumberTile {
	return t.kind === 'number';
}

function numberAt(suit: Suit, rank: number): Tile | null {
	if (rank < 1 || rank > 9) return null;
	return { kind: 'number', suit, rank: rank as NumberTile['rank'] };
}

// ---------------------------------------------------------------------------------------------
// Exposure classification. Callers pass `Exposure` from the engine layer; we turn each into a
// `DecompSet`. The exposure's tiles tell us its kind directly.

export function classifyExposure(tiles: Tile[]): DecompSet | null {
	if (tiles.length === 4) {
		const first = tiles[0];
		if (tiles.every((t) => tileEquals(t, first))) {
			return { kind: 'kong', tiles: sortTiles(tiles), filled: 4, needed: [], fromExposure: true };
		}
		return null;
	}
	if (tiles.length === 3) {
		const first = tiles[0];
		if (tiles.every((t) => tileEquals(t, first))) {
			return { kind: 'pung', tiles: sortTiles(tiles), filled: 3, needed: [], fromExposure: true };
		}
		// Chow check: three number tiles in the same suit at consecutive ranks
		if (tiles.every(isNumber)) {
			const sorted = sortTiles(tiles);
			const a = sorted[0] as NumberTile;
			const b = sorted[1] as NumberTile;
			const c = sorted[2] as NumberTile;
			if (a.suit === b.suit && b.suit === c.suit && b.rank === a.rank + 1 && c.rank === b.rank + 1) {
				return { kind: 'chow', tiles: sorted, filled: 3, needed: [], fromExposure: true };
			}
		}
	}
	return null;
}

// ---------------------------------------------------------------------------------------------
// Pre-processing. Strip tiles that don't participate in structural decomposition: flowers and
// seasons are bonus tiles, jokers are not used in this ruleset. Anything that survives is
// either a number, wind, or dragon — the only meld-eligible kinds.

export function partitionStructuralTiles(tiles: Tile[]): { structural: Tile[]; flowers: number } {
	let flowers = 0;
	const structural: Tile[] = [];
	for (const t of tiles) {
		if (t.kind === 'flower') flowers++;
		else if (t.kind === 'joker') continue; // not used in this ruleset; ignore defensively
		else structural.push(t);
	}
	return { structural: sortTiles(structural), flowers };
}

// ---------------------------------------------------------------------------------------------
// The set search. Given a sorted remaining-tile array and a target set count, enumerate ways
// to form that many sets (possibly partial). Returns the partition with the fewest `needed`
// tiles. Memoized on (multiset key, remaining sets) — the same subhand at the same depth has
// the same best partition no matter how we got there.

interface SetSearchResult {
	sets: DecompSet[];
	floats: Tile[];
	needed: number; // count of needed tiles across all sets (= total - filled)
}

function emptyResult(): SetSearchResult {
	return { sets: [], floats: [], needed: 0 };
}

function totalNeededOf(result: SetSearchResult): number {
	return result.needed + result.floats.length;
}

// Combine search outputs. The base case for "produce N sets from this multiset" composes a
// chosen front meld with the recursive tail.
function compose(front: DecompSet, tail: SetSearchResult): SetSearchResult {
	return {
		sets: [front, ...tail.sets],
		floats: tail.floats,
		needed: tail.needed + front.needed.length
	};
}

function chooseBetter(a: SetSearchResult, b: SetSearchResult): SetSearchResult {
	// Fewer total needed-or-float tiles wins. Tie-break on fewer floats (a partial meld
	// progresses a wait line; a float is dead weight). Second tie-break: fewer needed tiles
	// total (favor completer melds).
	const aTotal = totalNeededOf(a);
	const bTotal = totalNeededOf(b);
	if (aTotal !== bTotal) return aTotal < bTotal ? a : b;
	if (a.floats.length !== b.floats.length) return a.floats.length < b.floats.length ? a : b;
	return a.needed <= b.needed ? a : b;
}

function searchSets(
	remaining: Tile[],
	setsNeeded: number,
	memo: Map<string, SetSearchResult>
): SetSearchResult {
	if (setsNeeded === 0) {
		// Anything left over becomes a float — partial sets the pair-search-layer might have
		// kept around but can't promote into a numbered meld.
		return { sets: [], floats: remaining, needed: 0 };
	}
	if (remaining.length === 0) {
		// Need N sets but no tiles — every slot of every set is a needed tile (3 per set).
		const sets: DecompSet[] = [];
		for (let i = 0; i < setsNeeded; i++) {
			sets.push({
				kind: 'pung',
				tiles: [],
				filled: 0,
				needed: [], // sentinel; we score these as "3 unknown tiles needed" below
				fromExposure: false
			});
		}
		return { sets, floats: [], needed: setsNeeded * 3 };
	}

	const key = `${setsNeeded}|${multisetKey(remaining)}`;
	const cached = memo.get(key);
	if (cached) return cached;

	const anchor = remaining[0];
	const anchorCount = countOf(remaining, anchor);
	const candidates: SetSearchResult[] = [];

	// Option: complete kong (4 of a kind).
	if (anchorCount >= 4) {
		const kong: DecompSet = {
			kind: 'kong',
			tiles: [anchor, anchor, anchor, anchor],
			filled: 4,
			needed: [],
			fromExposure: false
		};
		const tail = searchSets(remaining.slice(4), setsNeeded - 1, memo);
		candidates.push(compose(kong, tail));
	}
	// Option: complete pung (3 of a kind).
	if (anchorCount >= 3) {
		const pung: DecompSet = {
			kind: 'pung',
			tiles: [anchor, anchor, anchor],
			filled: 3,
			needed: [],
			fromExposure: false
		};
		const tail = searchSets(remaining.slice(3), setsNeeded - 1, memo);
		candidates.push(compose(pung, tail));
	}
	// Option: complete chow. Anchor must be a number tile with rank ≤ 7, and rank+1 and
	// rank+2 must both be present in the same suit.
	if (isNumber(anchor) && anchor.rank <= 7) {
		const mid = numberAt(anchor.suit, anchor.rank + 1)!;
		const hi = numberAt(anchor.suit, anchor.rank + 2)!;
		if (countOf(remaining, mid) >= 1 && countOf(remaining, hi) >= 1) {
			const chow: DecompSet = {
				kind: 'chow',
				tiles: [anchor, mid, hi],
				filled: 3,
				needed: [],
				fromExposure: false
			};
			const tail = searchSets(removeMany(removeMany(remaining.slice(1), [mid]), [hi]), setsNeeded - 1, memo);
			candidates.push(compose(chow, tail));
		}
	}
	// Option: partial pung (2 of a kind), needs one more of the anchor. Honors only become
	// pungs; for number tiles this is also a legitimate partial.
	if (anchorCount >= 2) {
		const partialPung: DecompSet = {
			kind: 'pung',
			tiles: [anchor, anchor],
			filled: 2,
			needed: [anchor],
			fromExposure: false
		};
		const tail = searchSets(remaining.slice(2), setsNeeded - 1, memo);
		candidates.push(compose(partialPung, tail));
	}
	// Option: partial chow with the adjacent tile (ryanmen / penchan in riichi terms). Honors
	// can't form chows so this only fires for number tiles.
	if (isNumber(anchor) && anchor.rank <= 8) {
		const next = numberAt(anchor.suit, anchor.rank + 1)!;
		if (countOf(remaining, next) >= 1) {
			const needed: Tile[] = [];
			// Two-sided wait if both rank-1 and rank+2 are legal (rank between 2 and 7); single
			// otherwise. We pick the lower needed tile as the canonical representative so the
			// UI tiles-needed list is deterministic; both are equally valid waits.
			const lo = numberAt(anchor.suit, anchor.rank - 1);
			const hi = numberAt(anchor.suit, anchor.rank + 2);
			if (lo) needed.push(lo);
			else if (hi) needed.push(hi);
			// If lo is present, hi is the alternative; we still only consume one of the two on
			// completion so a single `needed` entry is correct.
			const partialChow: DecompSet = {
				kind: 'chow',
				tiles: [anchor, next],
				filled: 2,
				needed,
				fromExposure: false
			};
			const tail = searchSets(removeOne(remaining.slice(1), next), setsNeeded - 1, memo);
			candidates.push(compose(partialChow, tail));
		}
	}
	// Option: kanchan chow (gap of 1), needs the middle tile.
	if (isNumber(anchor) && anchor.rank <= 7) {
		const hi = numberAt(anchor.suit, anchor.rank + 2)!;
		if (countOf(remaining, hi) >= 1) {
			const mid = numberAt(anchor.suit, anchor.rank + 1)!;
			const partialChow: DecompSet = {
				kind: 'chow',
				tiles: [anchor, hi],
				filled: 2,
				needed: [mid],
				fromExposure: false
			};
			const tail = searchSets(removeOne(remaining.slice(1), hi), setsNeeded - 1, memo);
			candidates.push(compose(partialChow, tail));
		}
	}
	// Option: float the anchor. The recursion proceeds without consuming this tile against
	// the set quota — letting the search "waste" a tile is sometimes the only way to find a
	// good partition of the remaining hand.
	{
		const tail = searchSets(remaining.slice(1), setsNeeded, memo);
		candidates.push({ ...tail, floats: [anchor, ...tail.floats] });
	}

	let best = candidates[0];
	for (let i = 1; i < candidates.length; i++) best = chooseBetter(best, candidates[i]);
	memo.set(key, best);
	return best;
}

// ---------------------------------------------------------------------------------------------
// Top-level decomposition. Tries each candidate pair (including a no-pair branch that costs one
// "needed tile" for the pair), runs the set search on the remainder, and returns the best
// overall partition.

function pairCandidates(tiles: Tile[]): Tile[] {
	const seen = new Set<string>();
	const out: Tile[] = [];
	for (const t of tiles) {
		const k = tileKey(t);
		if (seen.has(k)) continue;
		seen.add(k);
		if (countOf(tiles, t) >= 2) out.push(t);
	}
	return out;
}

function applyFilter(partition: Decomposition, filter: DecomposeOptions['filter']): boolean {
	if (!filter) return true;
	return filter(partition.sets, partition.pair);
}

function buildPartition(
	pair: DecompPair | null,
	result: SetSearchResult,
	exposures: DecompSet[]
): Decomposition {
	const sets = [...exposures, ...result.sets];
	const needed: Tile[] = [];
	if (pair) for (const n of pair.needed) needed.push(n);
	for (const s of sets) for (const n of s.needed) needed.push(n);
	// Sets the searcher emitted with empty `tiles` represent "need a full meld here"; those
	// register their 3-needed contribution via the searcher's `needed` accumulator. They get
	// surfaced in `tilesNeeded` as anonymous placeholders so the count is right; the UI side
	// can render them as "?" until the algorithm knows what to ask for.
	// Specifically: each empty `tiles` set contributes 3 unknown needs.
	let phantomNeeds = 0;
	for (const s of result.sets) if (s.tiles.length === 0) phantomNeeds += 3;
	// We don't have a Tile to represent "any tile" — encode as a generic NumberTile 1-crack.
	// The score uses count, not identity, for these. Callers reading `tilesNeeded` should
	// treat the trailing phantoms as "any meld tile" — they get a distinguishable index by
	// being padded at the end and the count being known via `floats.length === 0` cases.
	for (let i = 0; i < phantomNeeds; i++) {
		needed.push({ kind: 'number', suit: 'crack', rank: 1 });
	}
	return { pair, sets, tilesNeeded: needed, floats: result.floats };
}

export function bestDecomposition(tiles: Tile[], opts: DecomposeOptions = {}): Decomposition {
	const exposures = opts.exposures ?? [];
	const setsNeeded = Math.max(0, 4 - exposures.length);
	const memo = new Map<string, SetSearchResult>();

	let best: Decomposition | null = null;
	const consider = (cand: Decomposition) => {
		if (!applyFilter(cand, opts.filter)) return;
		if (!best) {
			best = cand;
			return;
		}
		if (cand.tilesNeeded.length < best.tilesNeeded.length) best = cand;
		else if (cand.tilesNeeded.length === best.tilesNeeded.length && cand.floats.length < best.floats.length) best = cand;
	};

	// Branch 1: try each tile in the hand as the pair.
	for (const pairTile of pairCandidates(tiles)) {
		const pair: DecompPair = { tile: pairTile, filled: 2, needed: [] };
		const remaining = removeMany(tiles, [pairTile, pairTile]);
		const result = searchSets(remaining, setsNeeded, memo);
		consider(buildPartition(pair, result, exposures));
	}
	// Branch 2: every singleton could become a pair with one more copy drawn. This matters
	// when no natural pair exists yet (early game). For each unique tile, try treating it as
	// the partial pair (filled=1, needs 1).
	const singletonCandidates = uniqueTiles(tiles).filter(
		(t) => countOf(tiles, t) === 1 && pairCandidates(tiles).every((p) => !tileEquals(p, t))
	);
	for (const t of singletonCandidates) {
		const pair: DecompPair = { tile: t, filled: 1, needed: [t] };
		const remaining = removeOne(tiles, t);
		const result = searchSets(remaining, setsNeeded, memo);
		consider(buildPartition(pair, result, exposures));
	}
	// Branch 3: no pair from current hand at all. The pair becomes two needed tiles (any
	// matching pair). This fires only when the hand has zero candidate pairs — otherwise the
	// branches above already cover better lines.
	if (tiles.length === 0) {
		const pair: DecompPair = {
			tile: { kind: 'number', suit: 'crack', rank: 1 },
			filled: 0,
			needed: [
				{ kind: 'number', suit: 'crack', rank: 1 },
				{ kind: 'number', suit: 'crack', rank: 1 }
			]
		};
		const result = searchSets([], setsNeeded, memo);
		consider(buildPartition(pair, result, exposures));
	}

	if (!best) {
		// Fall back to an all-needed partition. This only happens if the filter rejected every
		// candidate — return a partition that satisfies the count contract even if it's far
		// from winning, so the caller can render a sensible "fully unfilled" target.
		const result = searchSets([], setsNeeded, memo);
		const pair: DecompPair = {
			tile: { kind: 'number', suit: 'crack', rank: 1 },
			filled: 0,
			needed: [
				{ kind: 'number', suit: 'crack', rank: 1 },
				{ kind: 'number', suit: 'crack', rank: 1 }
			]
		};
		return buildPartition(pair, result, exposures);
	}
	return best;
}

function uniqueTiles(tiles: Tile[]): Tile[] {
	const seen = new Set<string>();
	const out: Tile[] = [];
	for (const t of tiles) {
		const k = tileKey(t);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(t);
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// Helpers for downstream consumers.

export function decompositionIsWinning(d: Decomposition): boolean {
	if (!d.pair || d.pair.filled !== 2) return false;
	if (d.floats.length > 0) return false;
	if (d.sets.length !== 4) return false;
	return d.sets.every((s) => s.filled === (s.kind === 'kong' ? 4 : 3));
}

export function totalStructuralSlots(d: Decomposition): number {
	// Pair contributes 2, each pung/chow 3, each kong 4. Empty (phantom) sets contribute 3.
	let n = 2;
	for (const s of d.sets) n += s.kind === 'kong' ? 4 : 3;
	return n;
}

export function totalFilledSlots(d: Decomposition): number {
	let n = d.pair ? d.pair.filled : 0;
	for (const s of d.sets) n += s.filled;
	return n;
}

// Re-export common helpers so the rest of the ruleset can import from one place.
export { sortTiles, isHonor, isNumber, numberAt, countOf };
