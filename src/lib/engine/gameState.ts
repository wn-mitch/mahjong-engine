import type { Tile } from './tiles';

export type GamePhase = 'charleston' | 'play' | 'endgame';

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
	turnsRemaining?: number;
}

export function emptyState(): GameState {
	return {
		phase: 'charleston',
		self: { hand: [], exposures: [] },
		opponents: { left: [], across: [], right: [] },
		discards: []
	};
}
