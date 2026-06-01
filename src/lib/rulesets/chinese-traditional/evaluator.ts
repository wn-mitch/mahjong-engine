import type { GameState } from '../../engine/gameState';
import type { PatternSlot, TargetEvaluation, TargetHand } from '../../engine/ruleset';
import type { Tile } from '../../engine/tiles';
import type { Archetype } from './archetypes';
import { ARCHETYPES, archetypeById } from './archetypes';
import {
	bestDecomposition,
	classifyExposure,
	decompositionIsWinning,
	partitionStructuralTiles,
	totalFilledSlots,
	totalStructuralSlots,
	type DecompPair,
	type DecompSet,
	type Decomposition
} from './decomposer';
import { defaultContext, scoreDecomposition, type ScoringContext } from './scoring';

const RULESET_ID = 'chinese-traditional';

// Turn an archetype + decomposition into a TargetEvaluation. The decomposer already produced
// the pair, the four melds, and the list of tiles still needed; the evaluator's job is to
// flatten that into the slot model the UI consumes and attach scoring metadata.

function setSlots(set: DecompSet, groupIndex: number): PatternSlot[] {
	const slots: PatternSlot[] = [];
	const size = set.kind === 'kong' ? 4 : 3;
	// Phantom (empty `tiles`) sets represent a meld the decomposer couldn't anchor in the
	// hand — render as `needed` slots with an opaque placeholder tile. The UI may upgrade
	// these to a "?" glyph; for now they're typed as a 1-crack so the model is uniform.
	const placeholder: Tile = { kind: 'number', suit: 'crack', rank: 1 };
	for (let i = 0; i < size; i++) {
		if (i < set.filled) {
			slots.push({ tile: set.tiles[i] ?? placeholder, status: 'filled', groupIndex });
		} else {
			// Needed slots draw their tile identity from the set's `needed` list when known,
			// or fall through to the placeholder for phantom melds.
			const neededIdx = i - set.filled;
			const tile = set.needed[neededIdx] ?? set.tiles[0] ?? placeholder;
			slots.push({ tile, status: 'needed', groupIndex });
		}
	}
	return slots;
}

function pairSlots(pair: DecompPair | null, groupIndex: number): PatternSlot[] {
	if (!pair) return [];
	const slots: PatternSlot[] = [];
	if (pair.filled >= 1) slots.push({ tile: pair.tile, status: 'filled', groupIndex });
	if (pair.filled === 2) slots.push({ tile: pair.tile, status: 'filled', groupIndex });
	for (const n of pair.needed) slots.push({ tile: n, status: 'needed', groupIndex });
	return slots;
}

function buildPatternSlots(d: Decomposition): PatternSlot[] {
	const slots: PatternSlot[] = [];
	let group = 0;
	slots.push(...pairSlots(d.pair, group));
	group++;
	for (const s of d.sets) {
		slots.push(...setSlots(s, group));
		group++;
	}
	return slots;
}

// Hypothetically-complete the decomposition by promoting partials to full melds in place. The
// score function reads `needed.length === 0` and `filled` to gate the bonus tiers; without this
// promotion, even a tenpai hand would score zero for shape bonuses.
function promoteToComplete(d: Decomposition): Decomposition {
	const sets: DecompSet[] = d.sets.map((s) => {
		if (s.tiles.length === 0) return s; // phantom — can't promote, no tile known
		const size = s.kind === 'kong' ? 4 : 3;
		if (s.filled === size && s.needed.length === 0) return s;
		// Materialize the needed-tile positions. For a partial chow we trust `s.needed[0]` to
		// be the canonical wait; for a partial pung the needed entries are copies of `s.tiles[0]`.
		const completedTiles: Tile[] = [...s.tiles];
		for (const n of s.needed) completedTiles.push(n);
		while (completedTiles.length < size) completedTiles.push(s.tiles[0]);
		return { ...s, tiles: completedTiles, filled: size, needed: [] };
	});
	const pair: DecompPair | null = d.pair
		? { tile: d.pair.tile, filled: 2, needed: [] }
		: null;
	return { ...d, sets, pair };
}

function archetypeTarget(arch: Archetype): TargetHand {
	return {
		id: arch.id,
		description: arch.description,
		rulesetId: RULESET_ID
	};
}

export function evaluateArchetype(
	state: GameState,
	arch: Archetype,
	ctx: ScoringContext
): TargetEvaluation {
	const { structural } = partitionStructuralTiles(state.self.hand);
	const exposureSets: DecompSet[] = [];
	for (const exp of state.self.exposures) {
		const classified = classifyExposure(exp.tiles);
		if (classified) exposureSets.push(classified);
	}

	const decomp = bestDecomposition(structural, {
		exposures: exposureSets,
		filter: (sets, pair) => arch.filter(sets, pair)
	});

	const completed = promoteToComplete(decomp);
	const score = scoreDecomposition(completed, ctx);

	const structuralSlots = totalStructuralSlots(decomp);
	const filled = totalFilledSlots(decomp);
	// `floats` are tiles in hand that didn't land in any meld; they reduce effective
	// completion because they're occupying slots that don't count toward a win.
	const completionScore = structuralSlots > 0 ? Math.max(0, filled - decomp.floats.length) / structuralSlots : 0;

	const notes =
		score.parts.length > 0
			? `${score.points} pts: ${score.parts.map((p) => `${p.source} ${p.value}`).join(', ')}`
			: '0 pts';

	return {
		target: archetypeTarget(arch),
		tilesNeeded: decomp.tilesNeeded,
		jokerSlotsRemaining: 0,
		completionScore,
		patternSlots: buildPatternSlots(decomp),
		notes
	};
}

// Score-aware ranking key: completion × (shape ceiling + dynamic bonuses). Used by both
// `evaluateAll` (sort order) and `suggestDiscard` (per-tile utility weighting).
export function rankingPoints(evaluation: TargetEvaluation): number {
	// Parse the prefixed points from `notes`. If something went wrong leave it at 0 — the
	// completion score will still keep the row meaningful, just with no score multiplier.
	if (!evaluation.notes) return 0;
	const match = evaluation.notes.match(/^(\d+) pts/);
	return match ? parseInt(match[1], 10) : 0;
}

export function evaluateAll(state: GameState): TargetEvaluation[] {
	const { flowers } = partitionStructuralTiles(state.self.hand);
	const ctx = defaultContext({
		seatWind: state.seatWind ?? 'E',
		roundWind: state.roundWind ?? 'E',
		flowers
	});

	const results = ARCHETYPES.map((a) => evaluateArchetype(state, a, ctx));
	// Sort by completion × points, descending. Two ties matter and have distinct breakers:
	//   1. Same combined score: prefer the *more specific* archetype (higher shapeBonus).
	//      Pure Suit on a clean-suit hand beats Common Hand because it's the more informative
	//      label even though the points tie.
	//   2. Same shape bonus: prefer raw completion as the final breaker.
	results.sort((a, b) => {
		const aPts = Math.max(1, rankingPoints(a));
		const bPts = Math.max(1, rankingPoints(b));
		const aKey = a.completionScore * aPts;
		const bKey = b.completionScore * bPts;
		if (aKey !== bKey) return bKey - aKey;
		const aShape = archetypeById(a.target.id)?.shapeBonus ?? 0;
		const bShape = archetypeById(b.target.id)?.shapeBonus ?? 0;
		if (aShape !== bShape) return bShape - aShape;
		return b.completionScore - a.completionScore;
	});
	return results;
}

// Convenience: is the hand a structural win under any archetype? The score doesn't matter for
// legality (we don't enforce a minimum-point rule), only the shape.
export function isWinning(state: GameState): boolean {
	const { structural } = partitionStructuralTiles(state.self.hand);
	const exposureSets: DecompSet[] = [];
	for (const exp of state.self.exposures) {
		const classified = classifyExposure(exp.tiles);
		if (classified) exposureSets.push(classified);
	}
	const decomp = bestDecomposition(structural, { exposures: exposureSets });
	return decompositionIsWinning(decomp);
}
