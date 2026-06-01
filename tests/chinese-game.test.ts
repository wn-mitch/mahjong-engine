import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGameStore } from '../src/lib/state/gameStore.svelte';
import { chineseTraditional } from '../src/lib/rulesets/chinese-traditional';
import { createMatch, draw, applyDiscard, resolveClaimWindow } from '../src/lib/engine/game';
import type { Match, SeatId } from '../src/lib/engine/game';
import type { Tile } from '../src/lib/engine/tiles';

const n = (suit: 'crack' | 'bamboo' | 'dot', rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});

afterEach(() => {
	vi.useRealTimers();
});

describe('Chinese live game — gameStore wiring', () => {
	it('starts in play with no charleston when the ruleset has an empty plan', () => {
		const store = createGameStore({
			rulesetId: 'chinese-traditional',
			seed: 42,
			houseRules: { allowConcealed: false }
		});
		expect(store.phase).toBe('play');
		expect(store.interaction.kind).toBe('human-turn');
		expect(store.turn).toBe(0);
		expect(store.humanView.self.hand).toHaveLength(14); // dealer opens
	});

	it('a fresh deal preserves the 144-non-joker / 152-total tile pool', () => {
		const store = createGameStore({
			rulesetId: 'chinese-traditional',
			seed: 7,
			houseRules: { allowConcealed: false }
		});
		const controlled = store.seats.reduce(
			(s, p) => s + p.hand.length + p.exposures.reduce((m, e) => m + e.tiles.length, 0),
			0
		);
		// Total tile pool (including unused jokers and flowers in the wall) is 152.
		expect(controlled + store.discards.length + store.wallRemaining).toBe(152);
	});

	it('newGame can swap to NMJL and re-engage the charleston flow', () => {
		const store = createGameStore({
			rulesetId: 'chinese-traditional',
			seed: 42,
			houseRules: { allowConcealed: false }
		});
		expect(store.phase).toBe('play');
		store.newGame({ rulesetId: 'nmjl-2026', seed: 99 });
		expect(store.rulesetId).toBe('nmjl-2026');
		expect(store.phase).toBe('charleston');
		expect(store.interaction.kind).toBe('charleston-pass');
	});

	it('reports the active ruleset name reactively', () => {
		const store = createGameStore({
			rulesetId: 'nmjl-2026',
			houseRules: { allowConcealed: true }
		});
		expect(store.rulesetName).toBe('American NMJL 2026');
		store.newGame({ rulesetId: 'chinese-traditional' });
		expect(store.rulesetName).toBe('Chinese (modern HK-style)');
	});
});

describe('Chinese chow claims — runner-level', () => {
	function withHand(seat: SeatId, hand: Tile[], base?: Match): Match {
		const m = base ?? createMatch({ rulesetId: 'chinese-traditional', seed: 1 });
		const seats = [...m.seats] as Match['seats'];
		seats[seat] = { hand, exposures: [] };
		return { ...m, seats, phase: 'play' };
	}

	it('upstream discard can be chowed; non-upstream discard cannot', () => {
		// Seat 0's upstream is seat 3 (per turn-order: play goes 0→1→2→3→0...).
		// Hand has 3-bamboo and 4-bamboo; seat 3 discards 5-bamboo → chow legal for seat 0.
		const handForChow = [n('bamboo', 3), n('bamboo', 4), n('crack', 1)];
		let m = withHand(0, handForChow);
		// Seat 3 holds the 5-bamboo and discards it.
		m = withHand(3, [n('bamboo', 5)], m);
		m = { ...m, turn: 3 };
		m = applyDiscard(m, 3, n('bamboo', 5));

		const after = resolveClaimWindow(m, chineseTraditional, [
			{ seat: 0, kind: 'chow', support: [n('bamboo', 3), n('bamboo', 4)] }
		]);

		expect(after.turn).toBe(0);
		expect(after.seats[0].exposures).toHaveLength(1);
		expect(after.seats[0].exposures[0].kind).toBe('chow');
		expect(after.seats[0].exposures[0].tiles).toHaveLength(3);
	});

	it('a chow claim from a non-upstream seat is rejected', () => {
		// Seat 0's upstream is seat 3. A discard from seat 1 (downstream) cannot be chowed by
		// seat 0: from seat 0's view, seat 1 is 'right', not 'left'.
		const handForChow = [n('bamboo', 3), n('bamboo', 4), n('crack', 1)];
		let m = withHand(0, handForChow);
		m = withHand(1, [n('bamboo', 5), n('crack', 1)], m);
		m = { ...m, turn: 1 };
		m = applyDiscard(m, 1, n('bamboo', 5));

		const after = resolveClaimWindow(m, chineseTraditional, [
			{ seat: 0, kind: 'chow', support: [n('bamboo', 3), n('bamboo', 4)] }
		]);

		// Pass-through: turn advances normally to seat 2; no exposure formed for seat 0.
		expect(after.turn).toBe(2);
		expect(after.seats[0].exposures).toHaveLength(0);
	});

	it('pung outranks chow when both seats want the same discard', () => {
		// Seat 0 (upstream of seat 1) can chow; seat 2 holds a pung pair for the same tile.
		// Seat 3 discards, seat 2 claims pung, seat 0 attempts chow → pung wins.
		let m = createMatch({ rulesetId: 'chinese-traditional', seed: 5 });
		m = withHand(0, [n('bamboo', 3), n('bamboo', 4), n('crack', 1)], m);
		m = withHand(2, [n('bamboo', 5), n('bamboo', 5), n('crack', 2)], m);
		m = withHand(3, [n('bamboo', 5), n('dot', 1)], m);
		m = { ...m, turn: 3, phase: 'play' };
		m = applyDiscard(m, 3, n('bamboo', 5));

		const after = resolveClaimWindow(m, chineseTraditional, [
			{ seat: 0, kind: 'chow', support: [n('bamboo', 3), n('bamboo', 4)] },
			{ seat: 2, kind: 'pung' }
		]);

		expect(after.turn).toBe(2);
		expect(after.seats[2].exposures[0]?.kind).toBe('pung');
		expect(after.seats[0].exposures).toHaveLength(0);
	});
});
