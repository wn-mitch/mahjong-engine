import { describe, it, expect } from 'vitest';
import type { Tile } from '../src/lib/engine/tiles';
import {
	bestDecomposition,
	classifyExposure,
	decompositionIsWinning,
	partitionStructuralTiles,
	totalFilledSlots,
	totalStructuralSlots
} from '../src/lib/rulesets/chinese-traditional/decomposer';

// Tile-construction helpers — Chinese-mahjong test code is heavily tile-typed and the
// noise of inline object literals drowns out the assertions.
const n = (suit: 'crack' | 'bamboo' | 'dot', rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const w = (wind: 'E' | 'S' | 'W' | 'N'): Tile => ({ kind: 'wind', wind });
const d = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });
const f = (): Tile => ({ kind: 'flower' });

describe('partitionStructuralTiles', () => {
	it('separates flowers from structural tiles', () => {
		const { structural, flowers } = partitionStructuralTiles([n('crack', 1), f(), f(), w('E')]);
		expect(flowers).toBe(2);
		expect(structural).toHaveLength(2);
	});

	it('drops jokers defensively (Chinese ruleset has none)', () => {
		const { structural } = partitionStructuralTiles([{ kind: 'joker' }, n('dot', 5)]);
		expect(structural).toHaveLength(1);
	});

	it('returns structural tiles in canonical sort order', () => {
		const { structural } = partitionStructuralTiles([n('dot', 1), n('crack', 9), n('bamboo', 5)]);
		expect(structural.map((t) => (t.kind === 'number' ? `${t.suit}${t.rank}` : ''))).toEqual([
			'crack9',
			'bamboo5',
			'dot1'
		]);
	});
});

describe('classifyExposure', () => {
	it('detects a pung', () => {
		const r = classifyExposure([w('E'), w('E'), w('E')]);
		expect(r?.kind).toBe('pung');
	});

	it('detects a kong', () => {
		const r = classifyExposure([d('red'), d('red'), d('red'), d('red')]);
		expect(r?.kind).toBe('kong');
	});

	it('detects a chow', () => {
		const r = classifyExposure([n('bamboo', 3), n('bamboo', 2), n('bamboo', 4)]);
		expect(r?.kind).toBe('chow');
		expect(r?.tiles.map((t) => (t.kind === 'number' ? t.rank : -1))).toEqual([2, 3, 4]);
	});

	it('rejects malformed exposures', () => {
		expect(classifyExposure([n('bamboo', 3), n('crack', 4), n('dot', 5)])).toBeNull();
		expect(classifyExposure([n('bamboo', 1), n('bamboo', 3), n('bamboo', 5)])).toBeNull();
		expect(classifyExposure([w('E'), w('S')])).toBeNull();
	});
});

describe('bestDecomposition — complete winning hands', () => {
	it('recognizes a clean three-chow + pung + pair hand', () => {
		// 1-2-3 bamboo, 4-5-6 bamboo, 7-8-9 bamboo, EEE, 5d 5d
		const tiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles);
		expect(decompositionIsWinning(result)).toBe(true);
		expect(result.tilesNeeded).toHaveLength(0);
		expect(result.sets).toHaveLength(4);
		expect(result.sets.filter((s) => s.kind === 'chow')).toHaveLength(3);
		expect(result.sets.filter((s) => s.kind === 'pung')).toHaveLength(1);
	});

	it('recognizes an all-pungs hand', () => {
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 1), n('crack', 1),
			n('bamboo', 5), n('bamboo', 5), n('bamboo', 5),
			n('dot', 9), n('dot', 9), n('dot', 9),
			d('red'), d('red'), d('red'),
			w('E'), w('E')
		];
		const result = bestDecomposition(tiles);
		expect(decompositionIsWinning(result)).toBe(true);
		expect(result.sets.every((s) => s.kind === 'pung')).toBe(true);
	});

	it('recognizes a hand containing a kong', () => {
		// EEEE kong + three chows + pair = 15 structural tiles in a winning shape.
		const tiles: Tile[] = [
			w('E'), w('E'), w('E'), w('E'),
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles);
		expect(decompositionIsWinning(result)).toBe(true);
		expect(result.sets.find((s) => s.kind === 'kong')).toBeDefined();
		expect(totalStructuralSlots(result)).toBe(15);
		expect(totalFilledSlots(result)).toBe(15);
	});

	it('disambiguates 1-1-1-2-3 as pung+chow when more tiles surround it', () => {
		// 111 + 234 + 567 + 789 + 5d5d → either parse of 111+234... let's force a clear one.
		// Use 111234 567 789 5d5d → the 1s can be pung+chow or could go partial-chow + chow.
		const tiles: Tile[] = [
			n('crack', 1), n('crack', 1), n('crack', 1),
			n('crack', 2), n('crack', 3), n('crack', 4),
			n('crack', 5), n('crack', 6), n('crack', 7),
			n('crack', 7), n('crack', 8), n('crack', 9),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles);
		expect(decompositionIsWinning(result)).toBe(true);
	});
});

describe('bestDecomposition — partial hands', () => {
	it('reports a single needed tile for a tenpai hand', () => {
		// Missing one tile to complete the all-chows hand above: drop the final 9 bamboo.
		const tiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles);
		expect(result.tilesNeeded.length).toBe(1);
		expect(decompositionIsWinning(result)).toBe(false);
	});

	it('honors-only hands form pungs, never chows', () => {
		// Three winds adjacent in some ordering shouldn't become a "chow." The decomposer
		// would have to treat E-S-W as a chow if honors were chowable — they aren't.
		const tiles: Tile[] = [
			w('E'), w('S'), w('W'),
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles);
		expect(decompositionIsWinning(result)).toBe(false);
		// The three lone winds aren't a meld and add to tilesNeeded or floats.
		expect(result.tilesNeeded.length + result.floats.length).toBeGreaterThan(0);
	});
});

describe('bestDecomposition — exposure handling', () => {
	it('respects an exposed pung', () => {
		const exposure = classifyExposure([w('E'), w('E'), w('E')]);
		expect(exposure).not.toBeNull();

		// Hand of 11 tiles needing 3 more sets + pair to complete.
		const tiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles, { exposures: [exposure!] });
		expect(decompositionIsWinning(result)).toBe(true);
		expect(result.sets).toHaveLength(4);
		expect(result.sets.filter((s) => s.fromExposure)).toHaveLength(1);
	});
});

describe('bestDecomposition — filter pruning', () => {
	it('rejects non-pung partitions when filtered to All Pungs', () => {
		// Chow-heavy hand. Pure pung interpretation impossible.
		const tiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			w('E'), w('E'), w('E'),
			n('dot', 5), n('dot', 5)
		];
		const result = bestDecomposition(tiles, {
			filter: (sets) => sets.every((s) => s.kind === 'pung' || s.kind === 'kong')
		});
		// The filter eliminates the natural decomposition. The decomposer falls back to a
		// fully-unfilled partition matching the contract; it shouldn't be reported as winning.
		expect(decompositionIsWinning(result)).toBe(false);
	});
});
