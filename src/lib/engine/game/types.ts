import type { Tile } from '../tiles';
import type { CharlestonDirection } from '../gameState';

// Seats are absolute and fixed for a match. 0 is the human; 1/2/3 are bots. Play proceeds
// to the *right* (counterclockwise), so the seat after `s` is `(s + 1) % 4`.
export type SeatId = 0 | 1 | 2 | 3;
export const SEATS: readonly SeatId[] = [0, 1, 2, 3];

export type MatchPhase = 'deal' | 'charleston' | 'play' | 'ended';

// An exposure stored from the match's god's-eye view: provenance is absolute (`calledFrom`
// is the seat the claimed tile came from), unlike the viewer-relative `Exposure` in
// gameState.ts. `seatView` translates these into the relative form the ruleset expects.
export interface MatchExposure {
	tiles: Tile[];
	kind: 'pung' | 'kong';
	calledFrom?: SeatId; // omitted for a concealed kong assembled from one's own draws
}

export interface SeatPrivate {
	hand: Tile[];
	exposures: MatchExposure[];
}

export type ClaimKind = 'pung' | 'kong' | 'mahjong';

export interface DiscardEntry {
	tile: Tile;
	by: SeatId;
	turn: number;
	claimedBy?: SeatId;
	claimedAs?: ClaimKind;
}

export type ClaimResponseKind = ClaimKind | 'pass';

export interface ClaimResponse {
	seat: SeatId;
	kind: ClaimResponseKind;
}

// The interrupt state the runner sits in after a discard: every other seat owes a response
// (claim or pass). The runner resolves once `pending` empties, by priority.
export interface ClaimWindow {
	discardIndex: number; // index into Match.discards of the tile on offer
	pending: SeatId[];
	responses: ClaimResponse[];
}

// Per-seat charleston pass record, kept so `seatView` can reconstruct each seat's own
// known passes (a seat knows what it sent even though those tiles now sit unseen in another
// hand). Mirrors CharlestonPassRecord but tagged with the absolute seat.
export interface CharlestonProgress {
	stepIndex: number; // cursor into the ruleset's charleston plan
	committed: (Tile[] | null)[]; // length 4; tiles each seat has staged for the current step
	log: CharlestonSeatPass[]; // completed passes, one per (seat, step)
}

export interface CharlestonSeatPass {
	seat: SeatId;
	stepIndex: number;
	direction: CharlestonDirection;
	sentTiles: Tile[];
	receivedTiles: Tile[];
}

export interface MatchResult {
	kind: 'mahjong' | 'wall-exhausted';
	winner?: SeatId;
	handId?: string;
	fromDiscard?: boolean;
}

// Behaviour knobs for a bot seat. The human seat's profile is inert. All fields are 0..1.
export interface BehaviorProfile {
	skill: number; // gates concealed-hand consideration + top-k width
	discardRandomness: number; // probability of straying from the single best discard
	callAggression: number; // how eager to claim discards for exposures
	charlestonAggression: number; // how committal during the charleston
}

export const HUMAN_PROFILE: BehaviorProfile = {
	skill: 1,
	discardRandomness: 0,
	callAggression: 0,
	charlestonAggression: 0
};

// A competent-but-fallible default bot: plays the engine's recommendation most of the time,
// strays occasionally, claims discards that clearly help.
export const DEFAULT_BOT_PROFILE: BehaviorProfile = {
	skill: 0.8,
	discardRandomness: 0.15,
	callAggression: 0.6,
	charlestonAggression: 0.7
};

export type ProfileTuple = [BehaviorProfile, BehaviorProfile, BehaviorProfile, BehaviorProfile];

// Standard single-player layout: human at seat 0, bots elsewhere.
export function defaultProfiles(): ProfileTuple {
	return [HUMAN_PROFILE, DEFAULT_BOT_PROFILE, DEFAULT_BOT_PROFILE, DEFAULT_BOT_PROFILE];
}

// The authoritative, full-information state of a single match. `wall` is the full shuffled
// stack; `wallPos` is the next draw index (tiles before it are dealt/drawn), so snapshots
// and replay stay cheap — we never splice the wall.
export interface Match {
	rulesetId: string;
	phase: MatchPhase;
	dealer: SeatId;
	seats: [SeatPrivate, SeatPrivate, SeatPrivate, SeatPrivate];
	wall: Tile[];
	wallPos: number;
	turn: SeatId;
	turnCounter: number;
	discards: DiscardEntry[];
	charleston?: CharlestonProgress;
	claim?: ClaimWindow;
	result?: MatchResult;
	seed: number;
	rng: () => number;
	profiles: [BehaviorProfile, BehaviorProfile, BehaviorProfile, BehaviorProfile];
}

export type RelativePosition = 'self' | 'right' | 'across' | 'left';

// Where `target` sits from `viewer`'s perspective. Play advances to the right, so the seat
// one step clockwise in turn order is `right`, two is `across`, three is `left`.
export function relativePosition(viewer: SeatId, target: SeatId): RelativePosition {
	const d = ((target - viewer + 4) % 4) as 0 | 1 | 2 | 3;
	return (['self', 'right', 'across', 'left'] as const)[d];
}
