import { describe, it, expect } from 'vitest';
import type { Tile } from '../src/lib/engine/tiles';
import { bestDecomposition } from '../src/lib/rulesets/chinese-traditional/decomposer';
import {
	defaultContext,
	scoreDecomposition
} from '../src/lib/rulesets/chinese-traditional/scoring';

const n = (suit: 'crack' | 'bamboo' | 'dot', rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const w = (wind: 'E' | 'S' | 'W' | 'N'): Tile => ({ kind: 'wind', wind });
const d = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });

describe('scoreDecomposition — basic shapes', () => {
	it('all pungs scores 6', () => {
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 1), n('crack', 1),
			n('bamboo', 5), n('bamboo', 5), n('bamboo', 5),
			n('dot', 9), n('dot', 9), n('dot', 9),
			n('crack', 2), n('crack', 2), n('crack', 2),
			w('S'), w('S')
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext());
		expect(score.parts.some((p) => p.source === 'All Pungs' && p.value === 6)).toBe(true);
	});

	it('all chows scores 2 and gets the three-suit house bonus', () => {
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 2), n('crack', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 7), n('dot', 8), n('dot', 9),
			n('crack', 4), n('crack', 5), n('crack', 6),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext());
		const sources = score.parts.map((p) => p.source);
		expect(sources).toContain('All Chows');
		expect(sources).toContain('Three Suits (house rule)');
	});

	it('three-suit bonus respects the toggle', () => {
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 2), n('crack', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 7), n('dot', 8), n('dot', 9),
			n('crack', 4), n('crack', 5), n('crack', 6),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext({ includeThreeSuitBonus: false }));
		expect(score.parts.some((p) => p.source === 'Three Suits (house rule)')).toBe(false);
	});
});

describe('scoreDecomposition — honors', () => {
	it('one dragon pung adds 2', () => {
		const tiles: Tile[] = [
			d('red'), d('red'), d('red'),
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext());
		const dragonLine = score.parts.find((p) => p.source.startsWith('Dragon meld'));
		expect(dragonLine?.value).toBe(2);
	});

	it('two dragon pungs add the special 6 bonus, not 4', () => {
		const tiles: Tile[] = [
			d('red'), d('red'), d('red'),
			d('green'), d('green'), d('green'),
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext());
		const dragonLine = score.parts.find((p) => p.source.startsWith('Dragon meld'));
		expect(dragonLine?.value).toBe(6);
	});

	it('seat-wind pung where seat == round adds both bonuses (2 + 2)', () => {
		const tiles: Tile[] = [
			w('E'), w('E'), w('E'),
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext({ seatWind: 'E', roundWind: 'E' }));
		const seat = score.parts.find((p) => p.source.startsWith('Seat wind'));
		const round = score.parts.find((p) => p.source.startsWith('Round wind'));
		expect(seat?.value).toBe(2);
		expect(round?.value).toBe(2);
	});

	it('a non-seat non-round wind pung scores nothing extra', () => {
		const tiles: Tile[] = [
			w('S'), w('S'), w('S'),
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext({ seatWind: 'E', roundWind: 'E' }));
		expect(score.parts.find((p) => p.source.startsWith('Seat wind'))).toBeUndefined();
		expect(score.parts.find((p) => p.source.startsWith('Round wind'))).toBeUndefined();
	});
});

describe('scoreDecomposition — flowers and self-draw', () => {
	it('flowers add 1 each', () => {
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 2), n('crack', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 7), n('dot', 8), n('dot', 9),
			n('crack', 4), n('crack', 5), n('crack', 6),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext({ flowers: 3 }));
		const flowerLine = score.parts.find((p) => p.source.startsWith('Flowers'));
		expect(flowerLine?.value).toBe(3);
	});

	it('self-draw adds 1', () => {
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 2), n('crack', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 7), n('dot', 8), n('dot', 9),
			n('crack', 4), n('crack', 5), n('crack', 6),
			n('dot', 5), n('dot', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext({ selfDraw: true }));
		expect(score.parts.some((p) => p.source === 'Self-draw' && p.value === 1)).toBe(true);
	});
});

describe('scoreDecomposition — single-suit bonuses', () => {
	it('pure suit scores 6', () => {
		const tiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('bamboo', 2), n('bamboo', 3), n('bamboo', 4),
			n('bamboo', 5), n('bamboo', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext());
		expect(score.parts.some((p) => p.source.startsWith('Pure Suit'))).toBe(true);
	});

	it('half flush (one suit + honors) scores 3', () => {
		const tiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			d('red'), d('red'), d('red'),
			n('bamboo', 5), n('bamboo', 5)
		];
		const decomp = bestDecomposition(tiles);
		const score = scoreDecomposition(decomp, defaultContext());
		expect(score.parts.some((p) => p.source === 'Half Flush')).toBe(true);
		expect(score.parts.some((p) => p.source.startsWith('Pure Suit'))).toBe(false);
	});
});
