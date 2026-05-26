import type { Exposure, GamePhase, GameState, CharlestonPassRecord } from '../gameState';
import { relativePosition } from './types';
import type { Match, MatchExposure, RelativePosition, SeatId } from './types';

const PHASE_MAP: Record<Match['phase'], GamePhase> = {
	deal: 'charleston',
	charleston: 'charleston',
	play: 'play',
	ended: 'endgame'
};

// Translate a god's-eye exposure into the viewer-relative `Exposure` the ruleset consumes.
// `calledFrom` is dropped when the tile was called from the viewer's own discard: the legacy
// Exposure type can't express 'self', and the evaluator only reads exposure tiles, never
// provenance, so nothing downstream depends on recovering it.
function toRelativeExposure(viewer: SeatId, owner: SeatId, ex: MatchExposure): Exposure {
	const relOwner = relativePosition(viewer, owner);
	let calledFrom: Exclude<RelativePosition, 'self'> | undefined;
	if (ex.calledFrom !== undefined) {
		const rel = relativePosition(viewer, ex.calledFrom);
		if (rel !== 'self') calledFrom = rel;
	}
	return { owner: relOwner, tiles: ex.tiles, calledFrom };
}

// Project the full match down to what a single seat legitimately knows: its own concealed
// hand and exposures, every seat's exposures, the discard pile, and its own charleston
// passes. The other three seats' concealed tiles are dropped entirely — this is the only
// thing standing between a bot and cheating, so it is the most test-worthy function here.
//
// The result is an ordinary `GameState`, so the same ruleset/advisor code that powers the
// /studio analyzer drives every bot without modification.
export function seatView(match: Match, seat: SeatId): GameState {
	const self = match.seats[seat];

	const opponents: GameState['opponents'] = { left: [], across: [], right: [] };
	for (const s of [0, 1, 2, 3] as SeatId[]) {
		if (s === seat) continue;
		const rel = relativePosition(seat, s);
		if (rel === 'self') continue; // unreachable, but keeps the type narrowed
		for (const ex of match.seats[s].exposures) {
			opponents[rel].push(toRelativeExposure(seat, s, ex));
		}
	}

	const passes: CharlestonPassRecord[] = [];
	if (match.charleston) {
		for (const p of match.charleston.log) {
			if (p.seat !== seat) continue;
			passes.push({
				direction: p.direction,
				sentTiles: p.sentTiles,
				receivedTiles: p.receivedTiles
			});
		}
	}

	return {
		phase: PHASE_MAP[match.phase],
		self: {
			hand: self.hand,
			exposures: self.exposures.map((ex) => toRelativeExposure(seat, seat, ex))
		},
		opponents,
		discards: match.discards.map((d) => d.tile),
		charleston: { passes }
	};
}
