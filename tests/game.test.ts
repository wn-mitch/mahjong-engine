import { describe, it, expect } from 'vitest';
import {
	seatView,
	relativePosition,
	createMatch,
	wallRemaining,
	makeRng,
	runMandatoryCharleston,
	beginCharleston,
	charlestonPass,
	courtesyPass,
	runToCompletion,
	applyDiscard,
	resolveClaimWindow,
	botAgent,
	stepWithBots,
	runWithBots
} from '../src/lib/engine/game';
import type { Match, SeatId, BehaviorProfile } from '../src/lib/engine/game';
import { HUMAN_PROFILE, DEFAULT_BOT_PROFILE } from '../src/lib/engine/game';
import { nmjl2026 } from '../src/lib/rulesets/nmjl-2026';
import type { GameState } from '../src/lib/engine/gameState';
import { buildCensus } from '../src/lib/engine/census';
import type { Tile, Suit } from '../src/lib/engine/tiles';
import { fullTilePool, tileEquals, tileKey } from '../src/lib/engine/tiles';

function multiset(tiles: Tile[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const t of tiles) m.set(tileKey(t), (m.get(tileKey(t)) ?? 0) + 1);
	return m;
}

const rep = <T>(t: T, n: number): T[] => Array.from({ length: n }, () => t);

const N = (suit: Suit, rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const J = (): Tile => ({ kind: 'joker' });
const F = (): Tile => ({ kind: 'flower' });
const Dg = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });

function handState(hand: Tile[]): GameState {
	return {
		phase: 'play',
		self: { hand, exposures: [] },
		opponents: { left: [], across: [], right: [] },
		discards: [],
		charleston: { passes: [] }
	};
}

// 222 444 6666 888 in crack — one 8 short of the complete 2468 #1 hand.
const WIN_MINUS_ONE: Tile[] = [
	...Array.from({ length: 3 }, () => N('crack', 2)),
	...Array.from({ length: 3 }, () => N('crack', 4)),
	...Array.from({ length: 4 }, () => N('crack', 6)),
	...Array.from({ length: 3 }, () => N('crack', 8))
];

const profiles: [BehaviorProfile, BehaviorProfile, BehaviorProfile, BehaviorProfile] = [
	HUMAN_PROFILE,
	HUMAN_PROFILE,
	HUMAN_PROFILE,
	HUMAN_PROFILE
];

// A minimal hand-built match: distinct concealed hands per seat, one exposure on seat 2,
// one discard. No wall draws needed for these projection tests.
function makeMatch(): Match {
	return {
		rulesetId: 'nmjl-2026',
		phase: 'play',
		dealer: 0,
		seats: [
			{ hand: [N('dot', 1), N('dot', 2), N('dot', 3)], exposures: [] },
			{ hand: [N('bamboo', 4), N('bamboo', 5)], exposures: [] },
			{
				hand: [N('crack', 7)],
				exposures: [{ tiles: [Dg('red'), Dg('red'), Dg('red')], kind: 'pung', calledFrom: 0 }]
			},
			{ hand: [J(), J()], exposures: [] }
		],
		wall: [],
		wallPos: 0,
		turn: 0,
		turnCounter: 5,
		discards: [{ tile: N('dot', 9), by: 1, turn: 4 }],
		seed: 1,
		rng: Math.random,
		profiles
	};
}

describe('relativePosition', () => {
	it('maps the four seats around the table from each viewer', () => {
		expect(relativePosition(0, 0)).toBe('self');
		expect(relativePosition(0, 1)).toBe('right');
		expect(relativePosition(0, 2)).toBe('across');
		expect(relativePosition(0, 3)).toBe('left');
		// from seat 2's chair the wheel has rotated
		expect(relativePosition(2, 2)).toBe('self');
		expect(relativePosition(2, 3)).toBe('right');
		expect(relativePosition(2, 0)).toBe('across');
		expect(relativePosition(2, 1)).toBe('left');
	});
});

describe('seatView projection', () => {
	it("exposes only the viewing seat's own concealed hand", () => {
		const m = makeMatch();
		const view0 = seatView(m, 0);
		expect(view0.self.hand).toEqual(m.seats[0].hand);

		const view3 = seatView(m, 3);
		expect(view3.self.hand).toEqual(m.seats[3].hand);
		expect(view3.self.hand).not.toEqual(m.seats[0].hand);
	});

	it("never leaks another seat's concealed tiles", () => {
		const m = makeMatch();
		const concealedElsewhere = [...m.seats[1].hand, ...m.seats[2].hand, ...m.seats[3].hand];

		const view0 = seatView(m, 0);
		const visibleToSeat0: Tile[] = [
			...view0.self.hand,
			...view0.self.exposures.flatMap((e) => e.tiles),
			...[...view0.opponents.left, ...view0.opponents.across, ...view0.opponents.right].flatMap(
				(e) => e.tiles
			),
			...view0.discards
		];
		// seat 3's two jokers are concealed; they must not surface anywhere in seat 0's view
		expect(visibleToSeat0.filter((t) => t.kind === 'joker')).toHaveLength(0);
		// the only crack-7 lives concealed in seat 2's hand — it must be invisible to seat 0
		expect(visibleToSeat0.some((t) => tileEquals(t, N('crack', 7)))).toBe(false);
		// sanity: those tiles do exist in the match, we just can't see them
		expect(concealedElsewhere.some((t) => tileEquals(t, N('crack', 7)))).toBe(true);
	});

	it('places an exposure at the correct relative position with translated provenance', () => {
		const m = makeMatch();
		// seat 2's pung is across from seat 0, and it was called from seat 0 (self) -> dropped
		const view0 = seatView(m, 0);
		expect(view0.opponents.across).toHaveLength(1);
		expect(view0.opponents.across[0].owner).toBe('across');
		expect(view0.opponents.across[0].calledFrom).toBeUndefined();

		// from seat 1, that same pung sits to the right and was called from seat 0 = left
		const view1 = seatView(m, 1);
		expect(view1.opponents.right).toHaveLength(1);
		expect(view1.opponents.right[0].calledFrom).toBe('left');
	});

	it('feeds buildCensus a consistent accounting (3 red dragons seen -> 1 unseen)', () => {
		const m = makeMatch();
		const census = buildCensus(seatView(m, 0));
		expect(census.seenCount(Dg('red'))).toBe(3); // the exposed pung
		expect(census.unseenCount(Dg('red'))).toBe(1);
		// seat 0 cannot see seat 3's jokers, so all 8 jokers read as unseen from its chair
		expect(census.unseenCount(J())).toBe(8);
	});
});

describe('makeRng', () => {
	it('is deterministic per seed and differs across seeds', () => {
		const a = makeRng(42);
		const b = makeRng(42);
		const seqA = [a(), a(), a()];
		const seqB = [b(), b(), b()];
		expect(seqA).toEqual(seqB);
		const c = makeRng(43);
		expect([c(), c(), c()]).not.toEqual(seqA);
		for (const x of seqA) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(1);
		}
	});
});

describe('createMatch deal', () => {
	it('deals 14 to the dealer and 13 to everyone else', () => {
		const m = createMatch({ rulesetId: 'nmjl-2026', seed: 7, dealer: 0 });
		expect(m.seats[0].hand).toHaveLength(14);
		expect(m.seats[1].hand).toHaveLength(13);
		expect(m.seats[2].hand).toHaveLength(13);
		expect(m.seats[3].hand).toHaveLength(13);
		expect(m.wallPos).toBe(14 + 13 * 3);
		expect(m.wall).toHaveLength(152);
		expect(wallRemaining(m)).toBe(152 - 53);
		expect(m.turn).toBe(0);
		expect(m.phase).toBe('charleston');
	});

	it('honours a non-zero dealer', () => {
		const m = createMatch({ rulesetId: 'nmjl-2026', seed: 7, dealer: 2 });
		expect(m.seats[2].hand).toHaveLength(14);
		expect(m.seats[0].hand).toHaveLength(13);
		expect(m.turn).toBe(2);
	});

	it('is deterministic for a given seed', () => {
		const a = createMatch({ rulesetId: 'nmjl-2026', seed: 99 });
		const b = createMatch({ rulesetId: 'nmjl-2026', seed: 99 });
		expect(a.wall.map(tileKey)).toEqual(b.wall.map(tileKey));
		const c = createMatch({ rulesetId: 'nmjl-2026', seed: 100 });
		expect(c.wall.map(tileKey)).not.toEqual(a.wall.map(tileKey));
	});

	it('conserves the full 152-tile pool across hands and wall', () => {
		const m = createMatch({ rulesetId: 'nmjl-2026', seed: 7 });
		const dealt = m.seats.flatMap((s) => s.hand);
		const remaining = m.wall.slice(m.wallPos);
		expect(multiset([...dealt, ...remaining])).toEqual(multiset(fullTilePool()));
	});

	it('deals from the front of a stacked wall verbatim', () => {
		const stacked = fullTilePool(); // unshuffled, deterministic order
		const m = createMatch({ rulesetId: 'nmjl-2026', seed: 1, dealer: 0, wall: stacked });
		expect(m.seats[0].hand).toEqual(stacked.slice(0, 14));
		expect(m.seats[1].hand).toEqual(stacked.slice(14, 27));
		expect(m.wall).not.toBe(stacked); // defensively copied
	});
});

describe('charleston driver', () => {
	it('preserves per-seat hand sizes and the full pool through three passes', () => {
		const start = createMatch({ rulesetId: 'nmjl-2026', seed: 7, dealer: 0 });
		const m = runMandatoryCharleston(start, nmjl2026);

		expect(m.seats[0].hand).toHaveLength(14); // dealer keeps its extra
		expect(m.seats[1].hand).toHaveLength(13);
		expect(m.seats[2].hand).toHaveLength(13);
		expect(m.seats[3].hand).toHaveLength(13);

		const all = [...m.seats.flatMap((s) => s.hand), ...m.wall.slice(m.wallPos)];
		expect(multiset(all)).toEqual(multiset(start.wall));
		expect(m.phase).toBe('play');
		expect(m.turn).toBe(m.dealer);
	});

	it('records 12 log entries (4 seats x 3 passes) and never passes a joker', () => {
		const m = runMandatoryCharleston(createMatch({ rulesetId: 'nmjl-2026', seed: 11 }), nmjl2026);
		expect(m.charleston?.log).toHaveLength(12);
		const everySent = m.charleston!.log.flatMap((p) => p.sentTiles);
		expect(everySent.some((t) => t.kind === 'joker')).toBe(false);
		expect(m.charleston!.log.map((p) => p.direction)).toEqual(
			expect.arrayContaining(['right', 'across', 'left'])
		);
	});

	it("projects each seat's own three passes into its view, with directions", () => {
		const m = runMandatoryCharleston(createMatch({ rulesetId: 'nmjl-2026', seed: 11 }), nmjl2026);
		for (const seat of [0, 1, 2, 3] as SeatId[]) {
			const passes = seatView(m, seat).charleston.passes;
			expect(passes).toHaveLength(3);
			expect(passes.map((p) => p.direction)).toEqual(['right', 'across', 'left']);
			for (const p of passes) {
				expect(p.sentTiles).toHaveLength(3);
				expect(p.receivedTiles).toHaveLength(3);
			}
		}
	});

	it('rejects a pass containing a tile the seat does not hold', () => {
		const m = beginCharleston(createMatch({ rulesetId: 'nmjl-2026', seed: 7, dealer: 0 }));
		const bogus: Tile = { kind: 'flower' };
		const picks = [
			[m.seats[0].hand[0], m.seats[0].hand[1], bogus],
			m.seats[1].hand.slice(0, 3),
			m.seats[2].hand.slice(0, 3),
			m.seats[3].hand.slice(0, 3)
		] as [Tile[], Tile[], Tile[], Tile[]];
		// only throws if the bogus flower isn't coincidentally in hand; guard the assumption
		if (!m.seats[0].hand.some((t) => t.kind === 'flower')) {
			expect(() => charlestonPass(m, 'right', picks)).toThrow();
		}
	});
});

describe('courtesy pass', () => {
	const W = (wind: 'N' | 'E' | 'S' | 'W'): Tile => ({ kind: 'wind', wind });

	function started(hands: [Tile[], Tile[], Tile[], Tile[]]): Match {
		return beginCharleston({
			rulesetId: 'nmjl-2026',
			phase: 'charleston',
			dealer: 0,
			seats: [
				{ hand: hands[0], exposures: [] },
				{ hand: hands[1], exposures: [] },
				{ hand: hands[2], exposures: [] },
				{ hand: hands[3], exposures: [] }
			],
			wall: [],
			wallPos: 0,
			turn: 0,
			turnCounter: 0,
			discards: [],
			seed: 1,
			rng: Math.random,
			profiles
		});
	}

	const baseHands = (): [Tile[], Tile[], Tile[], Tile[]] => [
		[N('crack', 1), N('crack', 2), N('crack', 3), N('crack', 4)],
		[N('bamboo', 1), N('bamboo', 2), N('bamboo', 3), N('bamboo', 4)],
		[N('dot', 1), N('dot', 2), N('dot', 3), N('dot', 4)],
		[W('E'), W('S'), W('W'), W('N')]
	];

	it('exchanges three tiles across each pair and conserves the pool', () => {
		const m = started(baseHands());
		const picks = [
			[N('crack', 1), N('crack', 2), N('crack', 3)],
			[N('bamboo', 1), N('bamboo', 2), N('bamboo', 3)],
			[N('dot', 1), N('dot', 2), N('dot', 3)],
			[W('E'), W('S'), W('W')]
		] as [Tile[], Tile[], Tile[], Tile[]];
		const after = courtesyPass(m, picks);

		expect(multiset(after.seats[0].hand)).toEqual(
			multiset([N('crack', 4), N('dot', 1), N('dot', 2), N('dot', 3)])
		);
		expect(multiset(after.seats[2].hand)).toEqual(
			multiset([N('dot', 4), N('crack', 1), N('crack', 2), N('crack', 3)])
		);
		expect(multiset(after.seats[1].hand)).toEqual(
			multiset([N('bamboo', 4), W('E'), W('S'), W('W')])
		);
		expect(multiset(after.seats[3].hand)).toEqual(
			multiset([W('N'), N('bamboo', 1), N('bamboo', 2), N('bamboo', 3)])
		);

		const before = baseHands().flat();
		expect(multiset(after.seats.flatMap((s) => s.hand))).toEqual(multiset(before));
	});

	it('allows the two pairs to trade different counts (2 and 0)', () => {
		const m = started(baseHands());
		const picks = [
			[N('crack', 1), N('crack', 2)],
			[],
			[N('dot', 1), N('dot', 2)],
			[]
		] as [Tile[], Tile[], Tile[], Tile[]];
		const after = courtesyPass(m, picks);

		expect(multiset(after.seats[0].hand)).toEqual(
			multiset([N('crack', 3), N('crack', 4), N('dot', 1), N('dot', 2)])
		);
		expect(multiset(after.seats[2].hand)).toEqual(
			multiset([N('dot', 3), N('dot', 4), N('crack', 1), N('crack', 2)])
		);
		// the 1↔3 pair sat out: their hands are unchanged
		expect(after.seats[1].hand).toEqual(baseHands()[1]);
		expect(after.seats[3].hand).toEqual(baseHands()[3]);
	});

	it('handles an all-zero courtesy (everyone declines) as a no-op exchange', () => {
		const m = started(baseHands());
		const after = courtesyPass(m, [[], [], [], []]);
		for (const s of [0, 1, 2, 3] as SeatId[]) {
			expect(after.seats[s].hand).toEqual(baseHands()[s]);
		}
		expect(after.charleston?.log).toHaveLength(4);
		expect(after.charleston!.log.every((p) => p.direction === 'courtesy')).toBe(true);
		expect(after.charleston!.log.every((p) => p.sentTiles.length === 0)).toBe(true);
	});

	it('rejects unequal counts within a pair', () => {
		const m = started(baseHands());
		const picks = [
			[N('crack', 1), N('crack', 2)],
			[],
			[N('dot', 1)],
			[]
		] as [Tile[], Tile[], Tile[], Tile[]];
		expect(() => courtesyPass(m, picks)).toThrow();
	});

	it('rejects passing more than three tiles', () => {
		const m = started(baseHands());
		const picks = [
			[N('crack', 1), N('crack', 2), N('crack', 3), N('crack', 4)],
			[],
			[N('dot', 1), N('dot', 2), N('dot', 3), N('dot', 4)],
			[]
		] as [Tile[], Tile[], Tile[], Tile[]];
		expect(() => courtesyPass(m, picks)).toThrow();
	});

	it("reconstructs each seat's courtesy pass in its own view", () => {
		const m = started(baseHands());
		const picks = [
			[N('crack', 1), N('crack', 2), N('crack', 3)],
			[N('bamboo', 1), N('bamboo', 2), N('bamboo', 3)],
			[N('dot', 1), N('dot', 2), N('dot', 3)],
			[W('E'), W('S'), W('W')]
		] as [Tile[], Tile[], Tile[], Tile[]];
		const after = courtesyPass(m, picks);
		const passes0 = seatView(after, 0).charleston.passes;
		expect(passes0).toHaveLength(1);
		expect(passes0[0].direction).toBe('courtesy');
		expect(multiset(passes0[0].sentTiles)).toEqual(
			multiset([N('crack', 1), N('crack', 2), N('crack', 3)])
		);
		expect(multiset(passes0[0].receivedTiles)).toEqual(
			multiset([N('dot', 1), N('dot', 2), N('dot', 3)])
		);
	});
});

describe('play loop (no claims)', () => {
	it('detects a self-draw win and ends the match', () => {
		// 222 444 6666 8888 in crack is a complete NMJL hand (2468 #1). Seat 1 holds it minus
		// one 8; the top of the wall is that 8, so its first draw wins.
		const winningMinusOne: Tile[] = [
			...rep(N('crack', 2), 3),
			...rep(N('crack', 4), 3),
			...rep(N('crack', 6), 4),
			...rep(N('crack', 8), 3)
		];
		const m: Match = {
			rulesetId: 'nmjl-2026',
			phase: 'play',
			dealer: 0,
			seats: [
				{ hand: rep(N('dot', 1), 13), exposures: [] },
				{ hand: winningMinusOne, exposures: [] },
				{ hand: rep(N('dot', 1), 13), exposures: [] },
				{ hand: rep(N('dot', 1), 13), exposures: [] }
			],
			wall: [N('crack', 8), ...rep(N('bamboo', 1), 20)],
			wallPos: 0,
			turn: 1,
			turnCounter: 0,
			discards: [],
			seed: 1,
			rng: Math.random,
			profiles
		};
		const done = runToCompletion(m, nmjl2026);
		expect(done.phase).toBe('ended');
		expect(done.result).toMatchObject({ kind: 'mahjong', winner: 1, fromDiscard: false });
		expect(done.seats[1].hand).toHaveLength(14);
	});

	it('plays a seeded game to wall exhaustion, conserving all 152 tiles', () => {
		const start = createMatch({ rulesetId: 'nmjl-2026', seed: 7, dealer: 0 });
		const done = runToCompletion(runMandatoryCharleston(start, nmjl2026), nmjl2026);

		expect(done.phase).toBe('ended');
		// random-ish play essentially never assembles a natural 14-tile win, so the wall empties
		expect(done.result?.kind).toBe('wall-exhausted');
		expect(wallRemaining(done)).toBe(0);

		const all = [
			...done.seats.flatMap((s) => [...s.hand, ...s.exposures.flatMap((e) => e.tiles)]),
			...done.discards.map((d) => d.tile),
			...done.wall.slice(done.wallPos)
		];
		expect(multiset(all)).toEqual(multiset(start.wall));
	});

	it('cycles discards in turn order starting from the dealer', () => {
		const start = createMatch({ rulesetId: 'nmjl-2026', seed: 3, dealer: 0 });
		const done = runToCompletion(runMandatoryCharleston(start, nmjl2026), nmjl2026);
		expect(done.discards.slice(0, 8).map((d) => d.by)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
	});

	it('rejects a discard out of turn', () => {
		const start = createMatch({ rulesetId: 'nmjl-2026', seed: 3, dealer: 0 });
		const m = { ...start, phase: 'play' as const, turn: 0 as SeatId };
		expect(() => applyDiscard(m, 1, m.seats[1].hand[0])).toThrow();
	});
});

describe('NMJL game legality', () => {
	it('canClaimForExposure gates on holding a natural and offers pung/kong', () => {
		expect(nmjl2026.canClaimForExposure(handState([Dg('red'), Dg('red')]), Dg('red'))).toEqual([
			{ kind: 'pung', tile: Dg('red'), jokersNeeded: 0 }
		]);
		expect(
			nmjl2026
				.canClaimForExposure(handState([Dg('red'), Dg('red'), Dg('red')]), Dg('red'))
				.map((o) => o.kind)
		).toEqual(['pung', 'kong']);
		// one natural + a joker still makes a pung, with the joker counted
		expect(nmjl2026.canClaimForExposure(handState([Dg('red'), J()]), Dg('red'))).toEqual([
			{ kind: 'pung', tile: Dg('red'), jokersNeeded: 1 }
		]);
		// no natural copy held -> can't conjure a group from jokers alone
		expect(nmjl2026.canClaimForExposure(handState([J(), J()]), Dg('red'))).toEqual([]);
		// flowers and jokers are never claimable
		expect(nmjl2026.canClaimForExposure(handState([F(), F()]), F())).toEqual([]);
		expect(nmjl2026.canClaimForExposure(handState([J(), J()]), J())).toEqual([]);
	});

	it('isLegalExposure accepts pung/kong with jokers but rejects all-jokers and chows', () => {
		const s = handState([]);
		expect(nmjl2026.isLegalExposure([Dg('red'), Dg('red'), Dg('red')], Dg('red'), s)).toBe(true);
		expect(nmjl2026.isLegalExposure([Dg('red'), Dg('red'), J()], Dg('red'), s)).toBe(true);
		expect(
			nmjl2026.isLegalExposure([Dg('red'), Dg('red'), Dg('red'), Dg('red')], Dg('red'), s)
		).toBe(true);
		expect(nmjl2026.isLegalExposure([J(), J(), J()], Dg('red'), s)).toBe(false);
		expect(nmjl2026.isLegalExposure([Dg('red'), Dg('red')], Dg('red'), s)).toBe(false);
		expect(nmjl2026.isLegalExposure([Dg('red'), Dg('red'), Dg('green')], Dg('red'), s)).toBe(false);
	});

	it('isLegalMahjong distinguishes self-draw, by-discard, and a joker claim', () => {
		expect(nmjl2026.isLegalMahjong(handState(WIN_MINUS_ONE), { fromDiscard: N('crack', 8) })).toBe(
			true
		);
		expect(nmjl2026.isLegalMahjong(handState(WIN_MINUS_ONE), { fromDiscard: J() })).toBe(false);
		expect(nmjl2026.isLegalMahjong(handState(WIN_MINUS_ONE))).toBe(false); // only 13 tiles
		expect(nmjl2026.isLegalMahjong(handState([...WIN_MINUS_ONE, N('crack', 8)]))).toBe(true);
	});
});

describe('claim window resolution', () => {
	function playMatch(hands: [Tile[], Tile[], Tile[], Tile[]], turn: SeatId): Match {
		return {
			rulesetId: 'nmjl-2026',
			phase: 'play',
			dealer: 0,
			seats: [
				{ hand: hands[0], exposures: [] },
				{ hand: hands[1], exposures: [] },
				{ hand: hands[2], exposures: [] },
				{ hand: hands[3], exposures: [] }
			],
			wall: [],
			wallPos: 0,
			turn,
			turnCounter: 0,
			discards: [],
			seed: 1,
			rng: Math.random,
			profiles
		};
	}

	it('forms an exposure for the claimant and jumps the turn to them', () => {
		const m = playMatch(
			[
				[N('crack', 5), ...rep(N('dot', 1), 13)],
				rep(N('dot', 2), 13),
				[N('crack', 5), N('crack', 5), ...rep(N('dot', 3), 11)],
				rep(N('dot', 4), 13)
			],
			0
		);
		const opened = applyDiscard(m, 0, N('crack', 5));
		const resolved = resolveClaimWindow(opened, nmjl2026, [{ seat: 2, kind: 'pung' }]);

		expect(resolved.turn).toBe(2);
		expect(resolved.claim).toBeUndefined();
		expect(resolved.discards).toHaveLength(0); // the called tile leaves the pile
		const ex = resolved.seats[2].exposures;
		expect(ex).toHaveLength(1);
		expect(ex[0]).toMatchObject({ kind: 'pung', calledFrom: 0 });
		expect(ex[0].tiles).toHaveLength(3);
		expect(resolved.seats[2].hand).toHaveLength(11); // two 5c left the hand
	});

	it('lets mahjong beat a pung claim on the same discard', () => {
		const m = playMatch(
			[
				[N('crack', 8), ...rep(N('dot', 1), 13)],
				[N('crack', 8), N('crack', 8), ...rep(N('dot', 2), 11)],
				rep(N('dot', 3), 13),
				WIN_MINUS_ONE
			],
			0
		);
		const opened = applyDiscard(m, 0, N('crack', 8));
		const resolved = resolveClaimWindow(opened, nmjl2026, [
			{ seat: 1, kind: 'pung' },
			{ seat: 3, kind: 'mahjong' }
		]);
		expect(resolved.phase).toBe('ended');
		expect(resolved.result).toMatchObject({ kind: 'mahjong', winner: 3, fromDiscard: true });
	});

	it('advances normally when everyone passes', () => {
		const m = playMatch(
			[[N('crack', 8), ...rep(N('dot', 1), 13)], rep(N('dot', 2), 13), rep(N('dot', 3), 13), rep(N('dot', 4), 13)],
			0
		);
		const resolved = resolveClaimWindow(applyDiscard(m, 0, N('crack', 8)), nmjl2026, []);
		expect(resolved.turn).toBe(1);
		expect(resolved.claim).toBeUndefined();
		expect(resolved.discards).toHaveLength(1);
	});

	it('ignores an illegal claim (no matching natural) and advances', () => {
		const m = playMatch(
			[[N('crack', 8), ...rep(N('dot', 1), 13)], rep(N('dot', 2), 13), rep(N('dot', 3), 13), rep(N('dot', 4), 13)],
			0
		);
		const resolved = resolveClaimWindow(applyDiscard(m, 0, N('crack', 8)), nmjl2026, [
			{ seat: 2, kind: 'pung' }
		]);
		expect(resolved.turn).toBe(1);
		expect(resolved.seats[2].exposures).toHaveLength(0);
	});
});

describe('bot agents', () => {
	const agent = botAgent(nmjl2026);

	it('follows the engine discard with a deterministic profile', () => {
		const view = handState([...WIN_MINUS_ONE, N('dot', 5)]); // dot-5 is the odd tile out
		const best = nmjl2026.suggestDiscard(view).discard!;
		for (let i = 0; i < 5; i++) {
			expect(tileEquals(agent.chooseDiscard(view, HUMAN_PROFILE, () => 0.99), best)).toBe(true);
		}
	});

	it('strays from the engine line under high randomness', () => {
		const view = handState([...WIN_MINUS_ONE, N('dot', 5)]);
		const noisy: BehaviorProfile = { ...DEFAULT_BOT_PROFILE, discardRandomness: 1, skill: 0 };
		const rng = makeRng(1);
		const picks = new Set<string>();
		for (let i = 0; i < 12; i++) picks.add(tileKey(agent.chooseDiscard(view, noisy, rng)));
		expect(picks.size).toBeGreaterThan(1);
	});

	it('always claims a legal mahjong, and passes when nothing can be claimed', () => {
		expect(
			agent.chooseClaim(handState(WIN_MINUS_ONE), N('crack', 8), DEFAULT_BOT_PROFILE, () => 0.5)
		).toBe('mahjong');
		expect(
			agent.chooseClaim(handState(rep(N('dot', 1), 13)), Dg('red'), DEFAULT_BOT_PROFILE, () => 0.5)
		).toBe('pass');
	});

	it('claims a pung when the tile helps but does not win', () => {
		// 222 44 6666 88 + two off-pattern tiles: two crack-4s in hand, and the discarded 4c
		// improves 2468 #1 (444 completes) without finishing the hand (still short two 8s).
		const hand = [
			...rep(N('crack', 2), 3),
			...rep(N('crack', 4), 2),
			...rep(N('crack', 6), 4),
			...rep(N('crack', 8), 2),
			N('crack', 3),
			N('crack', 5)
		];
		expect(agent.chooseClaim(handState(hand), N('crack', 4), DEFAULT_BOT_PROFILE, () => 0.5)).toBe(
			'pung'
		);
	});

	it('plays a full all-bot game to completion, conserving the pool', () => {
		const start = createMatch({ rulesetId: 'nmjl-2026', seed: 5 });
		const done = runWithBots(runMandatoryCharleston(start, nmjl2026), nmjl2026);
		expect(done.phase).toBe('ended');
		const all = [
			...done.seats.flatMap((s) => [...s.hand, ...s.exposures.flatMap((e) => e.tiles)]),
			...done.discards.map((d) => d.tile),
			...done.wall.slice(done.wallPos)
		];
		expect(multiset(all)).toEqual(multiset(start.wall));
	});

	it('is deterministic per seed over the opening turns', () => {
		const build = () => runMandatoryCharleston(createMatch({ rulesetId: 'nmjl-2026', seed: 5 }), nmjl2026);
		const playN = (m0: Match): Match => {
			let m = m0;
			for (let i = 0; i < 15 && m.phase === 'play'; i++) m = stepWithBots(m, agent, nmjl2026);
			return m;
		};
		const a = playN(build());
		const b = playN(build());
		expect(a.discards.map((d) => tileKey(d.tile))).toEqual(b.discards.map((d) => tileKey(d.tile)));
	});
});

describe('endgame and concealed-hand rules', () => {
	// 2468 #8 (concealed): FF 246 888 (suit A) 246 888 (suit B).
	const concealedWin: Tile[] = [
		F(),
		F(),
		N('crack', 2),
		N('crack', 4),
		N('crack', 6),
		...rep(N('crack', 8), 3),
		N('bamboo', 2),
		N('bamboo', 4),
		N('bamboo', 6),
		...rep(N('bamboo', 8), 3)
	];

	it('accepts a concealed hand only while fully concealed', () => {
		expect(nmjl2026.isWinningHand(handState(concealedWin))).toBe(true);

		const exposed: GameState = {
			...handState(concealedWin),
			self: {
				hand: concealedWin,
				exposures: [{ owner: 'self', tiles: [Dg('red'), Dg('red'), Dg('red')] }]
			}
		};
		// having made an exposure, the concealed hand can no longer be declared a win
		expect(nmjl2026.isWinningHand(exposed)).toBe(false);
	});

	it('still wins an open (non-concealed) hand after exposing', () => {
		const openWin: GameState = {
			...handState([...WIN_MINUS_ONE, N('crack', 8)]),
			self: {
				hand: [...WIN_MINUS_ONE, N('crack', 8)],
				exposures: [{ owner: 'self', tiles: [Dg('green'), Dg('green'), Dg('green')] }]
			}
		};
		expect(nmjl2026.isWinningHand(openWin)).toBe(true);
	});

	it('a self-drawn win ends the match with the drawing seat as winner', () => {
		const m: Match = {
			rulesetId: 'nmjl-2026',
			phase: 'play',
			dealer: 0,
			seats: [
				{ hand: rep(N('dot', 1), 13), exposures: [] },
				{ hand: WIN_MINUS_ONE, exposures: [] },
				{ hand: rep(N('dot', 1), 13), exposures: [] },
				{ hand: rep(N('dot', 1), 13), exposures: [] }
			],
			wall: [N('crack', 8), ...rep(N('bamboo', 1), 20)],
			wallPos: 0,
			turn: 1,
			turnCounter: 0,
			discards: [],
			seed: 1,
			rng: Math.random,
			profiles
		};
		const done = runWithBots(m, nmjl2026);
		expect(done.result).toMatchObject({ kind: 'mahjong', winner: 1, fromDiscard: false });
	});
});
