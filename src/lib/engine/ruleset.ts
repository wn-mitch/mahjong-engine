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

// --- Game-running surface ---------------------------------------------------------------
// The advisor `Ruleset` above answers "what should I do?"; a live game also needs "what is
// legal?" and "how is a hand set up?". Those answers are ruleset-specific (NMJL joker rules,
// deal counts, charleston order), so they live behind this extension rather than in the
// ruleset-agnostic engine core. Only rulesets that can actually be *played* implement it —
// analyzer-only stubs satisfy `Ruleset` alone.

export interface DealCounts {
	perSeat: number;
	dealerExtra: number;
}

export interface CharlestonStep {
	direction: CharlestonDirection;
	optional: boolean;
}

export type ExposureKind = 'pung' | 'kong';

// A way the seat could claim the discard to form an exposure. `jokersNeeded` is how many of
// the supporting tiles must be jokers given the seat prefers its natural copies.
export interface ClaimOption {
	kind: ExposureKind;
	tile: Tile;
	jokersNeeded: number;
}

export interface MahjongCheckOptions {
	// The tile being claimed off a discard. Omit for a self-draw check.
	fromDiscard?: Tile;
}

export interface GameRuleset extends Ruleset {
	dealCounts(): DealCounts;
	charlestonPlan(): CharlestonStep[];
	// Which exposures (if any) the seat could legally form by claiming `discard`.
	canClaimForExposure(state: GameState, discard: Tile): ClaimOption[];
	// Whether `tiles` (supporting tiles + the claimed tile) form a legal pung/kong exposure.
	isLegalExposure(tiles: Tile[], claimedTile: Tile, state: GameState): boolean;
	// Whether the seat may declare mahjong now — on a self-draw, or by claiming a discard.
	isLegalMahjong(state: GameState, opts?: MahjongCheckOptions): boolean;
}
