import type { GameState } from '../../engine/gameState';
import type { TargetEvaluation, TargetHand, TileSuggestion } from '../../engine/ruleset';
import type { Tile } from '../../engine/tiles';
import { countTile, tileEquals, tileKey } from '../../engine/tiles';
import { fillsTarget } from '../nmjl-2026/decide';
import { evaluateAll, evaluateArchetype, rankingPoints } from './evaluator';
import { ARCHETYPES, archetypeById } from './archetypes';
import { defaultContext } from './scoring';
import { partitionStructuralTiles } from './decomposer';

// Per-tile utility: how much would we lose by shedding this tile? The lower the value, the
// safer it is to discard. Each archetype contributes its (completion × max-score) weight if
// the tile occupies a slot in that archetype's current best partition; honors that match the
// seat or round wind, or that are dragons, get a small floor bump because they're always a
// pair-or-pung candidate even if no current target uses them.

function honorBaseValue(tile: Tile, state: GameState): number {
	if (tile.kind === 'dragon') return 0.2;
	if (tile.kind === 'wind') {
		const seat = state.seatWind ?? 'E';
		const round = state.roundWind ?? 'E';
		if (tile.wind === seat || tile.wind === round) return 0.2;
		return 0; // off-axis winds are safe to shed unless an active target needs one
	}
	return 0;
}

// Holding multiple copies of a tile is itself a signal of structural promise — a pair is a
// near-pung, three copies is already a pung. The canonical partition may not use those copies
// (the decomposer commits to one interpretation), but they remain meaningful in the discard
// decision. Without this term, a "demoted" pair would look identical to a true singleton.
function multiplicityBonus(tile: Tile, hand: Tile[]): number {
	const copies = countTile(hand, tile);
	if (copies < 2) return 0;
	return 0.5 * (copies - 1);
}

function tileUtility(
	tile: Tile,
	targets: TargetEvaluation[],
	hand: Tile[],
	state: GameState
): number {
	// Flowers and seasons are never discarded — they sit in the bonus stack in real play. The
	// caller filters them out before reaching here, but defensively spike their value high so
	// any later refactor can't accidentally discard one.
	if (tile.kind === 'flower') return Number.POSITIVE_INFINITY;
	let value = honorBaseValue(tile, state) + multiplicityBonus(tile, hand);
	for (const t of targets) {
		const weight = t.completionScore * Math.max(1, rankingPoints(t));
		if (weight <= 0) continue;
		if (fillsTarget(t, tile)) value += weight;
	}
	return value;
}

export function suggestDiscard(state: GameState, target?: TargetHand): TileSuggestion {
	const hand = state.self.hand;
	if (hand.length === 0) return { discard: null, rationale: 'empty hand' };

	const { structural } = partitionStructuralTiles(hand);
	if (structural.length === 0) {
		// All bonus tiles. Real play would just draw replacements; the advisor has nothing
		// structural to recommend shedding.
		return { discard: null, rationale: 'no structural tiles to discard (only bonus tiles)' };
	}

	let targetsList: TargetEvaluation[];
	if (target) {
		// Score against the pinned archetype only. Falls through to the full ranking if the
		// caller passed an unrecognized id (defensive — the UI shouldn't, but better to
		// degrade than throw).
		const arch = archetypeById(target.id);
		if (arch) {
			const ctx = defaultContext({
				seatWind: state.seatWind ?? 'E',
				roundWind: state.roundWind ?? 'E',
				flowers: hand.filter((t) => t.kind === 'flower').length
			});
			targetsList = [evaluateArchetype(state, arch, ctx)];
		} else {
			targetsList = evaluateAll(state);
		}
	} else {
		targetsList = evaluateAll(state);
	}

	// Score every concealed tile; flowers are already filtered out below.
	const utilities = new Map<string, { tile: Tile; value: number }>();
	for (const t of hand) {
		if (t.kind === 'flower') continue;
		const key = tileKey(t);
		if (utilities.has(key)) continue; // duplicates share utility; one slot suffices
		utilities.set(key, { tile: t, value: tileUtility(t, targetsList, hand, state) });
	}

	let pick: { tile: Tile; value: number } | null = null;
	for (const entry of utilities.values()) {
		if (!pick || entry.value < pick.value) pick = entry;
	}

	if (!pick) {
		return { discard: null, rationale: 'no eligible tiles' };
	}

	// Confirm the picked tile is actually in the hand (it must be — `utilities` is built from
	// the hand). This defensive check exists only to keep the return type honest.
	const inHand = hand.find((t) => tileEquals(t, pick!.tile));
	if (!inHand) {
		return { discard: null, rationale: 'pick not in hand' };
	}

	const archCount = ARCHETYPES.length;
	const topName = targetsList[0]?.target.description.split('.')[0] ?? 'no live target';
	const rationale =
		pick.value === 0
			? `lowest cross-archetype utility; no live target uses ${humanize(pick.tile)}`
			: `lowest cross-archetype utility across ${archCount} targets; safest shed relative to ${topName}`;

	return { discard: inHand, rationale };
}

function humanize(t: Tile): string {
	switch (t.kind) {
		case 'number':
			return `${t.rank} ${t.suit}`;
		case 'wind':
			return `${t.wind} wind`;
		case 'dragon':
			return `${t.dragon} dragon`;
		case 'flower':
			return 'flower';
		case 'joker':
			return 'joker';
	}
}
