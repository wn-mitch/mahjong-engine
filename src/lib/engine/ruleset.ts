import type { Tile } from './tiles';
import type { GameState } from './gameState';

export interface TargetHand {
	id: string;
	description: string;
	rulesetId: string;
}

export interface TargetEvaluation {
	target: TargetHand;
	tilesNeeded: Tile[];
	jokerSlotsRemaining: number;
	completionScore: number;
	notes?: string;
}

export interface TileSuggestion {
	discard: Tile | null;
	rationale: string;
}

export interface Ruleset {
	readonly id: string;
	readonly name: string;
	readonly version: string;

	evaluateTargets(state: GameState): TargetEvaluation[];
	isWinningHand(state: GameState): boolean;
	suggestDiscard(state: GameState, target?: TargetHand): TileSuggestion;
}
