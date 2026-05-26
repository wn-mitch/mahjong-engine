import type { CharlestonDirection, GameState } from '../gameState';
import type { Ruleset } from '../ruleset';
import type { Tile } from '../tiles';
import { multisetDiff } from '../tiles';
import { seatView } from './seatView';
import { SEATS } from './types';
import type { CharlestonSeatPass, Match, SeatId, SeatPrivate } from './types';

const PASS_SIZE = 3;

// How far around the table (in turn-order steps to the right) a pass travels. A seat passing
// `right` hands tiles to the seat one step clockwise; `across` is two; `left` is three;
// courtesy is the across exchange.
const RECEIVER_OFFSET: Record<CharlestonDirection, number> = {
	right: 1,
	across: 2,
	left: 3,
	courtesy: 2
};

// The three mandatory first-charleston passes. The optional second charleston and courtesy
// pass are driven interactively (M8); all-bot/test runs play only the mandatory three.
export const MANDATORY_CHARLESTON: CharlestonDirection[] = ['right', 'across', 'left'];

function receiverOf(seat: SeatId, direction: CharlestonDirection): SeatId {
	return ((seat + RECEIVER_OFFSET[direction]) % 4) as SeatId;
}

function flowerRank(t: Tile): number {
	return t.kind === 'flower' ? 1 : 0;
}

// Guarantee a legal 3-tile pass. The brain may return fewer than three when nearly every
// tile is guarded (jokers/flowers/pairs/needed); NMJL still requires passing three, so top
// up from the remaining hand — never with a joker (illegal to pass), flowers only as a last
// resort.
function topUpToThree(picks: Tile[], hand: Tile[]): Tile[] {
	if (picks.length >= PASS_SIZE) return picks.slice(0, PASS_SIZE);
	const { leftover } = multisetDiff(hand, picks);
	const candidates = leftover
		.filter((t) => t.kind !== 'joker')
		.sort((a, b) => flowerRank(a) - flowerRank(b));
	const out = [...picks];
	for (const t of candidates) {
		if (out.length >= PASS_SIZE) break;
		out.push(t);
	}
	return out;
}

// The three tiles a seat would pass for `direction`, given its projected view — the brain's
// recommendation, topped up to a legal three if it under-fills.
export function selectCharlestonPass(
	view: GameState,
	direction: CharlestonDirection,
	ruleset: Ruleset
): Tile[] {
	const sugg = ruleset.suggestCharlestonPass(view, direction);
	return topUpToThree(sugg.tiles, view.self.hand);
}

// What a seat would pass, built on that seat's projected view so it can't peek at anyone
// else's tiles.
export function botCharlestonPass(
	match: Match,
	seat: SeatId,
	direction: CharlestonDirection,
	ruleset: Ruleset
): Tile[] {
	return selectCharlestonPass(seatView(match, seat), direction, ruleset);
}

export function beginCharleston(match: Match): Match {
	if (match.charleston) return match;
	return {
		...match,
		phase: 'charleston',
		charleston: { stepIndex: 0, committed: [null, null, null, null], log: [] }
	};
}

// Apply one charleston pass given every seat's three tiles. Pure: removes the sent tiles from
// each hand, then distributes them to receivers, then records a per-seat log entry. Removing
// all before distributing means a seat never passes a tile it receives in the same step.
export function charlestonPass(
	match: Match,
	direction: CharlestonDirection,
	picks: [Tile[], Tile[], Tile[], Tile[]]
): Match {
	if (!match.charleston) throw new Error('charleston not started');

	const handsAfterRemoval: Tile[][] = [];
	for (const s of SEATS) {
		if (picks[s].length !== PASS_SIZE) {
			throw new Error(`seat ${s} must pass ${PASS_SIZE} tiles, got ${picks[s].length}`);
		}
		const { missing, leftover } = multisetDiff(match.seats[s].hand, picks[s]);
		if (missing.length > 0) {
			throw new Error(`seat ${s} passed a tile it does not hold`);
		}
		handsAfterRemoval.push(leftover);
	}

	const received: Tile[][] = [[], [], [], []];
	for (const s of SEATS) received[receiverOf(s, direction)].push(...picks[s]);

	const { stepIndex } = match.charleston;
	const log: CharlestonSeatPass[] = [...match.charleston.log];
	const seats = SEATS.map<SeatPrivate>((s) => {
		log.push({
			seat: s,
			stepIndex,
			direction,
			sentTiles: picks[s],
			receivedTiles: received[s]
		});
		return { hand: [...handsAfterRemoval[s], ...received[s]], exposures: match.seats[s].exposures };
	}) as [SeatPrivate, SeatPrivate, SeatPrivate, SeatPrivate];

	return {
		...match,
		seats,
		charleston: { stepIndex: stepIndex + 1, committed: [null, null, null, null], log }
	};
}

// Drive the three mandatory passes with every seat using the brain, then enter play. The
// dealer keeps 14 tiles and will open play by discarding (handled by the play loop).
export function runMandatoryCharleston(match: Match, ruleset: Ruleset): Match {
	let m = beginCharleston(match);
	for (const direction of MANDATORY_CHARLESTON) {
		const picks = SEATS.map((s) => botCharlestonPass(m, s, direction, ruleset)) as [
			Tile[],
			Tile[],
			Tile[],
			Tile[]
		];
		m = charlestonPass(m, direction, picks);
	}
	return { ...m, phase: 'play', turn: m.dealer };
}
