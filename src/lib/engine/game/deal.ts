import type { Tile } from '../tiles';
import { fullTilePool, shuffleInPlace } from '../tiles';
import { makeRng } from './rng';
import { defaultProfiles } from './types';
import type { Match, ProfileTuple, SeatId, SeatPrivate } from './types';

export interface DealCounts {
	perSeat: number;
	dealerExtra: number;
}

// NMJL: every seat gets 13, the dealer (East) gets a 14th. The dealer keeps 14 through the
// charleston (each pass is balanced 3-out/3-in, so counts never drift) and opens play by
// discarding rather than drawing. M5 will source these from the ruleset; the default holds
// until then.
export const DEFAULT_DEAL_COUNTS: DealCounts = { perSeat: 13, dealerExtra: 1 };

export interface CreateMatchOptions {
	rulesetId: string;
	seed: number;
	dealer?: SeatId;
	profiles?: ProfileTuple;
	dealCounts?: DealCounts;
	// A pre-stacked wall for deterministic tests; bypasses the shuffle. Tiles are dealt from
	// the front, so callers control exactly which tiles land in which hand.
	wall?: Tile[];
}

export function createMatch(opts: CreateMatchOptions): Match {
	const rng = makeRng(opts.seed);
	const dealer = opts.dealer ?? 0;
	const counts = opts.dealCounts ?? DEFAULT_DEAL_COUNTS;
	const wall = opts.wall ? [...opts.wall] : shuffleInPlace(fullTilePool(), rng);

	let pos = 0;
	const seats = ([0, 1, 2, 3] as SeatId[]).map<SeatPrivate>((s) => {
		const n = counts.perSeat + (s === dealer ? counts.dealerExtra : 0);
		const hand = wall.slice(pos, pos + n);
		pos += n;
		return { hand, exposures: [] };
	}) as [SeatPrivate, SeatPrivate, SeatPrivate, SeatPrivate];

	return {
		rulesetId: opts.rulesetId,
		phase: 'charleston',
		dealer,
		seats,
		wall,
		wallPos: pos,
		turn: dealer,
		turnCounter: 0,
		discards: [],
		seed: opts.seed,
		rng,
		profiles: opts.profiles ?? defaultProfiles()
	};
}

// Tiles still in the wall, waiting to be drawn. The draw cursor (`wallPos`) advances; the
// wall array itself is never mutated, so a structural clone of a Match is a faithful
// snapshot for replay.
export function wallRemaining(match: Match): number {
	return match.wall.length - match.wallPos;
}
