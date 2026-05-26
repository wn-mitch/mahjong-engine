import type { CharlestonDirection, GameState } from '../../engine/gameState';
import type {
	CharlestonPassSuggestion,
	CharlestonReceivedEvaluation,
	TargetEvaluation
} from '../../engine/ruleset';
import type { Tile } from '../../engine/tiles';
import { countTile, tileEquals } from '../../engine/tiles';
import { buildCensus } from '../../engine/census';
import type { NMJLHand } from './hands';
import { isDeadFor, tileValue } from './decide';

const PASS_SIZE = 3;
const COURTESY_MIN_DEAD = 2;
const TOP_NEEDS_CANDIDATES = 2;

const RETAINED_BY_DIRECTION: Record<CharlestonDirection, number> = {
	right: 8,
	across: 5,
	left: 2,
	courtesy: 2
};

interface Context {
	direction: CharlestonDirection;
	retained: TargetEvaluation[];
	topNeeds: Tile[];
	topFilled: Tile[];
	hand: Tile[];
	priorReceived: Tile[];
}

function tileInList(tile: Tile, list: Tile[]): boolean {
	return list.some((n) => tileEquals(n, tile));
}

// Tiles a top-2 target still wants to draw — never pass them away (you'd be sending the
// engine's recommended hand to your opponent).
function unionTopNeeds(retained: TargetEvaluation[]): Tile[] {
	const slice = retained.slice(0, TOP_NEEDS_CANDIDATES);
	const out: Tile[] = [];
	for (const ev of slice) {
		for (const t of ev.tilesNeeded) {
			if (!out.some((existing) => tileEquals(existing, t))) out.push(t);
		}
	}
	return out;
}

// Tiles already held that occupy a `filled` slot in a top-2 target. The parallel session
// added this guard to fix the original bug (passing top-hand contributors); with the matcher
// now availability-aware, the guard fires on an honest ranking instead of a fabricated one.
function heldTopContributors(retained: TargetEvaluation[]): Tile[] {
	const slice = retained.slice(0, TOP_NEEDS_CANDIDATES);
	const out: Tile[] = [];
	for (const ev of slice) {
		for (const slot of ev.patternSlots) {
			if (slot.status === 'filled' && !out.some((t) => tileEquals(t, slot.tile))) {
				out.push(slot.tile);
			}
		}
	}
	return out;
}

// Absolute guard — tiles never passed under any direction. Jokers are universal wildcards,
// flowers feed their own hands and can't be substituted for, pairs are building blocks for
// pungs and kongs, and tiles a top hand still wants to draw are off-limits by definition.
function neverPass(tile: Tile, ctx: Context): boolean {
	if (tile.kind === 'joker') return true;
	if (tile.kind === 'flower') return true;
	if (countTile(ctx.hand, tile) >= 2) return true;
	if (tileInList(tile, ctx.topNeeds)) return true;
	return false;
}

function topHandLabel(retained: TargetEvaluation[]): string {
	const top = retained[0];
	if (!top) return 'no live targets';
	return (top.target as NMJLHand).pattern;
}

function rationaleFor(
	direction: CharlestonDirection,
	retained: TargetEvaluation[],
	count: number
): string {
	if (count === 0) return `${direction} pass: no passable tiles`;
	const lead = topHandLabel(retained);
	const n = retained.length;
	switch (direction) {
		case 'right':
			return `first pass: trimming tiles outside top ${n} candidates (leading: ${lead})`;
		case 'across':
			return `second pass: narrowing to top ${n} candidates (leading: ${lead})`;
		case 'left':
			return `third pass: committing to ${lead}${n > 1 ? ` (+${n - 1} alternate)` : ''}`;
		case 'courtesy':
			return `courtesy: passing ${count} dead tile${count === 1 ? '' : 's'}`;
	}
}

export function suggestCharlestonPass(
	state: GameState,
	direction: CharlestonDirection,
	evaluations: TargetEvaluation[]
): CharlestonPassSuggestion {
	const hand = state.self.hand;
	if (hand.length === 0) {
		return { tiles: [], rationale: 'empty hand' };
	}

	const retained = evaluations.slice(0, RETAINED_BY_DIRECTION[direction]);
	const topNeeds = unionTopNeeds(retained);
	const topFilled = heldTopContributors(retained);
	const priorReceived = state.charleston.passes.flatMap((p) => p.receivedTiles);
	const ctx: Context = { direction, retained, topNeeds, topFilled, hand, priorReceived };
	const census = buildCensus(state);

	const scored = hand.map((tile) => ({
		tile,
		value: tileValue(tile, retained, census),
		received: tileInList(tile, priorReceived)
	}));

	// Pass lowest-value first; among equal-value tiles prefer ones we did NOT just receive
	// (don't ping-pong a tile straight back to where it came from).
	const orderForPassing = (
		a: { value: number; received: boolean },
		b: { value: number; received: boolean }
	) => {
		if (a.received !== b.received) return a.received ? 1 : -1;
		return a.value - b.value;
	};

	if (direction === 'courtesy') {
		// Courtesy is optional — only pass tiles dead relative to the top-2 committed targets
		// (no committed-hand slot is filled by them) and not absolute-guarded.
		const dead = scored
			.filter((s) => !neverPass(s.tile, ctx) && isDeadFor(s.tile, retained))
			.sort(orderForPassing);
		if (dead.length < COURTESY_MIN_DEAD) {
			return {
				tiles: [],
				rationale: `courtesy: declined — only ${dead.length} dead tile${
					dead.length === 1 ? '' : 's'
				}`
			};
		}
		const picked = dead.slice(0, Math.min(PASS_SIZE, dead.length)).map((s) => s.tile);
		return { tiles: picked, rationale: rationaleFor(direction, retained, picked.length) };
	}

	const passable = scored.filter((s) => !neverPass(s.tile, ctx)).sort(orderForPassing);

	// Prefer tiles that aren't already filling a top-2 slot; relax into top-2 contributors
	// (least valuable first — `passable` is already in pass-priority order) only when the
	// absolute-guarded remainder leaves too few free tiles for a legal 3-tile pass.
	const free = passable.filter((s) => !tileInList(s.tile, topFilled));
	const contributors = passable.filter((s) => tileInList(s.tile, topFilled));

	const picked: Tile[] = free.slice(0, PASS_SIZE).map((s) => s.tile);
	for (const c of contributors) {
		if (picked.length >= PASS_SIZE) break;
		picked.push(c.tile);
	}
	return { tiles: picked, rationale: rationaleFor(direction, retained, picked.length) };
}

export function evaluateReceived(
	state: GameState,
	nextDirection: CharlestonDirection,
	received: Tile[],
	evaluations: TargetEvaluation[]
): CharlestonReceivedEvaluation {
	if (received.length === 0) {
		return { keep: [], passOn: [], rationale: 'no received tiles' };
	}
	const augmented: GameState = {
		...state,
		self: { ...state.self, hand: [...state.self.hand, ...received] }
	};
	const next = suggestCharlestonPass(augmented, nextDirection, evaluations);
	const passPool = [...next.tiles];
	const keep: Tile[] = [];
	const passOn: Tile[] = [];
	for (const r of received) {
		const idx = passPool.findIndex((p) => tileEquals(p, r));
		if (idx >= 0) {
			passOn.push(r);
			passPool.splice(idx, 1);
		} else {
			keep.push(r);
		}
	}
	const rationale =
		passOn.length === 0
			? `keep all ${received.length} received tile${
					received.length === 1 ? '' : 's'
				} — none rank among the next pass to ${nextDirection}`
			: `${nextDirection} pass: route ${passOn.length} of ${received.length} received tile${
					received.length === 1 ? '' : 's'
				} onward; keep ${keep.length}`;
	return { keep, passOn, rationale };
}
