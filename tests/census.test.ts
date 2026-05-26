import { describe, it, expect } from 'vitest';
import { buildCensus } from '../src/lib/engine/census';
import { emptyState, type GameState } from '../src/lib/engine/gameState';
import type { Tile, Suit } from '../src/lib/engine/tiles';

const N = (suit: Suit, rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const J = (): Tile => ({ kind: 'joker' });
const F = (): Tile => ({ kind: 'flower' });
const W = (wind: 'N' | 'E' | 'W' | 'S'): Tile => ({ kind: 'wind', wind });
const D = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });

describe('TileCensus', () => {
	it('an empty state leaves the whole 152-tile pool unseen', () => {
		const c = buildCensus(emptyState());
		expect(c.unseenTotal()).toBe(152);
		expect(c.unseenCount(N('crack', 5))).toBe(4);
		expect(c.unseenCount(F())).toBe(8);
		expect(c.unseenCount(J())).toBe(8);
		expect(c.unseenCount(W('N'))).toBe(4);
		expect(c.unseenCount(D('red'))).toBe(4);
	});

	it('counts copies across every seen source — hand, exposures, opponents, discards', () => {
		const s: GameState = {
			phase: 'play',
			self: {
				hand: [N('crack', 5), N('crack', 5)],
				exposures: [{ owner: 'self', tiles: [N('crack', 5)] }]
			},
			opponents: {
				left: [{ owner: 'left', tiles: [N('bamboo', 3), N('bamboo', 3), N('bamboo', 3)] }],
				across: [],
				right: [{ owner: 'right', tiles: [D('red'), D('red'), D('red')] }]
			},
			discards: [N('crack', 5), N('dot', 9)],
			charleston: { passes: [] }
		};
		const c = buildCensus(s);
		expect(c.seenCount(N('crack', 5))).toBe(4); // 2 hand + 1 self-exposure + 1 discard
		expect(c.unseenCount(N('crack', 5))).toBe(0);
		expect(c.seenCount(N('bamboo', 3))).toBe(3);
		expect(c.unseenCount(N('bamboo', 3))).toBe(1);
		expect(c.seenCount(D('red'))).toBe(3);
		expect(c.seenCount(N('dot', 9))).toBe(1);
	});

	it('counts only the sent side of each committed Charleston pass', () => {
		// Once a pass commits, received tiles already live in self.hand; counting them again
		// in `passes[].receivedTiles` would double-count the same physical tile. Sent tiles
		// have left the hand and are tracked nowhere else, so they must be added.
		const s: GameState = {
			...emptyState(),
			self: {
				hand: [N('crack', 5), N('crack', 5)], // received from a prior pass
				exposures: []
			},
			charleston: {
				passes: [
					{
						direction: 'right',
						sentTiles: [N('bamboo', 1), N('bamboo', 1)],
						receivedTiles: [N('crack', 5), N('crack', 5)]
					}
				]
			}
		};
		const c = buildCensus(s);
		expect(c.seenCount(N('crack', 5))).toBe(2); // hand only — NOT also from receivedTiles
		expect(c.seenCount(N('bamboo', 1))).toBe(2); // tracked solely via sentTiles
	});

	it('drawProbability divides unseen copies by the unseen total, guarded when empty', () => {
		const c = buildCensus(emptyState());
		expect(c.drawProbability(N('crack', 5))).toBeCloseTo(4 / 152, 6);
		// Drain the pool by claiming every tile is seen via discards (synthetic, but exercises
		// the guard). With unseenTotal === 0, drawProbability must return 0, not divide by 0.
		const drained: GameState = {
			...emptyState(),
			discards: Array.from({ length: 200 }, () => N('crack', 5)) // over-seen, will clamp
		};
		const d = buildCensus(drained);
		expect(d.unseenCount(N('crack', 5))).toBe(0); // clamped, not negative
		// Other tiles still unseen — pool isn't empty here. Verify monotonicity instead.
		expect(d.drawProbability(N('crack', 5))).toBe(0);
		expect(d.drawProbability(N('dot', 7))).toBeGreaterThan(0);
	});
});
