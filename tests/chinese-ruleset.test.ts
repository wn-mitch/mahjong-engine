import { describe, it, expect } from 'vitest';
import type { Tile } from '../src/lib/engine/tiles';
import { emptyState } from '../src/lib/engine/gameState';
import { chineseTraditional } from '../src/lib/rulesets/chinese-traditional';
import { rankingPoints } from '../src/lib/rulesets/chinese-traditional/evaluator';

const n = (suit: 'crack' | 'bamboo' | 'dot', rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const w = (wind: 'E' | 'S' | 'W' | 'N'): Tile => ({ kind: 'wind', wind });
const d = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });
const f = (): Tile => ({ kind: 'flower' });

function stateWithHand(tiles: Tile[]): ReturnType<typeof emptyState> {
	const state = emptyState();
	state.self.hand = tiles;
	state.phase = 'play';
	return state;
}

describe('ChineseTraditionalRuleset — identity', () => {
	it('exposes id, name, version', () => {
		expect(chineseTraditional.id).toBe('chinese-traditional');
		expect(chineseTraditional.name).toBe('Chinese (modern HK-style)');
		expect(chineseTraditional.version).toBeTypeOf('string');
	});

	it('returns no Charleston suggestion', () => {
		const result = chineseTraditional.suggestCharlestonPass(emptyState(), 'right');
		expect(result.tiles).toHaveLength(0);
		expect(result.rationale.toLowerCase()).toContain('no charleston');
	});

	it('handles empty state gracefully', () => {
		const empty = emptyState();
		const targets = chineseTraditional.evaluateTargets(empty);
		expect(Array.isArray(targets)).toBe(true);
		expect(targets.length).toBeGreaterThan(0);
		expect(chineseTraditional.isWinningHand(empty)).toBe(false);
		const sugg = chineseTraditional.suggestDiscard(empty);
		expect(sugg.discard).toBeNull();
	});
});

describe('ChineseTraditionalRuleset — winning detection', () => {
	it('a clean three-chow + pung + pair hand is winning', () => {
		const state = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		]);
		expect(chineseTraditional.isWinningHand(state)).toBe(true);
	});

	it('a tenpai hand is not winning', () => {
		const state = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		]);
		expect(chineseTraditional.isWinningHand(state)).toBe(false);
	});

	it('flowers do not block winning', () => {
		const state = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5),
			f(), f()
		]);
		expect(chineseTraditional.isWinningHand(state)).toBe(true);
	});
});

describe('ChineseTraditionalRuleset — target ranking', () => {
	it('a pure-bamboo all-chow hand ranks Pure Suit and All Chows at the top', () => {
		const state = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('bamboo', 2), n('bamboo', 3), n('bamboo', 4),
			n('bamboo', 5), n('bamboo', 5)
		]);
		const targets = chineseTraditional.evaluateTargets(state);
		const topIds = targets.slice(0, 2).map((t) => t.target.id);
		expect(topIds).toContain('pure-suit');
		expect(topIds).toContain('all-chows');
	});

	it('completion × points reflects flowers in the ranking', () => {
		const noFlowers = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('bamboo', 2), n('bamboo', 3), n('bamboo', 4),
			n('bamboo', 5), n('bamboo', 5)
		]);
		const withFlowers = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('bamboo', 2), n('bamboo', 3), n('bamboo', 4),
			n('bamboo', 5), n('bamboo', 5),
			f(), f(), f()
		]);
		const topA = chineseTraditional.evaluateTargets(noFlowers)[0];
		const topB = chineseTraditional.evaluateTargets(withFlowers)[0];
		expect(rankingPoints(topB)).toBeGreaterThan(rankingPoints(topA));
	});
});

describe('ChineseTraditionalRuleset — GameRuleset surface', () => {
	it('deals 13 to each non-dealer, 14 to dealer', () => {
		const counts = chineseTraditional.dealCounts();
		expect(counts.perSeat).toBe(13);
		expect(counts.dealerExtra).toBe(1);
	});

	it('has an empty Charleston plan (no charleston phase)', () => {
		expect(chineseTraditional.charlestonPlan()).toHaveLength(0);
	});

	it('offers pung when the hand holds two naturals of the discard', () => {
		const state = stateWithHand([n('bamboo', 5), n('bamboo', 5), n('crack', 1)]);
		state.lastDiscarder = 'right'; // chow blocked, pung permitted
		const opts = chineseTraditional.canClaimForExposure(state, n('bamboo', 5));
		expect(opts.some((o) => o.kind === 'pung')).toBe(true);
		expect(opts.some((o) => o.kind === 'kong')).toBe(false);
		expect(opts.some((o) => o.kind === 'chow')).toBe(false);
	});

	it('offers kong when the hand holds three naturals of the discard', () => {
		const state = stateWithHand([n('bamboo', 5), n('bamboo', 5), n('bamboo', 5)]);
		state.lastDiscarder = 'across';
		const opts = chineseTraditional.canClaimForExposure(state, n('bamboo', 5));
		expect(opts.some((o) => o.kind === 'pung')).toBe(true);
		expect(opts.some((o) => o.kind === 'kong')).toBe(true);
	});

	it('offers chow only when the discard came from the upstream (left) seat', () => {
		const hand = [n('bamboo', 3), n('bamboo', 4), n('crack', 1)];

		// Right or across discarders: no chow offered.
		const rightState = stateWithHand(hand);
		rightState.lastDiscarder = 'right';
		const fromRight = chineseTraditional.canClaimForExposure(rightState, n('bamboo', 5));
		expect(fromRight.every((o) => o.kind !== 'chow')).toBe(true);

		const acrossState = stateWithHand(hand);
		acrossState.lastDiscarder = 'across';
		const fromAcross = chineseTraditional.canClaimForExposure(acrossState, n('bamboo', 5));
		expect(fromAcross.every((o) => o.kind !== 'chow')).toBe(true);

		// Upstream (left) discarder: chow surfaces with the correct support.
		const leftState = stateWithHand(hand);
		leftState.lastDiscarder = 'left';
		const fromLeft = chineseTraditional.canClaimForExposure(leftState, n('bamboo', 5));
		const chowOpts = fromLeft.filter((o) => o.kind === 'chow');
		expect(chowOpts).toHaveLength(1);
		expect(chowOpts[0].support).toEqual([n('bamboo', 3), n('bamboo', 4)]);
	});

	it('surfaces all three chow completions when the hand supports each position', () => {
		// Discarded 5-bamboo could be low (5-6-7), middle (4-5-6), or high (3-4-5).
		const hand = [
			n('bamboo', 3),
			n('bamboo', 4),
			n('bamboo', 6),
			n('bamboo', 7),
			n('crack', 1)
		];
		const state = stateWithHand(hand);
		state.lastDiscarder = 'left';
		const opts = chineseTraditional.canClaimForExposure(state, n('bamboo', 5));
		const chows = opts.filter((o) => o.kind === 'chow');
		expect(chows).toHaveLength(3);
		// Each chow support contains exactly two tiles.
		for (const c of chows) expect(c.support).toHaveLength(2);
	});

	it('isLegalExposure accepts pung, kong, and consecutive same-suit chow shapes', () => {
		const state = stateWithHand([]);
		const five = n('bamboo', 5);

		// Pung
		expect(
			chineseTraditional.isLegalExposure([n('bamboo', 5), n('bamboo', 5), five], five, state)
		).toBe(true);
		// Kong
		expect(
			chineseTraditional.isLegalExposure(
				[n('bamboo', 5), n('bamboo', 5), n('bamboo', 5), five],
				five,
				state
			)
		).toBe(true);
		// Chow with claimed as middle
		expect(
			chineseTraditional.isLegalExposure([n('bamboo', 4), five, n('bamboo', 6)], five, state)
		).toBe(true);
		// Wrong suit chow rejected
		expect(
			chineseTraditional.isLegalExposure([n('bamboo', 4), five, n('dot', 6)], five, state)
		).toBe(false);
		// Non-consecutive rejected
		expect(
			chineseTraditional.isLegalExposure([n('bamboo', 3), five, n('bamboo', 7)], five, state)
		).toBe(false);
	});

	it('isLegalMahjong is true for a winning hand on self-draw and false otherwise', () => {
		const winning = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		]);
		expect(chineseTraditional.isLegalMahjong(winning)).toBe(true);

		const tenpai = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		]);
		expect(chineseTraditional.isLegalMahjong(tenpai)).toBe(false);
		// But with the missing 9-bamboo claimed from a discard, it wins.
		expect(chineseTraditional.isLegalMahjong(tenpai, { fromDiscard: n('bamboo', 9) })).toBe(true);
	});
});

describe('ChineseTraditionalRuleset — discard advice', () => {
	it('does not recommend discarding a flower', () => {
		const state = stateWithHand([
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8),
			w('E'), w('E'), w('E'),
			n('dot', 5), f()
		]);
		const sugg = chineseTraditional.suggestDiscard(state);
		expect(sugg.discard?.kind === 'flower').toBe(false);
	});

	it('prefers off-axis lone honors over tiles that complete chows', () => {
		// Hand has two near-complete chows (1-2-?, 5-6-?) and one stray dragon + pair. The
		// dragon contributes nothing toward chows; it should be the natural shed.
		const state = stateWithHand([
			n('bamboo', 1), n('bamboo', 2),
			n('bamboo', 5), n('bamboo', 6),
			n('crack', 3), n('crack', 4),
			n('dot', 7), n('dot', 8),
			n('dot', 4), n('dot', 4),
			d('red'),
			w('N'), w('N'),
			n('dot', 9)
		]);
		state.seatWind = 'E';
		state.roundWind = 'E';
		const sugg = chineseTraditional.suggestDiscard(state);
		// Either the lone red dragon or the lone 9-dot is acceptable; the test enforces
		// "not a tile already pulling its weight" — i.e., not a 1, 2, 5, 6 bamboo or a
		// north wind (the pair).
		const t = sugg.discard;
		expect(t).not.toBeNull();
		const isPair = t && t.kind === 'wind' && t.wind === 'N';
		const isChowTile =
			t &&
			t.kind === 'number' &&
			((t.suit === 'bamboo' && [1, 2, 5, 6].includes(t.rank)) ||
				(t.suit === 'crack' && [3, 4].includes(t.rank)) ||
				(t.suit === 'dot' && [7, 8].includes(t.rank)) ||
				(t.suit === 'dot' && t.rank === 4));
		expect(isPair).toBe(false);
		expect(isChowTile).toBe(false);
	});
});
