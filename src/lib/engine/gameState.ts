import type { Tile, Wind } from './tiles';

export type GamePhase = 'charleston' | 'play' | 'endgame';

export type CharlestonDirection = 'right' | 'across' | 'left' | 'courtesy';

export interface CharlestonPassRecord {
	direction: CharlestonDirection;
	sentTiles: Tile[];
	receivedTiles: Tile[];
}

export interface Exposure {
	owner: 'self' | 'left' | 'across' | 'right';
	tiles: Tile[];
	calledFrom?: 'left' | 'across' | 'right';
}

export interface PlayerState {
	hand: Tile[];
	exposures: Exposure[];
}

export interface GameState {
	phase: GamePhase;
	self: PlayerState;
	opponents: {
		left: Exposure[];
		across: Exposure[];
		right: Exposure[];
	};
	discards: Tile[];
	charleston: { passes: CharlestonPassRecord[] };
	turnsRemaining?: number;
	// Seat and prevalent (round) wind. Used by rulesets that score honor pungs/kongs against
	// the seat or round — e.g., Chinese mahjong's 2-point bonus for a pung of either wind.
	// NMJL ignores these; default 'E' is sane when unset.
	seatWind?: Wind;
	roundWind?: Wind;
	// Viewer-relative position of the seat that placed the most recent discard. Used by
	// rulesets that gate chow claims on the upstream seat (Chinese: chow only from 'left').
	// Omitted when there is no open discard claim window (e.g. between turns, or at deal).
	lastDiscarder?: 'left' | 'across' | 'right' | 'self';
}

export function emptyState(): GameState {
	return {
		phase: 'charleston',
		self: { hand: [], exposures: [] },
		opponents: { left: [], across: [], right: [] },
		discards: [],
		charleston: { passes: [] },
		seatWind: 'E',
		roundWind: 'E'
	};
}
