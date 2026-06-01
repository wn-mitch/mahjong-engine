import type { Tile } from '../../engine/tiles';
import type { Decomposition, DecompSet } from './decomposer';
import {
	ALL_CHOWS_POINTS,
	ALL_PUNGS_POINTS,
	HALF_FLUSH_POINTS,
	PURE_SUIT_POINTS,
	THREE_SUIT_BONUS_POINTS,
	type ScoringContext
} from './scoring';

// Archetypes describe the *kind* of winning hand a target represents. They serve two roles:
//
// 1. A filter passed into the decomposer, pruning structurally-incompatible partitions during
//    search. E.g., the All Pungs filter rejects any partition that picks a chow.
// 2. An archetype-specific point ceiling — the headline scoring bonus the player would earn
//    by reaching that shape. Combined with `completionScore` from the decomposer, this gives
//    the advisor a "completion × value" ranking key.
//
// Concrete honor / flower / wind / self-draw bonuses are computed by `scoring.ts` against the
// realized decomposition; the archetype layer only owns the shape-specific bonus.

export interface Archetype {
	id: string;
	label: string;
	description: string;
	// Filter is consulted during decomposer search. The partition's sets and pair are passed
	// in their current (possibly partial) form. The filter must accept partial decompositions
	// that *could* still meet the archetype's shape — over-aggressive rejection here will
	// kill viable lines mid-game.
	filter: (sets: DecompSet[], pair: Decomposition['pair']) => boolean;
	// Shape-bonus ceiling. Returned as the headline points the archetype contributes if the
	// hand is finished in this shape. 0 for archetypes that don't carry their own bonus (e.g.
	// Common Hand, which only earns whatever honor/wind/flower bonuses the position has).
	shapeBonus: number;
}

// ---------------------------------------------------------------------------------------------
// Filter predicates. Each accepts a partition snapshot from the decomposer's search. Partial
// melds (e.g., a 2-tile pung-in-progress, a chow waiting on its third tile) are still valid
// from the filter's perspective — the decomposer scores partials and partial alignments are
// what the advisor needs to rank a half-built hand.

function meldIsPungShaped(s: DecompSet): boolean {
	// Treat partial pungs (filled=2) as still pung-shaped — they'd become a pung if the player
	// drew the matching tile. A partial chow with filled=2 cannot pivot to a pung, so we don't
	// admit it here.
	return s.kind === 'pung' || s.kind === 'kong';
}

function meldIsChowShaped(s: DecompSet): boolean {
	return s.kind === 'chow';
}

function meldSuit(s: DecompSet): string | null {
	const t = s.tiles[0];
	if (!t) return null;
	if (t.kind === 'number') return t.suit;
	if (t.kind === 'wind') return 'wind';
	if (t.kind === 'dragon') return 'dragon';
	return null;
}

function pairSuit(pair: Decomposition['pair']): string | null {
	if (!pair) return null;
	const t = pair.tile;
	if (t.kind === 'number') return t.suit;
	if (t.kind === 'wind') return 'wind';
	if (t.kind === 'dragon') return 'dragon';
	return null;
}

const everything = () => true;

const allPungsFilter = (sets: DecompSet[]) =>
	sets.every((s) => s.tiles.length === 0 || meldIsPungShaped(s));

const allChowsFilter = (sets: DecompSet[], pair: Decomposition['pair']) => {
	if (!sets.every((s) => s.tiles.length === 0 || meldIsChowShaped(s))) return false;
	// Pair must be a number tile — honors can't form chows but they can pair, which would
	// otherwise sneak past the set-only check.
	if (pair && pair.tile.kind !== 'number') return false;
	return true;
};

// Single-number-suit filter. `allowHonors` toggles whether honors may appear in the partition
// at all; `requireHonors` further demands at least one honor — used to keep Half Flush
// strictly disjoint from Pure Suit. During search a partition's full honor status isn't yet
// known (later branches may still add an honor meld), so `requireHonors` is enforced
// lazily — it only rejects a partition once the final meld is committed (when the partition
// is "saturated", indicated by no phantom-empty sets). We approximate that by checking only
// if every set has tiles; intermediate partial partitions are accepted.
const sameSuitFilter = (allowHonors: boolean, requireHonors: boolean) =>
	(sets: DecompSet[], pair: Decomposition['pair']) => {
		const suits = new Set<string>();
		const honors = new Set<string>();
		const noteTile = (t: Tile) => {
			if (t.kind === 'number') suits.add(t.suit);
			else if (t.kind === 'wind') honors.add('wind');
			else if (t.kind === 'dragon') honors.add('dragon');
		};
		for (const s of sets) for (const t of s.tiles) noteTile(t);
		if (pair) noteTile(pair.tile);
		if (suits.size > 1) return false;
		if (!allowHonors && honors.size > 0) return false;
		if (requireHonors) {
			// Only reject when the partition is finished (no phantom sets) — otherwise we'd
			// prune partial states that could still bring an honor meld online.
			const saturated = sets.length === 4 && sets.every((s) => s.tiles.length > 0);
			if (saturated && honors.size === 0) return false;
		}
		return true;
	};

const threeSuitFilter = (sets: DecompSet[]) => {
	// During search the filter sees partial partitions; rather than insist on three suits at
	// every recursive step (which would prune valid lines), only constrain *upward*: the
	// partition can't already be using all three suits's worth of conflicting structure. A
	// partition that ends with two suits is structurally fine — it just won't *score* the
	// three-suits bonus. So the filter accepts everything; the bonus is applied at scoring.
	void sets;
	return true;
};

// ---------------------------------------------------------------------------------------------
// The archetype list. Order matters only for display — the evaluator sorts by completion × points.

export const ARCHETYPES: Archetype[] = [
	{
		id: 'common-hand',
		label: 'Common Hand',
		description: 'Any 4 sets + 1 pair. Baseline shape with no headline bonus of its own.',
		filter: everything,
		shapeBonus: 0
	},
	{
		id: 'all-pungs',
		label: 'All Pungs',
		description: 'All four sets are pungs or kongs. +6 points.',
		filter: allPungsFilter,
		shapeBonus: ALL_PUNGS_POINTS
	},
	{
		id: 'all-chows',
		label: 'All Chows',
		description: 'All four sets are chows; pair is a number tile. +2 points.',
		filter: allChowsFilter,
		shapeBonus: ALL_CHOWS_POINTS
	},
	{
		id: 'half-flush',
		label: 'Half Flush',
		description: 'All number tiles in one suit, plus honors. +3 points (house-rule tunable).',
		filter: sameSuitFilter(true, true),
		shapeBonus: HALF_FLUSH_POINTS
	},
	{
		id: 'pure-suit',
		label: 'Pure Suit',
		description: 'Every tile in one suit; no honors. +6 points (house-rule tunable).',
		filter: sameSuitFilter(false, false),
		shapeBonus: PURE_SUIT_POINTS
	},
	{
		id: 'three-suits',
		label: 'Three Suits',
		description: 'At least one meld in each of the three suits. +2 points (house rule).',
		filter: threeSuitFilter,
		shapeBonus: THREE_SUIT_BONUS_POINTS
	}
];

// ---------------------------------------------------------------------------------------------
// Helpers for the evaluator.

export function archetypeById(id: string): Archetype | null {
	return ARCHETYPES.find((a) => a.id === id) ?? null;
}

// Pre-compute the maximum scoring potential of an archetype as a function of the realized
// context (flowers, self-draw, etc.). The headline bonus comes from the archetype; honor and
// flower bonuses depend on the actual decomposition and are added later by the evaluator. We
// include the structural bonus here as a hard ceiling so ranking is stable even before the
// position is decomposed.
export function archetypeCeiling(archetype: Archetype, ctx: ScoringContext): number {
	let ceiling = archetype.shapeBonus;
	// Flowers and self-draw are guaranteed if the player already has them.
	ceiling += ctx.flowers;
	if (ctx.selfDraw) ceiling += 1;
	return ceiling;
}

// `pairSuit` is exported so the evaluator can sanity-check edge cases — not currently used
// internally beyond filter logic.
export { pairSuit, meldSuit };
