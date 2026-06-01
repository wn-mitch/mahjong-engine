import { describe, it, expect } from 'vitest';
import type { Tile } from '../src/lib/engine/tiles';
import { bestDecomposition, decompositionIsWinning } from '../src/lib/rulesets/chinese-traditional/decomposer';
import { ARCHETYPES, archetypeById } from '../src/lib/rulesets/chinese-traditional/archetypes';

const n = (suit: 'crack' | 'bamboo' | 'dot', rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const w = (wind: 'E' | 'S' | 'W' | 'N'): Tile => ({ kind: 'wind', wind });
const d = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });

const filterFor = (id: string) => archetypeById(id)!.filter;

describe('archetype filters', () => {
	it('All Pungs filter accepts only pung/kong sets', () => {
		const filter = filterFor('all-pungs');
		const pungsTiles: Tile[] = [
			n('crack', 1), n('crack', 1), n('crack', 1),
			n('bamboo', 5), n('bamboo', 5), n('bamboo', 5),
			n('dot', 9), n('dot', 9), n('dot', 9),
			d('red'), d('red'), d('red'),
			w('E'), w('E')
		];
		const pungsDecomp = bestDecomposition(pungsTiles, { filter });
		expect(decompositionIsWinning(pungsDecomp)).toBe(true);

		const chowsTiles: Tile[] = [
			n('crack', 1), n('crack', 2), n('crack', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 7), n('dot', 8), n('dot', 9),
			n('crack', 4), n('crack', 5), n('crack', 6),
			n('dot', 5), n('dot', 5)
		];
		const chowsDecomp = bestDecomposition(chowsTiles, { filter });
		expect(decompositionIsWinning(chowsDecomp)).toBe(false);
	});

	it('Pure Suit filter rejects honors', () => {
		const filter = filterFor('pure-suit');
		const pureTiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			n('bamboo', 2), n('bamboo', 3), n('bamboo', 4),
			n('bamboo', 5), n('bamboo', 5)
		];
		const pureDecomp = bestDecomposition(pureTiles, { filter });
		expect(decompositionIsWinning(pureDecomp)).toBe(true);

		const honorTiles: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			d('red'), d('red'), d('red'),
			n('bamboo', 5), n('bamboo', 5)
		];
		const honorDecomp = bestDecomposition(honorTiles, { filter });
		expect(decompositionIsWinning(honorDecomp)).toBe(false);
	});

	it('Half Flush filter allows honors but only one number suit', () => {
		const filter = filterFor('half-flush');
		const ok: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			d('red'), d('red'), d('red'),
			n('bamboo', 5), n('bamboo', 5)
		];
		const okDecomp = bestDecomposition(ok, { filter });
		expect(decompositionIsWinning(okDecomp)).toBe(true);

		const mixed: Tile[] = [
			n('bamboo', 1), n('bamboo', 2), n('bamboo', 3),
			n('crack', 4), n('crack', 5), n('crack', 6),
			n('bamboo', 7), n('bamboo', 8), n('bamboo', 9),
			d('red'), d('red'), d('red'),
			n('bamboo', 5), n('bamboo', 5)
		];
		const mixedDecomp = bestDecomposition(mixed, { filter });
		expect(decompositionIsWinning(mixedDecomp)).toBe(false);
	});

	it('All Chows pair must be a number tile', () => {
		const filter = filterFor('all-chows');
		const honorPair: Tile[] = [
			n('crack', 1), n('crack', 2), n('crack', 3),
			n('bamboo', 4), n('bamboo', 5), n('bamboo', 6),
			n('dot', 7), n('dot', 8), n('dot', 9),
			n('crack', 4), n('crack', 5), n('crack', 6),
			d('white'), d('white')
		];
		const decomp = bestDecomposition(honorPair, { filter });
		expect(decompositionIsWinning(decomp)).toBe(false);
	});
});

describe('archetype list', () => {
	it('exports the six expected archetypes', () => {
		expect(ARCHETYPES.map((a) => a.id)).toEqual([
			'common-hand',
			'all-pungs',
			'all-chows',
			'half-flush',
			'pure-suit',
			'three-suits'
		]);
	});

	it('shapeBonus values match the source point table', () => {
		expect(archetypeById('all-pungs')!.shapeBonus).toBe(6);
		expect(archetypeById('all-chows')!.shapeBonus).toBe(2);
		expect(archetypeById('common-hand')!.shapeBonus).toBe(0);
	});
});
