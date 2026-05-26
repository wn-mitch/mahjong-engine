import type { TargetEvaluation } from '../../engine/ruleset';
import type { Tile } from '../../engine/tiles';
import { cap, tileEquals } from '../../engine/tiles';
import type { TileCensus } from '../../engine/census';

// One value notion shared by both `suggestDiscard` and `suggestCharlestonPass`. Replaces the
// position-blind `crossHandUtility` ladder and the heap of pass-time magic constants.
//
//   value(tile) = keepFactor(tile) · Σ_{t in retained}  w_t · fills(t, tile)
//
//   fills(t, tile)  one of t's slots is occupied by a copy of `tile` in its current binding
//                   — for a joker, any joker-filled slot; for any other tile, a `filled` slot
//                   whose required tile equals it
//   w_t             t.completionScore — dead targets (score 0) protect nothing; near-complete
//                   targets protect their constituents the most
//   keepFactor      0.5..1, rising as the tile gets harder to replace. A tile you hold most
//                   copies of is precious (you can't redraw it); a tile with a full unseen
//                   pool is cheap (easy to get back if shed).

const KEEP_FLOOR = 0.5;

export function keepFactor(tile: Tile, census: TileCensus): number {
	return KEEP_FLOOR + (1 - KEEP_FLOOR) * (1 - census.unseenCount(tile) / cap(tile));
}

// Does a copy of `tile` currently occupy a slot in this target's chosen binding? Jokers
// match any joker-filled slot (they're wildcards); other tiles must equal a `filled` slot's
// required tile. Used by both the value sum and the Charleston "top-2 contributor" guard.
export function fillsTarget(target: TargetEvaluation, tile: Tile): boolean {
	if (tile.kind === 'joker') {
		return target.patternSlots.some((s) => s.status === 'joker-filled');
	}
	return target.patternSlots.some((s) => s.status === 'filled' && tileEquals(s.tile, tile));
}

function crossHandFit(tile: Tile, targets: TargetEvaluation[]): number {
	let total = 0;
	for (const t of targets) {
		if (t.completionScore > 0 && fillsTarget(t, tile)) total += t.completionScore;
	}
	return total;
}

export function tileValue(
	tile: Tile,
	targets: TargetEvaluation[],
	census: TileCensus
): number {
	return keepFactor(tile, census) * crossHandFit(tile, targets);
}

// A tile is dead relative to `targets` when it occupies no slot in any reachable target —
// shedding it costs nothing. Used by courtesy to find genuinely junk tiles.
export function isDeadFor(tile: Tile, targets: TargetEvaluation[]): boolean {
	return crossHandFit(tile, targets) === 0;
}
