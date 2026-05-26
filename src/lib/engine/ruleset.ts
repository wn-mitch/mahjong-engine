import type { Tile } from './tiles';
import type { CharlestonDirection, GameState } from './gameState';

export type { CharlestonDirection } from './gameState';

export interface TargetHand {
	id: string;
	description: string;
	rulesetId: string;
}

export type PatternSlotStatus = 'filled' | 'joker-filled' | 'needed';

export interface PatternSlot {
	tile: Tile;
	status: PatternSlotStatus;
	// Slots with the same groupIndex belong to the same target set (pair, pung, kong, …).
	// Monotonically non-decreasing along the slot list.
	groupIndex: number;
}

export interface TargetEvaluation {
	target: TargetHand;
	tilesNeeded: Tile[];
	jokerSlotsRemaining: number;
	// Displayed progress: fraction of the 14-tile pattern already held (1 = won), 0 if the
	// target is unreachable (a needed tile is exhausted from the pool).
	completionScore: number;
	patternSlots: PatternSlot[];
	notes?: string;
}

export interface TileSuggestion {
	discard: Tile | null;
	rationale: string;
}

export interface CharlestonPassSuggestion {
	tiles: Tile[];
	rationale: string;
}

export interface CharlestonReceivedEvaluation {
	keep: Tile[];
	passOn: Tile[];
	rationale: string;
}

export interface Ruleset {
	readonly id: string;
	readonly name: string;
	readonly version: string;

	evaluateTargets(state: GameState): TargetEvaluation[];
	isWinningHand(state: GameState): boolean;
	suggestDiscard(state: GameState, target?: TargetHand): TileSuggestion;
	suggestCharlestonPass(state: GameState, direction: CharlestonDirection): CharlestonPassSuggestion;
	evaluateReceivedTiles?(
		state: GameState,
		direction: CharlestonDirection,
		received: Tile[]
	): CharlestonReceivedEvaluation;
}
