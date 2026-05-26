import { describe, it, expect } from 'vitest';
import { nmjl2026 } from '../src/lib/rulesets/nmjl-2026';
import { HANDS, GROUP_SIZE } from '../src/lib/rulesets/nmjl-2026/hands';
import type { GameState } from '../src/lib/engine/gameState';
import type { Tile, Suit } from '../src/lib/engine/tiles';
import { tileEquals } from '../src/lib/engine/tiles';

const N = (suit: Suit, rank: number): Tile => ({
	kind: 'number',
	suit,
	rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
});
const J = (): Tile => ({ kind: 'joker' });
const F = (): Tile => ({ kind: 'flower' });

function repeat<T>(t: T, n: number): T[] {
	return Array.from({ length: n }, () => t);
}

function state(hand: Tile[]): GameState {
	return {
		phase: 'play',
		self: { hand, exposures: [] },
		opponents: { left: [], across: [], right: [] },
		discards: [],
		charleston: { passes: [] }
	};
}

describe('NMJL hand data integrity', () => {
	it('has the expected per-section counts', () => {
		const counts = new Map<string, number>();
		for (const h of HANDS) counts.set(h.section, (counts.get(h.section) ?? 0) + 1);
		expect(counts.get('2026')).toBe(4);
		expect(counts.get('2468')).toBe(8);
		expect(counts.get('like-numbers')).toBe(3);
		expect(counts.get('quints')).toBe(3);
		expect(counts.get('consecutive-run')).toBe(8);
		expect(counts.get('13579')).toBe(9);
		expect(counts.get('winds-dragons')).toBe(8);
		expect(counts.get('369')).toBe(6);
	});

	it('marks all C hands concealed and total matches the doc', () => {
		const concealed = HANDS.filter((h) => h.concealed);
		expect(concealed.length).toBe(6); // 2468-8, consec-8, 13579-8, 13579-9, wd-8, 369-6
		expect(concealed.map((h) => h.id).sort()).toEqual(
			['13579-8', '13579-9', '2468-8', '369-6', 'consec-8', 'wd-8'].sort()
		);
	});

	it('every hand totals 14 tiles', () => {
		for (const h of HANDS) {
			const total = h.groups.reduce((s, g) => s + GROUP_SIZE[g.kind], 0);
			expect(total, `${h.id} ${h.pattern}`).toBe(14);
		}
	});

	it('every joker-friendly hand has all groups of size ≥3', () => {
		for (const h of HANDS) {
			if (!h.jokerFriendly) continue;
			for (const g of h.groups) {
				expect(GROUP_SIZE[g.kind], `${h.id} ${g.kind}`).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it('flags the 13 fully joker-friendly hands from the strategy doc', () => {
		const friendly = HANDS.filter((h) => h.jokerFriendly).map((h) => h.id).sort();
		expect(friendly).toEqual(
			[
				'2026-1',
				'2468-1',
				'2468-4',
				'like-1',
				'quints-1',
				'quints-3',
				'consec-4',
				'consec-6',
				'13579-2',
				'wd-1',
				'wd-3',
				'wd-4',
				'wd-5',
				'369-1'
			].sort()
		);
	});

	it('all hands have unique ids', () => {
		const ids = HANDS.map((h) => h.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('NMJL matcher — 2468 #1 (222 444 6666 8888)', () => {
	// One-suit version: all in crack.
	const winning = (suit: Suit): Tile[] => [
		...repeat(N(suit, 2), 3),
		...repeat(N(suit, 4), 3),
		...repeat(N(suit, 6), 4),
		...repeat(N(suit, 8), 4)
	];

	it('detects an exact win in one suit', () => {
		const s = state(winning('crack'));
		expect(nmjl2026.isWinningHand(s)).toBe(true);
		const targets = nmjl2026.evaluateTargets(s);
		const top = targets[0];
		expect(top.target.id).toBe('2468-1');
		expect(top.completionScore).toBe(1);
		expect(top.tilesNeeded.length).toBe(0);
	});

	it('detects an exact win in a different suit (suit-permutation)', () => {
		const s = state(winning('bamboo'));
		expect(nmjl2026.isWinningHand(s)).toBe(true);
	});

	it('reports score 13/14 with one tile removed', () => {
		const hand = winning('crack');
		hand.pop(); // remove a 4 (actually pops an 8)
		const s = state(hand);
		expect(nmjl2026.isWinningHand(s)).toBe(false);
		const top = nmjl2026.evaluateTargets(s)[0];
		expect(top.target.id).toBe('2468-1');
		expect(top.completionScore).toBeCloseTo(13 / 14, 5);
		expect(top.tilesNeeded.length).toBe(1);
	});

	it('accepts joker substitution in kong slots (size ≥3)', () => {
		const hand = winning('crack');
		// Replace two 6s with jokers
		const sixIdx = hand.findIndex((t) => t.kind === 'number' && t.rank === 6);
		hand[sixIdx] = J();
		const sixIdx2 = hand.findIndex((t) => t.kind === 'number' && t.rank === 6);
		hand[sixIdx2] = J();
		const s = state(hand);
		expect(nmjl2026.isWinningHand(s)).toBe(true);
	});
});

describe('NMJL patternSlots', () => {
	it('returns 14 slots for every evaluated hand', () => {
		const hand = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			...repeat(N('crack', 6), 4),
			N('crack', 8),
			N('crack', 8),
			N('crack', 8)
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		for (const e of evals) {
			if (e.completionScore > 0) {
				expect(e.patternSlots.length, e.target.id).toBe(14);
			}
		}
	});

	it('marks 13 filled and 1 needed for a one-tile-short 2468 hand', () => {
		const hand = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			...repeat(N('crack', 6), 4),
			...repeat(N('crack', 8), 3)
		];
		const s = state(hand);
		const top = nmjl2026.evaluateTargets(s)[0];
		expect(top.target.id).toBe('2468-1');
		const filled = top.patternSlots.filter((p) => p.status === 'filled').length;
		const jokerFilled = top.patternSlots.filter((p) => p.status === 'joker-filled').length;
		const needed = top.patternSlots.filter((p) => p.status === 'needed').length;
		expect(filled).toBe(13);
		expect(jokerFilled).toBe(0);
		expect(needed).toBe(1);
	});

	it('marks joker substitutions as joker-filled', () => {
		const hand = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			N('crack', 6),
			N('crack', 6),
			J(),
			J(),
			...repeat(N('crack', 8), 4)
		];
		const s = state(hand);
		const top = nmjl2026.evaluateTargets(s)[0];
		expect(top.target.id).toBe('2468-1');
		expect(top.completionScore).toBe(1);
		const jokerFilled = top.patternSlots.filter((p) => p.status === 'joker-filled').length;
		expect(jokerFilled).toBe(2);
		const needed = top.patternSlots.filter((p) => p.status === 'needed').length;
		expect(needed).toBe(0);
	});
});

describe('NMJL matcher — joker rules', () => {
	it('rejects jokers in single slots (2468-6 has 4 singles)', () => {
		// 2468 #6: `2468 2222 D 2222 D` — 4 singles + 2 kongs + 2 single-dragon slots.
		// Try to win using jokers for the 4 singles: should NOT count.
		// We build a "near win" that's all jokers + the two kongs + dragons.
		const hand: Tile[] = [
			...repeat(J(), 4), // try to fill 2,4,6,8 singles with jokers
			...repeat(N('bamboo', 2), 4),
			{ kind: 'dragon', dragon: 'green' },
			...repeat(N('dot', 2), 4),
			{ kind: 'dragon', dragon: 'white' }
		];
		expect(hand.length).toBe(14);
		const s = state(hand);
		// Should not win — jokers don't fit single slots.
		expect(nmjl2026.isWinningHand(s)).toBe(false);
	});
});

describe('NMJL matcher — constraint enforcement', () => {
	it('rejects 3-suit play of 2468-1 ("1 or 2 Suits")', () => {
		// Force tiles across 3 suits — should reduce the score for 2468-1.
		const hand: Tile[] = [
			...repeat(N('crack', 2), 3),
			...repeat(N('bamboo', 4), 3),
			...repeat(N('dot', 6), 4),
			...repeat(N('dot', 8), 4)
		];
		const s = state(hand);
		// 2468-1 is "1 or 2 Suits" — this attempt uses 3 distinct suits, so 2468-1 should
		// not match perfectly under that constraint.
		const all = nmjl2026.evaluateTargets(s);
		const found2468 = all.find((r) => r.target.id === '2468-1');
		expect(found2468).toBeDefined();
		expect(found2468!.completionScore).toBeLessThan(1);
	});

	// "1 or 3 Suits" is an exclusive set {1, 3} — 2 distinct suits must be rejected.
	// Previously encoded as a min/max range, which silently accepted 2 distinct suits and let
	// a 2-suit-dominant hand score artificially high on consec-7 / 13579-1.
	it('rejects a 2-suit binding for consec-7 ("1 or 3 Suits")', () => {
		// Bamboos + cracks foundation with no dots — the only way to win consec-7 here is the
		// 1-suit cracks branch (slow). A 2-suit binding A=bamboo, B=C=crack would slot 12/14
		// without the fix; under [1,3] it should be illegal entirely.
		const hand: Tile[] = [
			N('bamboo', 2),
			N('bamboo', 2),
			...repeat(N('crack', 3), 2),
			...repeat(N('crack', 4), 2),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 1),
			N('dot', 6),
			F(),
			F(),
			J()
		];
		const s = state(hand);
		const found = nmjl2026.evaluateTargets(s).find((e) => e.target.id === 'consec-7');
		expect(found).toBeDefined();
		// 1-suit cracks branch maxes out around 7/14; the (illegal) 2-suit binding scored 9/14.
		// Confirm we're below the 2-suit ceiling.
		expect(found!.completionScore).toBeLessThan(9 / 14);
	});

	it('accepts a 1-suit binding for consec-7 ("1 or 3 Suits")', () => {
		// Pure-crack consecutive 2-3-4 (X=2): pattern is FF 2222 3333 4444 — 6/12 nums plus FF.
		const hand: Tile[] = [
			F(),
			F(),
			N('crack', 2),
			N('crack', 2),
			N('crack', 3),
			N('crack', 3),
			N('crack', 4),
			N('crack', 4),
			N('crack', 5),
			N('crack', 9),
			N('crack', 7),
			N('bamboo', 1),
			N('dot', 9)
		];
		const s = state(hand);
		const found = nmjl2026.evaluateTargets(s).find((e) => e.target.id === 'consec-7');
		expect(found).toBeDefined();
		// 2F + 2×2c + 2×3c + 2×4c = 8 naturals → 6 missing in joker-eligible kongs.
		// Without the fix this should be reachable; with the fix the 1-suit binding still works.
		expect(found!.completionScore).toBeGreaterThanOrEqual(8 / 14);
	});

	it('accepts a 3-suit binding for consec-7 ("1 or 3 Suits")', () => {
		// One natural anchor in each of three suits — the genuine 3-suit branch.
		const hand: Tile[] = [
			F(),
			F(),
			N('crack', 1),
			N('crack', 1),
			N('bamboo', 2),
			N('bamboo', 2),
			N('dot', 3),
			N('dot', 3),
			N('crack', 7),
			N('crack', 9),
			N('bamboo', 8),
			N('dot', 5),
			N('dot', 7)
		];
		const s = state(hand);
		const found = nmjl2026.evaluateTargets(s).find((e) => e.target.id === 'consec-7');
		expect(found).toBeDefined();
		// 2F + 2×1c + 2×2b + 2×3d = 8 filled across the 3-suit X=1 binding.
		expect(found!.completionScore).toBeGreaterThanOrEqual(8 / 14);
	});
});

describe('NMJL matcher — joker zero-foundation guard', () => {
	// Jokers can substitute in pung/kong/quint/sextet, never in pairs or singles. But within
	// the joker-eligible groups, a group with zero natural tiles isn't really "started" — we
	// don't let a hand with no dots masquerade as nearly-complete on a 4-dot kong via jokers.

	it('does not let jokers complete a kong over an empty foundation', () => {
		// 4×3c + 4×4c + 2J + 2F + filler. The best consec-7 bindings (1-suit X=2 needs a
		// 2c kong, X=3 needs a 5c kong) both have one kong with zero crack foundation.
		// Without the guard, 2 jokers would fill 2 of the 4 empty slots → 12/14 ≈ 0.857.
		// With the guard, those jokers cannot land in an empty foundation → 10/14 ≈ 0.714.
		const hand: Tile[] = [
			...repeat(N('crack', 3), 4),
			...repeat(N('crack', 4), 4),
			N('bamboo', 1),
			J(),
			J(),
			F(),
			F()
		];
		const s = state(hand);
		const found = nmjl2026.evaluateTargets(s).find((e) => e.target.id === 'consec-7');
		expect(found).toBeDefined();
		expect(found!.completionScore).toBeLessThanOrEqual(10 / 14 + 1e-6);
	});

	it('still credits jokers when a kong has at least one natural anchor', () => {
		// Same shape, but the anchored variant adds a single 2c — that gives the X=2 binding
		// a foundation in every kong (2c=1, 3c=4, 4c=4), so jokers can extend the 2c kong
		// normally. The anchored hand must score strictly better than the un-anchored one.
		const empty: Tile[] = [
			...repeat(N('crack', 3), 4),
			...repeat(N('crack', 4), 4),
			N('bamboo', 1),
			J(),
			J(),
			F(),
			F()
		];
		const anchored: Tile[] = [
			...repeat(N('crack', 3), 4),
			...repeat(N('crack', 4), 4),
			N('crack', 2),
			J(),
			J(),
			F(),
			F()
		];
		const emptyScore = nmjl2026
			.evaluateTargets(state(empty))
			.find((e) => e.target.id === 'consec-7')!.completionScore;
		const anchoredScore = nmjl2026
			.evaluateTargets(state(anchored))
			.find((e) => e.target.id === 'consec-7')!.completionScore;
		expect(anchoredScore).toBeGreaterThan(emptyScore);
		expect(anchoredScore).toBeGreaterThanOrEqual(13 / 14 - 1e-6);
	});
});

describe('NMJL suggestDiscard', () => {
	it('returns a tile not in the top target needs', () => {
		// Hand 1 tile from winning 2468-1, plus a stray flower. Every crack-even is a filled
		// slot in the leader; the flower fills only weak flower-using hands. The principled
		// discard is the flower — keeping it would either block drawing the missing 8C or
		// pivot away from a 13/14-complete hand for a marginal optionality bet.
		const hand = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			...repeat(N('crack', 6), 4),
			...repeat(N('crack', 8), 3),
			F()
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		expect(evals[0].target.id).toBe('2468-1');
		const suggestion = nmjl2026.suggestDiscard(s);
		expect(suggestion.discard).not.toBeNull();
		// Invariant: never discard a tile the top target still needs.
		const needed = evals[0].tilesNeeded;
		expect(needed.some((n) => tileEquals(n, suggestion.discard!))).toBe(false);
		// The flower is the correct shed here — it doesn't fit the committed leader.
		expect(suggestion.discard!.kind).toBe('flower');
	});

	it('keeps jokers when other low-utility tiles exist', () => {
		// Hand with a stray 3-bamboo (low utility) and a joker — discard should not be the joker.
		const hand: Tile[] = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			...repeat(N('crack', 6), 4),
			N('crack', 8),
			N('crack', 8),
			N('bamboo', 3),
			J()
		];
		const s = state(hand);
		const suggestion = nmjl2026.suggestDiscard(s);
		expect(suggestion.discard).not.toBeNull();
		expect(suggestion.discard!.kind).not.toBe('joker');
	});
});

describe('NMJL Charleston suggestion', () => {
	const D = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });
	const W = (wind: 'N' | 'E' | 'W' | 'S'): Tile => ({ kind: 'wind', wind });

	it('returns 3 tiles on a normal evens-leaning hand for right/across/left', () => {
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('dot', 6),
			N('dot', 8),
			N('bamboo', 5),
			N('dot', 7),
			W('N'),
			W('E'),
			N('crack', 9)
		];
		const s = state(hand);
		for (const dir of ['right', 'across', 'left'] as const) {
			const r = nmjl2026.suggestCharlestonPass(s, dir);
			expect(r.tiles, dir).toHaveLength(3);
			expect(typeof r.rationale).toBe('string');
		}
	});

	it('never passes jokers, flowers, or pairs', () => {
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 2),
			N('crack', 4),
			N('crack', 4),
			N('crack', 6),
			N('crack', 6), // pair of 6C
			J(),
			J(),
			F(),
			F(),
			D('white'),
			W('N'),
			W('E'),
			W('W')
		];
		const s = state(hand);
		for (const dir of ['right', 'across', 'left'] as const) {
			const r = nmjl2026.suggestCharlestonPass(s, dir);
			for (const t of r.tiles) {
				expect(t.kind, `${dir} should not pass joker`).not.toBe('joker');
				expect(t.kind, `${dir} should not pass flower`).not.toBe('flower');
				expect(tileEquals(t, N('crack', 6)), `${dir} should not break a pair`).toBe(false);
			}
		}
	});

	it('protects white dragons when a zero-using hand sits in top retained candidates', () => {
		// 2026-1 / 2026-4 use white as the "0". With a hand that scores 2026 hands
		// into the top retained set, the white dragon should be kept over a lower-
		// utility tile that doesn't contribute to any retained candidate.
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 2),
			N('crack', 2),
			N('bamboo', 2),
			N('bamboo', 2),
			N('crack', 6),
			N('crack', 6),
			N('crack', 6),
			N('crack', 6),
			D('white'),
			D('white'),
			N('dot', 5), // junk
			N('dot', 7), // junk
			N('bamboo', 9) // junk
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		// 2026 should be among the top retained
		expect(evals.slice(0, 8).some((e) => e.target.id.startsWith('2026'))).toBe(true);
		const r = nmjl2026.suggestCharlestonPass(s, 'right');
		for (const t of r.tiles) {
			if (t.kind === 'dragon') {
				expect(t.dragon).not.toBe('white');
			}
		}
	});

	it("never passes a tile in the top candidate's top-6 needed list", () => {
		// 2468-1 partial in crack: 2C×3, 4C×3, 6C×2, plus distractors.
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 2),
			N('crack', 2),
			N('crack', 4),
			N('crack', 4),
			N('crack', 4),
			N('crack', 6),
			N('crack', 6),
			N('bamboo', 5),
			N('bamboo', 5),
			N('dot', 7),
			N('bamboo', 8),
			N('dot', 9)
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		expect(evals[0].target.id).toBe('2468-1');
		const protectedNeeds = evals[0].tilesNeeded.slice(0, 6);
		expect(protectedNeeds.length).toBeGreaterThan(0);
		const r = nmjl2026.suggestCharlestonPass(s, 'right');
		for (const t of r.tiles) {
			expect(protectedNeeds.some((n) => tileEquals(n, t))).toBe(false);
		}
	});

	it('passes tiles that contribute to none of the top retained candidates', () => {
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('bamboo', 6),
			N('dot', 6),
			N('dot', 8),
			N('bamboo', 7), // isolated odd
			N('dot', 3), // isolated odd
			N('crack', 9), // isolated odd
			N('dot', 5) // isolated odd
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		const retained = evals.slice(0, 8);
		const r = nmjl2026.suggestCharlestonPass(s, 'right');
		// At least one of the isolated odds (bamboo 7, dot 5) — neither uses any
		// retained candidate's slot — should be in the pass.
		const isolatedOdds = [N('bamboo', 7), N('dot', 5)];
		expect(r.tiles.some((t) => isolatedOdds.some((o) => tileEquals(t, o)))).toBe(true);
		// Every passed tile should fit zero retained candidates strictly worse
		// than the average kept tile — i.e., picking them is justified.
		for (const t of r.tiles) {
			const passedContribution = retained.filter((e) =>
				e.patternSlots.some((slot) => tileEquals(slot.tile, t))
			).length;
			// At least one tile passed has zero retained-candidate fit
			if (passedContribution === 0) return;
		}
		expect.fail('expected at least one passed tile to contribute to zero retained candidates');
	});

	it('keeps an even tile when consecutive-run hands retain it as a slot', () => {
		// Hand is odds-heavy but contains a 4-crack — a tile that fits consecutive
		// runs C1–C5. Because consec hands appear in retained, 4C is kept; only
		// truly unused tiles (e.g., bamboo 7, dot 8) get passed.
		const hand: Tile[] = [
			N('crack', 1),
			N('crack', 3),
			N('crack', 5),
			N('crack', 7),
			N('crack', 9),
			N('bamboo', 1),
			N('bamboo', 3),
			N('bamboo', 5),
			N('bamboo', 7),
			N('dot', 1),
			N('dot', 3),
			N('dot', 5),
			N('crack', 4),
			N('dot', 8)
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		const retainedHasConsec = evals
			.slice(0, 8)
			.some((e) => e.target.id.startsWith('consec'));
		expect(retainedHasConsec).toBe(true);
		const r = nmjl2026.suggestCharlestonPass(s, 'right');
		expect(r.tiles.some((t) => tileEquals(t, N('crack', 4)))).toBe(false);
	});

	it('left pass commits to top-2 retained candidates', () => {
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('bamboo', 6),
			N('bamboo', 8),
			N('dot', 2),
			N('dot', 4),
			N('bamboo', 3),
			N('dot', 5),
			N('crack', 7),
			W('N')
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		const top2 = evals.slice(0, 2);
		const r = nmjl2026.suggestCharlestonPass(s, 'left');
		expect(r.tiles).toHaveLength(3);
		// Every passed tile contributes to zero of the top-2 retained candidates.
		for (const t of r.tiles) {
			const fits = top2.some((e) =>
				e.patternSlots.some((slot) => tileEquals(slot.tile, t))
			);
			expect(fits, `${JSON.stringify(t)} should not contribute to either top-2 hand`).toBe(false);
		}
		expect(r.rationale).toMatch(/committing|commit/i);
	});

	it('courtesy declines when no obvious dead tiles exist', () => {
		// All evens, all in-family, plus jokers and flowers (never-pass). Nothing dead.
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 2),
			N('crack', 4),
			N('crack', 4),
			N('crack', 6),
			N('crack', 6),
			N('crack', 8),
			N('crack', 8),
			N('bamboo', 6),
			J(),
			J(),
			F(),
			F()
		];
		const s = state(hand);
		const r = nmjl2026.suggestCharlestonPass(s, 'courtesy');
		expect(r.tiles).toEqual([]);
		expect(r.rationale).toMatch(/declined|no dead/i);
	});

	it('courtesy returns tiles when 2+ obvious dead tiles exist', () => {
		// The committed top-2 are crack-leaning 2468 bindings (the hand's strongest fit). The
		// stray odds and the dot-suit evens don't fill any of their slots — courtesy passes
		// them. The previous version of this test also asserted "low-value ranks" via the
		// old hardcoded utility ladder (9 worth more than 5); under availability-aware scoring
		// the meaningful invariant is just "fits no committed top-2 slot."
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('bamboo', 6),
			N('bamboo', 8),
			N('dot', 2),
			N('dot', 4),
			N('crack', 5),
			N('bamboo', 7),
			N('dot', 9)
		];
		const s = state(hand);
		const evals = nmjl2026.evaluateTargets(s);
		const top2 = evals.slice(0, 2);
		const r = nmjl2026.suggestCharlestonPass(s, 'courtesy');
		expect(r.tiles.length).toBeGreaterThanOrEqual(2);
		for (const t of r.tiles) {
			const fits = top2.some((e) => e.patternSlots.some((slot) => tileEquals(slot.tile, t)));
			expect(fits, `courtesy must not pass ${JSON.stringify(t)} — it fits a top-2 hand`).toBe(false);
		}
	});

	it('returns empty for an empty hand', () => {
		const s = state([]);
		const r = nmjl2026.suggestCharlestonPass(s, 'right');
		expect(r.tiles).toEqual([]);
		expect(typeof r.rationale).toBe('string');
	});

	it('biases against passing tiles received in a prior pass', () => {
		const baseHand: Tile[] = [
			N('crack', 2),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('bamboo', 6),
			N('bamboo', 8),
			N('dot', 2),
			N('dot', 4),
			N('crack', 7),
			N('crack', 5),
			N('bamboo', 3)
		];
		const s = state(baseHand);
		const withoutHistory = nmjl2026.suggestCharlestonPass(s, 'across');
		expect(withoutHistory.tiles).toHaveLength(3);

		const received = withoutHistory.tiles.map((t) => structuredClone(t));
		s.charleston.passes.push({
			direction: 'right',
			sentTiles: [N('bamboo', 1), N('dot', 9), N('dot', 1)],
			receivedTiles: received
		});
		const withHistory = nmjl2026.suggestCharlestonPass(s, 'across');
		const suggestsReceived = withHistory.tiles.some((t) =>
			received.some((r) => tileEquals(r, t))
		);
		expect(suggestsReceived).toBe(false);
	});
});

describe('NMJL Charleston — never pass a tile filling a top-2 hand', () => {
	const D = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });
	const W = (wind: 'N' | 'E' | 'W' | 'S'): Tile => ({ kind: 'wind', wind });

	function charlestonState(hand: Tile[], passes: GameState['charleston']['passes'] = []): GameState {
		return {
			phase: 'charleston',
			self: { hand, exposures: [] },
			opponents: { left: [], across: [], right: [] },
			discards: [],
			charleston: { passes }
		};
	}

	function topTwoFilled(s: GameState): Tile[] {
		const top2 = nmjl2026.evaluateTargets(s).slice(0, 2);
		const out: Tile[] = [];
		for (const e of top2) {
			for (const slot of e.patternSlots) {
				if (slot.status === 'filled') out.push(slot.tile);
			}
		}
		return out;
	}

	// Round-2 report: one committed right pass; next pass is `across`. The received tiles
	// (d5/S/c6) are protected, which previously tipped a top-2 contributor into the pass.
	const round2 = charlestonState(
		[
			N('crack', 3),
			N('crack', 9),
			N('crack', 3),
			N('bamboo', 2),
			D('red'),
			N('bamboo', 3),
			N('bamboo', 5),
			N('crack', 1),
			N('dot', 6),
			W('E'),
			N('dot', 5),
			W('S'),
			N('crack', 6)
		],
		[
			{
				direction: 'right',
				sentTiles: [N('crack', 8), N('crack', 4), W('N')],
				receivedTiles: [N('dot', 5), W('S'), N('crack', 6)]
			}
		]
	);

	// Consecutive-run leader (FFF 1111 234 5555) sits well above everything; 4-bamboo and
	// 5-bamboo fill its slots and must not be passed.
	const consecLeader = charlestonState([
		F(),
		F(),
		F(),
		N('bamboo', 1),
		N('bamboo', 1),
		N('bamboo', 2),
		N('bamboo', 3),
		N('bamboo', 4),
		N('bamboo', 5),
		N('bamboo', 5),
		N('crack', 9),
		N('dot', 2),
		N('dot', 7)
	]);

	for (const [name, s] of Object.entries({ 'round-2 across': round2, 'consec leader': consecLeader })) {
		it(`does not pass a top-2 filled tile — ${name}`, () => {
			const filled = topTwoFilled(s);
			expect(filled.length, 'precondition: top-2 hands have filled slots').toBeGreaterThan(0);
			for (const dir of ['right', 'across', 'left'] as const) {
				const r = nmjl2026.suggestCharlestonPass(s, dir);
				for (const t of r.tiles) {
					expect(
						filled.some((f) => tileEquals(f, t)),
						`${dir} passed ${JSON.stringify(t)} which fills a top-2 slot`
					).toBe(false);
				}
			}
		});
	}

	it('still returns a legal 3-tile pass when nearly every tile feeds a top-2 hand', () => {
		// Near-complete `1 N 2 EE 3 WWW 4 SSSS` (one S short): its singles (1c–4c, N) and wind
		// groups consume essentially the whole hand, so almost nothing is "free". The
		// held-contributor guard must relax to produce a legal 3-tile pass.
		const s = charlestonState([
			N('crack', 1),
			W('N'),
			N('crack', 2),
			W('E'),
			W('E'),
			N('crack', 3),
			W('W'),
			W('W'),
			W('W'),
			N('crack', 4),
			W('S'),
			W('S'),
			W('S')
		]);
		const filled = topTwoFilled(s);
		const needs = nmjl2026.evaluateTargets(s).slice(0, 2).flatMap((e) => e.tilesNeeded);
		const r = nmjl2026.suggestCharlestonPass(s, 'across');
		expect(r.tiles).toHaveLength(3);
		// Even under relaxation, never pass a tile the top-2 still need to draw.
		for (const t of r.tiles) {
			expect(needs.some((n) => tileEquals(n, t)), `passed a needed tile ${JSON.stringify(t)}`).toBe(
				false
			);
		}
		// Relaxation actually engaged: at least one passed tile is a top-2 contributor.
		const usedContributor = r.tiles.some((t) => filled.some((f) => tileEquals(f, t)));
		expect(usedContributor, 'expected relaxation to dip into a top-2 contributor').toBe(true);
	});

	it('still keeps the 1-bamboo top-2 contributor (round-1 regression)', () => {
		const s = charlestonState([
			N('bamboo', 1),
			D('green'),
			J(),
			N('crack', 8),
			W('N'),
			D('red'),
			N('bamboo', 3),
			N('crack', 1),
			W('E'),
			D('green'),
			J(),
			N('crack', 7),
			W('S')
		]);
		const r = nmjl2026.suggestCharlestonPass(s, 'right');
		expect(r.tiles.some((t) => tileEquals(t, N('bamboo', 1)))).toBe(false);
	});
});

describe('NMJL matcher — availability-aware scoring', () => {
	const D = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });

	it('collapses a target whose needed tile is exhausted from the pool', () => {
		// 2468-1 pattern is `222 444 6666 8888` over suits A and B (`distinctSuits: 1 or 2`).
		// The hand fills the crack 1-suit binding except for one 8C; that binding would score
		// ~0.857 if availability is ignored. Exhausting both 8C and 8B in the wall kills the
		// 1-suit-crack AND the 2-suit-crack+bamboo bindings — the only escapes that score
		// above an empty-hand pivot. With no reachable binding above zero, the target must
		// collapse to 0 rather than masquerade as nearly complete.
		const hand: Tile[] = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			...repeat(N('crack', 6), 3),
			...repeat(N('crack', 8), 3),
			N('bamboo', 1),
			N('bamboo', 9)
		];
		const dead: GameState = {
			phase: 'play',
			self: { hand, exposures: [] },
			opponents: { left: [], across: [], right: [] },
			// Exhaust the 8-kong in every suit: 1 more 8C (you hold 3), all 4 of 8B and 8D.
			// With every 8888 binding unreachable, 2468-1 has no escape that scores above 0.
			discards: [
				N('crack', 8),
				...repeat(N('bamboo', 8), 4),
				...repeat(N('dot', 8), 4)
			],
			charleston: { passes: [] }
		};
		const evalsDead = nmjl2026.evaluateTargets(dead);
		const found = evalsDead.find((e) => e.target.id === '2468-1');
		expect(found, '2468-1 must be reachable enough to evaluate').toBeDefined();
		expect(found!.completionScore).toBe(0);

		// Same hand against an empty table — both 8C and 8B are drawable, target reachable.
		const alive: GameState = {
			...dead,
			opponents: { left: [], across: [], right: [] },
			discards: []
		};
		const aliveFound = nmjl2026.evaluateTargets(alive).find((e) => e.target.id === '2468-1');
		expect(aliveFound!.completionScore).toBeGreaterThan(0.85);
	});

	it('discard picks a different tile when the alternative target is dead', () => {
		// Without availability, both 2468-1 (1 from win) and some flower-hand pivot look like
		// real options — discard would shed the flower (the principled choice). When the 4th
		// 8C is exhausted, 2468-1 collapses to 0 and the flower (only live pivot) outranks
		// the redundant 6Cs in cross-hand value, flipping the discard pick.
		const hand: Tile[] = [
			...repeat(N('crack', 2), 3),
			...repeat(N('crack', 4), 3),
			...repeat(N('crack', 6), 4),
			...repeat(N('crack', 8), 3),
			F()
		];
		const live = state(hand);
		const liveSuggest = nmjl2026.suggestDiscard(live);
		expect(liveSuggest.discard!.kind).toBe('flower');

		const dead: GameState = {
			...live,
			opponents: {
				left: [{ owner: 'left', tiles: [N('crack', 8)] }],
				across: [],
				right: []
			}
		};
		const deadSuggest = nmjl2026.suggestDiscard(dead);
		// 2468-1 still ranks above flower hands by leftover credit, but only by enough to
		// keep its needed tile (8C) protected. The discard is no longer the flower.
		expect(deadSuggest.discard).not.toBeNull();
		expect(deadSuggest.discard!.kind).not.toBe('flower');
	});
});

describe('NMJL evaluateReceivedTiles', () => {
	const D = (dragon: 'red' | 'green' | 'white'): Tile => ({ kind: 'dragon', dragon });

	it('returns keep + passOn covering the received multiset', () => {
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('bamboo', 6),
			N('bamboo', 8),
			N('dot', 2),
			N('dot', 4),
			N('dot', 6),
			N('dot', 8),
			N('crack', 5)
		];
		const s = state(hand);
		const received: Tile[] = [N('crack', 2), N('bamboo', 7), D('red')];
		const ev = nmjl2026.evaluateReceivedTiles!(s, 'across', received);
		expect(ev.keep.length + ev.passOn.length).toBe(received.length);
		for (const t of received) {
			const inKeep = ev.keep.filter((k) => tileEquals(k, t)).length;
			const inPass = ev.passOn.filter((p) => tileEquals(p, t)).length;
			const totalIn = inKeep + inPass;
			const expected = received.filter((r) => tileEquals(r, t)).length;
			expect(totalIn).toBe(expected);
		}
		expect(typeof ev.rationale).toBe('string');
	});

	it('keeps a received tile that completes a pair', () => {
		const hand: Tile[] = [
			N('crack', 2),
			N('crack', 2),
			N('crack', 4),
			N('crack', 4),
			N('crack', 6),
			N('crack', 8),
			N('bamboo', 2),
			N('bamboo', 4),
			N('bamboo', 6),
			N('bamboo', 8),
			N('dot', 2),
			N('dot', 4),
			N('dot', 9)
		];
		const s = state(hand);
		// Receive a 6C — already have one, so this pair-up should be kept.
		const received: Tile[] = [N('crack', 6), N('dot', 1), N('bamboo', 3)];
		const ev = nmjl2026.evaluateReceivedTiles!(s, 'left', received);
		const keep6c = ev.keep.some((t) => tileEquals(t, N('crack', 6)));
		expect(keep6c).toBe(true);
	});
});
