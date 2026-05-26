import { describe, it, expect } from 'vitest';
import { nmjl2026, chineseTraditional } from '../src/lib/rulesets';
import { emptyState } from '../src/lib/engine/gameState';
import type { Ruleset } from '../src/lib/engine/ruleset';
import { createPositionStore } from '../src/lib/state/positionStore.svelte';
import type { Tile } from '../src/lib/engine/tiles';

const rulesets: Ruleset[] = [nmjl2026, chineseTraditional];

describe('Ruleset interface conformance', () => {
	for (const r of rulesets) {
		describe(r.id, () => {
			it('has id, name, version', () => {
				expect(r.id).toBeTypeOf('string');
				expect(r.name).toBeTypeOf('string');
				expect(r.version).toBeTypeOf('string');
			});

			it('evaluateTargets returns an array', () => {
				const result = r.evaluateTargets(emptyState());
				expect(Array.isArray(result)).toBe(true);
			});

			it('isWinningHand returns a boolean', () => {
				const result = r.isWinningHand(emptyState());
				expect(typeof result).toBe('boolean');
			});

			it('suggestDiscard returns a TileSuggestion', () => {
				const result = r.suggestDiscard(emptyState());
				expect(result).toHaveProperty('discard');
				expect(result).toHaveProperty('rationale');
				expect(typeof result.rationale).toBe('string');
			});

			it('suggestCharlestonPass returns a CharlestonPassSuggestion', () => {
				const result = r.suggestCharlestonPass(emptyState(), 'right');
				expect(Array.isArray(result.tiles)).toBe(true);
				expect(typeof result.rationale).toBe('string');
			});
		});
	}
});

describe('PositionStore — charleston pass workflow', () => {
	function fillHand(store: ReturnType<typeof createPositionStore>) {
		const seed: Tile[] = [
			{ kind: 'number', suit: 'crack', rank: 1 },
			{ kind: 'number', suit: 'crack', rank: 2 },
			{ kind: 'number', suit: 'crack', rank: 3 },
			{ kind: 'number', suit: 'crack', rank: 4 },
			{ kind: 'number', suit: 'crack', rank: 5 },
			{ kind: 'number', suit: 'crack', rank: 6 },
			{ kind: 'number', suit: 'crack', rank: 7 },
			{ kind: 'number', suit: 'crack', rank: 8 },
			{ kind: 'number', suit: 'crack', rank: 9 },
			{ kind: 'number', suit: 'bamboo', rank: 1 },
			{ kind: 'number', suit: 'bamboo', rank: 2 },
			{ kind: 'number', suit: 'bamboo', rank: 3 },
			{ kind: 'number', suit: 'bamboo', rank: 4 }
		];
		store.setFocus({ kind: 'hand' });
		for (const t of seed) store.addTile(t);
	}

	it('commitCharlestonPass removes sent and adds received', () => {
		const store = createPositionStore();
		fillHand(store);
		const handBefore = store.state.self.hand.length;

		const sent: Tile[] = [
			{ kind: 'number', suit: 'bamboo', rank: 4 },
			{ kind: 'number', suit: 'bamboo', rank: 3 },
			{ kind: 'number', suit: 'bamboo', rank: 2 }
		];
		const received: Tile[] = [
			{ kind: 'dragon', dragon: 'red' },
			{ kind: 'dragon', dragon: 'red' },
			{ kind: 'wind', wind: 'E' }
		];
		const result = store.commitCharlestonPass('right', sent, received);
		expect(result.ok).toBe(true);
		expect(store.state.self.hand.length).toBe(handBefore);
		expect(store.state.charleston.passes).toHaveLength(1);
		expect(store.state.self.hand.some((t) => t.kind === 'dragon' && t.dragon === 'red')).toBe(true);
		expect(
			store.state.self.hand.some(
				(t) => t.kind === 'number' && t.suit === 'bamboo' && t.rank === 4
			)
		).toBe(false);
	});

	it('rejects sending tiles not in hand', () => {
		const store = createPositionStore();
		fillHand(store);
		const result = store.commitCharlestonPass(
			'right',
			[{ kind: 'dragon', dragon: 'green' }, { kind: 'joker' }, { kind: 'flower' }],
			[
				{ kind: 'number', suit: 'dot', rank: 1 },
				{ kind: 'number', suit: 'dot', rank: 2 },
				{ kind: 'number', suit: 'dot', rank: 3 }
			]
		);
		expect(result.ok).toBe(false);
	});

	it('undoCharlestonPass is a true inverse', () => {
		const store = createPositionStore();
		fillHand(store);
		const beforeHand = JSON.parse(JSON.stringify(store.state.self.hand));
		store.commitCharlestonPass(
			'right',
			[
				{ kind: 'number', suit: 'bamboo', rank: 4 },
				{ kind: 'number', suit: 'bamboo', rank: 3 },
				{ kind: 'number', suit: 'bamboo', rank: 2 }
			],
			[
				{ kind: 'dragon', dragon: 'red' },
				{ kind: 'dragon', dragon: 'red' },
				{ kind: 'wind', wind: 'E' }
			]
		);
		store.undoCharlestonPass();
		expect(store.state.charleston.passes).toHaveLength(0);
		// Multiset-equal regardless of order
		const sortKey = (t: Tile) => JSON.stringify(t);
		expect(store.state.self.hand.map(sortKey).sort()).toEqual(
			(beforeHand as Tile[]).map(sortKey).sort()
		);
	});

	it('suggestCharlestonPass uses effectiveState — queued tiles are excluded', () => {
		// The displayed ranking already reads `effectiveState` (hand minus queued); the
		// suggester now does too, so the ranking shown above and the pass below can't
		// disagree. Concretely: a queued tile is not in `effectiveState`, so the suggester
		// can't possibly suggest it back to the user.
		const store = createPositionStore();
		fillHand(store);
		const idx = store.state.self.hand.findIndex(
			(t) => t.kind === 'number' && t.suit === 'bamboo' && t.rank === 4
		);
		expect(idx).toBeGreaterThanOrEqual(0);
		store.toggleQueueHandTile(idx);
		expect(store.charlestonSent).toHaveLength(1);
		const suggestion = store.suggestCharlestonPass('right');
		const suggestsQueued = suggestion.tiles.some(
			(t) => t.kind === 'number' && t.suit === 'bamboo' && t.rank === 4
		);
		expect(suggestsQueued).toBe(false);
	});

	it('courtesy pass accepts 0 tiles', () => {
		const store = createPositionStore();
		fillHand(store);
		// Walk through right, across, left first
		const passSets = ['right', 'across', 'left'] as const;
		for (const dir of passSets) {
			const handTiles = store.state.self.hand.slice(0, 3);
			const incoming: Tile[] = [
				{ kind: 'flower' },
				{ kind: 'flower' },
				{ kind: 'flower' }
			];
			const r = store.commitCharlestonPass(dir, handTiles, incoming);
			expect(r.ok, dir).toBe(true);
		}
		const r = store.commitCharlestonPass('courtesy', [], []);
		expect(r.ok).toBe(true);
		expect(store.state.charleston.passes).toHaveLength(4);
	});
});
