import type { GameRuleset } from '../ruleset';
import type { Tile } from '../tiles';
import { multisetDiff, tileEquals } from '../tiles';
import { seatView } from './seatView';
import { wallRemaining } from './deal';
import type {
	ClaimResponse,
	MatchExposure,
	Match,
	MatchResult,
	SeatId,
	SeatPrivate
} from './types';

// A complete NMJL hand is 14 tiles (concealed + exposed). A seat holds 14 while acting and
// 13 between turns. American mahjong gives no kong replacement draw, so this holds even with
// exposures.
const HAND_WHEN_ACTING = 14;

function controlledCount(seat: SeatPrivate): number {
	return seat.hand.length + seat.exposures.reduce((n, e) => n + e.tiles.length, 0);
}

function nextSeat(seat: SeatId): SeatId {
	return ((seat + 1) % 4) as SeatId;
}

// Among `candidates`, the seat soonest in turn order to the right of `from`. Used to break
// claim ties: when two seats want the same discard, the one whose turn comes first wins.
function closestRight(from: SeatId, candidates: SeatId[]): SeatId {
	return candidates.reduce((best, s) => {
		const ds = (s - from + 4) % 4;
		const db = (best - from + 4) % 4;
		return ds < db ? s : best;
	});
}

function withSeat(match: Match, seat: SeatId, next: SeatPrivate): Match {
	const seats = [...match.seats] as Match['seats'];
	seats[seat] = next;
	return { ...match, seats };
}

function end(match: Match, result: MatchResult): Match {
	return { ...match, phase: 'ended', claim: undefined, result };
}

export function draw(match: Match, seat: SeatId): Match {
	const tile = match.wall[match.wallPos];
	const next: SeatPrivate = { ...match.seats[seat], hand: [...match.seats[seat].hand, tile] };
	return { ...withSeat(match, seat, next), wallPos: match.wallPos + 1 };
}

// Remove `tile` from the seat's hand, push it on the discard pile, and open a claim window so
// the other three seats can claim it (for an exposure or mahjong) before play advances. The
// turn does NOT move here — `resolveClaimWindow` advances it.
export function applyDiscard(match: Match, seat: SeatId, tile: Tile): Match {
	if (match.turn !== seat) throw new Error(`not seat ${seat}'s turn`);
	if (match.claim) throw new Error('cannot discard while a claim window is open');
	const { missing, leftover } = multisetDiff(match.seats[seat].hand, [tile]);
	if (missing.length > 0) throw new Error(`seat ${seat} cannot discard a tile it does not hold`);

	const afterRemoval = withSeat(match, seat, { ...match.seats[seat], hand: leftover });
	const discards = [...match.discards, { tile, by: seat, turn: match.turnCounter }];
	const pending = [1, 2, 3].map((o) => ((seat + o) % 4) as SeatId);
	return {
		...afterRemoval,
		discards,
		claim: { discardIndex: discards.length - 1, pending, responses: [] }
	};
}

function claimIsValid(
	match: Match,
	ruleset: GameRuleset,
	response: ClaimResponse,
	discarder: SeatId,
	tile: Tile
): boolean {
	if (response.kind === 'pass') return false;
	if (response.seat === discarder) return false; // can't claim your own discard
	const view = seatView(match, response.seat);
	if (response.kind === 'mahjong') return ruleset.isLegalMahjong(view, { fromDiscard: tile });
	return ruleset.canClaimForExposure(view, tile).some((o) => o.kind === response.kind);
}

// Pull `need` supporting tiles from the hand for an exposure of `tile`: natural copies first,
// then jokers to fill the rest. Throws if the hand can't actually support it (guarded by
// `claimIsValid` upstream, but defended here too).
function takeForExposure(
	hand: Tile[],
	tile: Tile,
	need: number
): { taken: Tile[]; rest: Tile[] } {
	const rest = [...hand];
	const taken: Tile[] = [];
	for (let i = 0; i < need; i++) {
		const idx = rest.findIndex((t) => t.kind !== 'joker' && tileEquals(t, tile));
		if (idx < 0) break;
		taken.push(rest[idx]);
		rest.splice(idx, 1);
	}
	while (taken.length < need) {
		const idx = rest.findIndex((t) => t.kind === 'joker');
		if (idx < 0) throw new Error('hand cannot support the claimed exposure');
		taken.push(rest[idx]);
		rest.splice(idx, 1);
	}
	return { taken, rest };
}

// Resolve the open claim window given the seats' responses (any pending seat without a
// response is treated as a pass). Priority: a legal mahjong claim beats any exposure; among
// equal claims the seat closest to the discarder's right wins. A claim hands the turn to the
// claimant (interrupting normal order); if everyone passes, the turn advances normally.
export function resolveClaimWindow(
	match: Match,
	ruleset: GameRuleset,
	responses: ClaimResponse[] = []
): Match {
	if (!match.claim) throw new Error('no open claim window');
	const { discardIndex } = match.claim;
	const entry = match.discards[discardIndex];
	const discarder = entry.by;

	const valid = responses.filter((r) => claimIsValid(match, ruleset, r, discarder, entry.tile));

	const mahjong = valid.filter((r) => r.kind === 'mahjong').map((r) => r.seat);
	if (mahjong.length > 0) {
		const winner = closestRight(discarder, mahjong);
		// The claimed tile becomes the winner's 14th; remove it from the pile so the pool stays
		// conserved, and add it to the winning hand.
		const seats = withSeat(match, winner, {
			...match.seats[winner],
			hand: [...match.seats[winner].hand, entry.tile]
		}).seats;
		const discards = match.discards.filter((_, i) => i !== discardIndex);
		return {
			...match,
			seats,
			discards,
			claim: undefined,
			phase: 'ended',
			result: { kind: 'mahjong', winner, fromDiscard: true }
		};
	}

	const exposureResponses = valid.filter((r) => r.kind === 'pung' || r.kind === 'kong');
	if (exposureResponses.length > 0) {
		const claimant = closestRight(
			discarder,
			exposureResponses.map((r) => r.seat)
		);
		const kind = exposureResponses.find((r) => r.seat === claimant)!.kind as 'pung' | 'kong';
		const need = kind === 'pung' ? 2 : 3;
		const { taken, rest } = takeForExposure(match.seats[claimant].hand, entry.tile, need);
		const exposure: MatchExposure = {
			tiles: [...taken, entry.tile],
			kind,
			calledFrom: discarder
		};
		const seats = withSeat(match, claimant, {
			hand: rest,
			exposures: [...match.seats[claimant].exposures, exposure]
		}).seats;
		const discards = match.discards.filter((_, i) => i !== discardIndex);
		return {
			...match,
			seats,
			discards,
			claim: undefined,
			turn: claimant,
			turnCounter: match.turnCounter + 1
		};
	}

	// Everyone passed: normal turn advance to the discarder's right.
	return {
		...match,
		claim: undefined,
		turn: nextSeat(discarder),
		turnCounter: match.turnCounter + 1
	};
}

// Advance one turn for whichever seat is to play, using the ruleset's own recommendation for
// the discard, and auto-resolving the claim window with everyone passing (no agents yet —
// M6 supplies profile-driven claim decisions). The mechanics live here and don't change.
export function playTurnAuto(match: Match, ruleset: GameRuleset): Match {
	if (match.phase !== 'play') return match;
	const seat = match.turn;

	let m = match;
	if (controlledCount(m.seats[seat]) < HAND_WHEN_ACTING) {
		if (wallRemaining(m) === 0) return end(m, { kind: 'wall-exhausted' });
		m = draw(m, seat);
	}

	const view = seatView(m, seat);
	if (ruleset.isWinningHand(view)) {
		return end(m, { kind: 'mahjong', winner: seat, fromDiscard: false });
	}

	const sugg = ruleset.suggestDiscard(view);
	const tile = sugg.discard ?? m.seats[seat].hand[m.seats[seat].hand.length - 1];
	const afterDiscard = applyDiscard(m, seat, tile);
	return resolveClaimWindow(afterDiscard, ruleset);
}

export function runToCompletion(match: Match, ruleset: GameRuleset, maxTurns = 400): Match {
	let m = match;
	let turns = 0;
	while (m.phase === 'play' && turns < maxTurns) {
		m = playTurnAuto(m, ruleset);
		turns += 1;
	}
	return m;
}
