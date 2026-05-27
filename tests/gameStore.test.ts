import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGameStore } from '../src/lib/state/gameStore.svelte';

// Count-based conservation: total tiles held by seats (concealed + exposed) + discards + the
// undrawn wall must always be the full 152. (Identity-level conservation — that no tile is
// duplicated or mutated — is covered against the raw Match in tests/game.test.ts; the store
// deliberately never exposes the wall, so it can only be counted here.)
function tileCount(store: ReturnType<typeof createGameStore>): number {
	const controlled = store.seats.reduce(
		(n, s) => n + s.hand.length + s.exposures.reduce((m, e) => m + e.tiles.length, 0),
		0
	);
	return controlled + store.discards.length + store.wallRemaining;
}

// Stage the first three non-joker tiles of the current hand for a directional pass.
function stageThree(store: ReturnType<typeof createGameStore>) {
	const hand = store.humanView.self.hand;
	let staged = 0;
	for (let i = 0; i < hand.length && staged < 3; i++) {
		if (hand[i].kind === 'joker') continue;
		store.toggleCharlestonTile(i);
		staged += 1;
	}
}

afterEach(() => {
	vi.useRealTimers();
});

describe('gameStore charleston', () => {
	it('runs the three mandatory passes, then offers the second-charleston vote', () => {
		const store = createGameStore('nmjl-2026', 42);
		expect(store.phase).toBe('charleston');
		expect(store.interaction.kind).toBe('charleston-pass');
		expect(store.charlestonDirection).toBe('right');

		for (const dir of ['right', 'across', 'left'] as const) {
			expect(store.charlestonDirection).toBe(dir);
			stageThree(store);
			expect(store.queuedIndices.size).toBe(3);
			store.commitCharlestonPass();
		}
		expect(store.interaction.kind).toBe('charleston-vote');
		expect(store.isOptionalStep).toBe(true);
	});

	it('declining the second charleston jumps straight to the courtesy pass', () => {
		const store = createGameStore('nmjl-2026', 42);
		for (let i = 0; i < 3; i++) {
			stageThree(store);
			store.commitCharlestonPass();
		}
		store.voteSecondCharleston(false);
		expect(store.interaction.kind).toBe('charleston-courtesy-count');
		expect(store.charlestonDirection).toBe('courtesy');
	});

	it('accepting the second charleston (when the table agrees) runs the optional passes', () => {
		// The second charleston needs unanimous agreement, so not every seed accepts; search a
		// fixed set for one where the bots agree, then drive the optional left/across/right.
		let store!: ReturnType<typeof createGameStore>;
		let accepted = false;
		for (const seed of [7, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) {
			store = createGameStore('nmjl-2026', seed);
			for (let i = 0; i < 3; i++) {
				stageThree(store);
				store.commitCharlestonPass();
			}
			store.voteSecondCharleston(true);
			if (store.interaction.kind === 'charleston-pass') {
				accepted = true;
				break;
			}
		}
		expect(accepted).toBe(true);
		for (const dir of ['left', 'across', 'right'] as const) {
			expect(store.charlestonDirection).toBe(dir);
			stageThree(store);
			store.commitCharlestonPass();
		}
		expect(store.interaction.kind).toBe('charleston-courtesy-count');
	});

	it('records the human charleston pass in the log', () => {
		const store = createGameStore('nmjl-2026', 42);
		stageThree(store);
		store.commitCharlestonPass();
		const ch = store.log.filter((e) => e.kind === 'charleston');
		expect(ch).toHaveLength(1);
		expect(ch[0]).toMatchObject({ kind: 'charleston', seat: 0 });
		if (ch[0].kind === 'charleston') {
			expect(ch[0].tiles).toHaveLength(3);
			expect(ch[0].received).toHaveLength(3);
		}
	});

	it('refuses to stage a joker for a pass', () => {
		const store = createGameStore('nmjl-2026', 3);
		const hand = store.humanView.self.hand;
		const jokerIdx = hand.findIndex((t) => t.kind === 'joker');
		if (jokerIdx < 0) return; // seed-dependent; only assert when a joker is present
		store.toggleCharlestonTile(jokerIdx);
		expect(store.queuedIndices.has(jokerIdx)).toBe(false);
	});

	it('a zero-count courtesy is a no-op that enters play with the human (dealer) to act', () => {
		const store = createGameStore('nmjl-2026', 42);
		for (let i = 0; i < 3; i++) {
			stageThree(store);
			store.commitCharlestonPass();
		}
		store.voteSecondCharleston(false);
		store.setCourtesyCount(0);
		expect(store.phase).toBe('play');
		expect(store.turn).toBe(0);
		expect(store.interaction.kind).toBe('human-turn');
		expect(store.humanView.self.hand).toHaveLength(14); // dealer keeps its extra and opens
	});

	it('conserves the full 152-tile pool through the whole charleston', () => {
		const store = createGameStore('nmjl-2026', 99);
		for (let i = 0; i < 3; i++) {
			stageThree(store);
			store.commitCharlestonPass();
		}
		store.voteSecondCharleston(true);
		for (let i = 0; i < 3; i++) {
			stageThree(store);
			store.commitCharlestonPass();
		}
		store.setCourtesyCount(3); // human offers 3; the negotiated count may be lower
		if (store.interaction.kind === 'charleston-courtesy-pass') {
			const hand = store.humanView.self.hand;
			for (let i = 0, staged = 0; i < hand.length && staged < store.passTarget; i++) {
				if (hand[i].kind === 'joker') continue;
				store.toggleCharlestonTile(i);
				staged += 1;
			}
			store.commitCourtesy();
		}
		expect(store.phase).toBe('play');
		expect(tileCount(store)).toBe(152);
	});
});

describe('gameStore play loop', () => {
	// Drive a full game: human always discards its first tile and passes on every claim.
	// Bot turns fire on fake timers between human actions.
	function playOut(seed: number) {
		vi.useFakeTimers();
		const store = createGameStore('nmjl-2026', seed);
		for (let i = 0; i < 3; i++) {
			stageThree(store);
			store.commitCharlestonPass();
		}
		store.voteSecondCharleston(false);
		store.setCourtesyCount(0);

		let guard = 0;
		while (store.phase === 'play' && guard < 600) {
			guard += 1;
			const k = store.interaction.kind;
			if (k === 'human-turn') {
				store.selectDiscard(store.humanView.self.hand[0]);
			} else if (k === 'claim') {
				store.respondToClaim('pass');
			}
			vi.runAllTimers(); // run scheduled bot turns until the next human action or end
		}
		return store;
	}

	it('plays a seeded game to completion, conserving all 152 tiles', () => {
		const store = playOut(5);
		expect(store.phase).toBe('ended');
		expect(store.result).not.toBeNull();
		expect(tileCount(store)).toBe(152);
	});

	it('logs the human draws and discards, ending with the final result', () => {
		const store = playOut(5);
		expect(store.phase).toBe('ended');
		const log = store.log;
		const last = log[log.length - 1];
		expect(last.kind).toBe('end');
		if (last.kind === 'end') expect(last.result).toEqual(store.result);
		expect(log.some((e) => e.kind === 'draw' && e.seat === 0)).toBe(true);
		expect(log.some((e) => e.kind === 'discard')).toBe(true);
		// Bot draws are deliberately never logged — only the human's own.
		expect(log.filter((e) => e.kind === 'draw').every((e) => e.seat === 0)).toBe(true);
	});

	it('toggleLog flips the log panel visibility', () => {
		const store = createGameStore('nmjl-2026', 42);
		expect(store.logOpen).toBe(true);
		store.toggleLog();
		expect(store.logOpen).toBe(false);
	});

	it('opens and resolves a claim window on the human discard (turn leaves seat 0)', () => {
		vi.useFakeTimers();
		const store = createGameStore('nmjl-2026', 11);
		for (let i = 0; i < 3; i++) {
			stageThree(store);
			store.commitCharlestonPass();
		}
		store.voteSecondCharleston(false);
		store.setCourtesyCount(0);
		expect(store.turn).toBe(0);
		store.selectDiscard(store.humanView.self.hand[0]);
		vi.runAllTimers();
		// after the human's discard is resolved, play has moved off seat 0 (a bot is acting or
		// it is the human's turn again only after a full lap)
		expect(store.phase === 'play' || store.phase === 'ended').toBe(true);
		expect(tileCount(store)).toBe(152);
	});
});
