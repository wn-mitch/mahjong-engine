import type { Tile } from './tiles';
import { cap, fullTilePool, tileKey } from './tiles';
import type { GameState } from './gameState';

// A read-only accounting of which tiles are still unseen, derived from a position. Lets the
// evaluator ask "is this target still reachable?" and "how likely am I to draw what I need?"
// rather than scoring purely on what's in hand. Ruleset-agnostic — it only knows tiles.
export interface TileCensus {
	seenCount(tile: Tile): number; // copies visible anywhere on the table
	unseenCount(tile: Tile): number; // copies still in the wall / others' hands
	unseenTotal(): number; // total unseen copies — the draw-probability denominator
	drawProbability(tile: Tile): number; // P(a random unseen tile is this one)
}

const POOL_SIZE = fullTilePool().length;

function capForKey(key: string): number {
	return key === 'F' || key === 'J' ? 8 : 4;
}

export function buildCensus(state: GameState): TileCensus {
	const seen = new Map<string, number>();
	const bump = (t: Tile) => {
		const k = tileKey(t);
		seen.set(k, (seen.get(k) ?? 0) + 1);
	};

	for (const t of state.self.hand) bump(t);
	for (const e of state.self.exposures) for (const t of e.tiles) bump(t);
	for (const opp of [state.opponents.left, state.opponents.across, state.opponents.right]) {
		for (const e of opp) for (const t of e.tiles) bump(t);
	}
	for (const t of state.discards) bump(t);
	// Charleston reveals: add SENT tiles only. After a committed pass the received tiles
	// already live in `self.hand`, so counting both sides would double-count the same
	// physical tile. Each tile is thus counted exactly once at its final known location.
	for (const p of state.charleston.passes) for (const t of p.sentTiles) bump(t);

	// Clamp per type so a malformed position that reports more than `cap` copies of a tile
	// can't push the unseen total negative or out of sync with per-tile unseen counts.
	let seenClamped = 0;
	for (const [key, count] of seen) seenClamped += Math.min(count, capForKey(key));
	const total = Math.max(0, POOL_SIZE - seenClamped);

	const seenCount = (tile: Tile) => seen.get(tileKey(tile)) ?? 0;
	const unseenCount = (tile: Tile) => Math.max(0, cap(tile) - seenCount(tile));
	const unseenTotal = () => total;
	const drawProbability = (tile: Tile) => (total === 0 ? 0 : unseenCount(tile) / total);

	return { seenCount, unseenCount, unseenTotal, drawProbability };
}
