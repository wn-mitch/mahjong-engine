import type { Tile } from '$lib/engine/tiles';
import { fullTilePool, shuffleInPlace, tileEquals } from '$lib/engine/tiles';
import type {
	CharlestonDirection,
	Exposure,
	GamePhase,
	GameState
} from '$lib/engine/gameState';
import { emptyState } from '$lib/engine/gameState';
import type {
	CharlestonPassSuggestion,
	CharlestonReceivedEvaluation,
	Ruleset,
	TargetEvaluation,
	TileSuggestion
} from '$lib/engine/ruleset';
import { nmjl2026, chineseTraditional } from '$lib/rulesets';

export type RulesetId = 'nmjl-2026' | 'chinese-traditional';
export type Opp = 'left' | 'across' | 'right';

export type FocusTarget =
	| { kind: 'hand' }
	| { kind: 'self-exposure'; index: number }
	| { kind: 'opp-exposure'; opp: Opp; index: number }
	| { kind: 'discards' }
	| { kind: 'charleston-sent' }
	| { kind: 'charleston-received' };

const CHARLESTON_ORDER: CharlestonDirection[] = ['right', 'across', 'left', 'courtesy'];

export function nextCharlestonDirection(passCount: number): CharlestonDirection | null {
	return CHARLESTON_ORDER[passCount] ?? null;
}

const RULESETS: Record<RulesetId, Ruleset> = {
	'nmjl-2026': nmjl2026,
	'chinese-traditional': chineseTraditional
};

function ensureExposure(list: Exposure[], index: number, owner: Exposure['owner']): Exposure {
	while (list.length <= index) list.push({ owner, tiles: [] });
	return list[index];
}

function cloneState(s: GameState): GameState {
	const clone: GameState = JSON.parse(JSON.stringify(s));
	if (!clone.charleston) clone.charleston = { passes: [] };
	return clone;
}

function pickExposureTile(pool: Tile[]): { tile: Tile; copies: number } | null {
	const candidates: { tile: Tile; copies: number }[] = [];
	const counted = new Set<string>();
	for (const t of pool) {
		if (t.kind === 'joker' || t.kind === 'flower') continue;
		const key = JSON.stringify(t);
		if (counted.has(key)) continue;
		counted.add(key);
		const copies = pool.filter((p) => tileEquals(p, t)).length;
		if (copies >= 3) candidates.push({ tile: t, copies });
	}
	if (candidates.length === 0) return null;
	return candidates[Math.floor(Math.random() * candidates.length)];
}

function takeFromPool(pool: Tile[], target: Tile, count: number): Tile[] {
	const taken: Tile[] = [];
	for (let i = 0; i < count; i++) {
		const idx = pool.findIndex((p) => tileEquals(p, target));
		if (idx < 0) break;
		taken.push(pool[idx]);
		pool.splice(idx, 1);
	}
	return taken;
}

function generateExposures(
	pool: Tile[],
	owner: Exposure['owner'],
	minCount: number,
	maxCount: number
): Exposure[] {
	const n = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
	const out: Exposure[] = [];
	for (let i = 0; i < n; i++) {
		const pick = pickExposureTile(pool);
		if (!pick) break;
		const wantKong = pick.copies >= 4 && Math.random() < 0.25;
		const size = wantKong ? 4 : 3;
		const tiles = takeFromPool(pool, pick.tile, size);
		if (tiles.length < 3) break;
		out.push({ owner, tiles });
	}
	return out;
}

function generateRandomPosition(phase: GamePhase): GameState {
	const pool = shuffleInPlace(fullTilePool());

	const hand: Tile[] = [];
	for (let i = 0; i < 13 && pool.length > 0; i++) {
		hand.push(pool.pop() as Tile);
	}

	if (phase === 'charleston') {
		return {
			phase,
			self: { hand, exposures: [] },
			opponents: { left: [], across: [], right: [] },
			discards: [],
			charleston: { passes: [] }
		};
	}

	const isEndgame = phase === 'endgame';
	const expMin = isEndgame ? 1 : 0;
	const expMax = isEndgame ? 4 : 3;

	const opponents = {
		left: generateExposures(pool, 'left', expMin, expMax),
		across: generateExposures(pool, 'across', expMin, expMax),
		right: generateExposures(pool, 'right', expMin, expMax)
	};

	const discardMin = isEndgame ? 18 : 6;
	const discardMax = isEndgame ? 30 : 15;
	const discardCount = Math.min(
		pool.length,
		discardMin + Math.floor(Math.random() * (discardMax - discardMin + 1))
	);
	const discards: Tile[] = [];
	for (let i = 0; i < discardCount; i++) {
		const t = pool.pop();
		if (!t) break;
		discards.push(t);
	}

	return {
		phase,
		self: { hand, exposures: [] },
		opponents,
		discards,
		charleston: { passes: [] }
	};
}

export function createPositionStore() {
	const initialState = emptyState();
	let state = $state<GameState>(initialState);
	let rulesetId = $state<RulesetId>('nmjl-2026');
	let focus = $state<FocusTarget>(
		initialState.phase === 'charleston' ? { kind: 'charleston-sent' } : { kind: 'hand' }
	);
	let pinnedTargetId = $state<string | null>(null);
	let jsonEditorOpen = $state(false);
	let charlestonSent = $state<Tile[]>([]);
	let charlestonReceived = $state<Tile[]>([]);

	const ruleset = $derived(RULESETS[rulesetId]);

	const bufferToHandIndex = $derived.by<(number | null)[]>(() => {
		const used = new Set<number>();
		const hand = state.self.hand;
		return charlestonSent.map((t) => {
			for (let i = 0; i < hand.length; i++) {
				if (used.has(i)) continue;
				if (tileEquals(hand[i], t)) {
					used.add(i);
					return i;
				}
			}
			return null;
		});
	});

	const queuedHandIndices = $derived.by<Set<number>>(() => {
		const set = new Set<number>();
		for (const i of bufferToHandIndex) if (i !== null) set.add(i);
		return set;
	});

	const effectiveState = $derived.by<GameState>(() => {
		if (queuedHandIndices.size === 0) return state;
		return {
			...state,
			self: {
				...state.self,
				hand: state.self.hand.filter((_, i) => !queuedHandIndices.has(i))
			}
		};
	});

	const evaluation = $derived.by<TargetEvaluation[]>(() => {
		try {
			return ruleset.evaluateTargets(effectiveState);
		} catch {
			return [];
		}
	});

	const topEval = $derived(
		pinnedTargetId
			? (evaluation.find((e) => e.target.id === pinnedTargetId) ?? evaluation[0] ?? null)
			: (evaluation[0] ?? null)
	);

	const suggestion = $derived.by<TileSuggestion>(() => {
		try {
			return ruleset.suggestDiscard(effectiveState, topEval?.target);
		} catch {
			return { discard: null, rationale: 'engine error' };
		}
	});

	const isWinning = $derived.by(() => {
		try {
			return ruleset.isWinningHand(effectiveState);
		} catch {
			return false;
		}
	});

	function setRuleset(id: RulesetId) {
		rulesetId = id;
		pinnedTargetId = null;
	}

	function setPhase(phase: GamePhase) {
		state.phase = phase;
		if (phase === 'charleston') {
			focus = { kind: 'charleston-sent' };
		} else if (focus.kind === 'charleston-sent' || focus.kind === 'charleston-received') {
			focus = { kind: 'hand' };
		}
	}

	function pinTarget(id: string | null) {
		pinnedTargetId = pinnedTargetId === id ? null : id;
	}

	function setFocus(f: FocusTarget) {
		focus = f;
	}

	function setJsonEditorOpen(v: boolean) {
		jsonEditorOpen = v;
	}

	function addTile(tile: Tile) {
		const f = focus;
		if (f.kind === 'hand') {
			state.self.hand.push($state.snapshot(tile));
		} else if (f.kind === 'self-exposure') {
			const ex = ensureExposure(state.self.exposures, f.index, 'self');
			ex.tiles.push($state.snapshot(tile));
		} else if (f.kind === 'opp-exposure') {
			const owner = f.opp === 'left' ? 'left' : f.opp === 'across' ? 'across' : 'right';
			const list = state.opponents[f.opp];
			const ex = ensureExposure(list, f.index, owner);
			ex.tiles.push($state.snapshot(tile));
		} else if (f.kind === 'discards') {
			state.discards.push($state.snapshot(tile));
		} else if (f.kind === 'charleston-sent') {
			if (charlestonSent.length < 3) charlestonSent.push($state.snapshot(tile));
		} else if (f.kind === 'charleston-received') {
			if (charlestonReceived.length < 3) charlestonReceived.push($state.snapshot(tile));
		}
	}

	function removeFromHand(index: number) {
		state.self.hand.splice(index, 1);
	}

	function removeFromSelfExposure(exposureIdx: number, tileIdx: number) {
		const ex = state.self.exposures[exposureIdx];
		if (!ex) return;
		ex.tiles.splice(tileIdx, 1);
		if (ex.tiles.length === 0) state.self.exposures.splice(exposureIdx, 1);
	}

	function removeFromOppExposure(opp: Opp, exposureIdx: number, tileIdx: number) {
		const list = state.opponents[opp];
		const ex = list[exposureIdx];
		if (!ex) return;
		ex.tiles.splice(tileIdx, 1);
		if (ex.tiles.length === 0) list.splice(exposureIdx, 1);
	}

	function removeFromDiscards(index: number) {
		state.discards.splice(index, 1);
	}

	function addSelfExposureSlot() {
		state.self.exposures.push({ owner: 'self', tiles: [] });
		focus = { kind: 'self-exposure', index: state.self.exposures.length - 1 };
	}

	function addOppExposureSlot(opp: Opp) {
		const owner = opp === 'left' ? 'left' : opp === 'across' ? 'across' : 'right';
		state.opponents[opp].push({ owner, tiles: [] });
		focus = { kind: 'opp-exposure', opp, index: state.opponents[opp].length - 1 };
	}

	function defaultFocusForPhase(phase: GamePhase): FocusTarget {
		return phase === 'charleston' ? { kind: 'charleston-sent' } : { kind: 'hand' };
	}

	function reset() {
		state = emptyState();
		focus = defaultFocusForPhase(state.phase);
		pinnedTargetId = null;
		charlestonSent = [];
		charlestonReceived = [];
	}

	function randomPosition() {
		state = generateRandomPosition(state.phase);
		focus = defaultFocusForPhase(state.phase);
		pinnedTargetId = null;
		charlestonSent = [];
		charlestonReceived = [];
	}

	function removeFromCharlestonSent(index: number) {
		charlestonSent.splice(index, 1);
	}

	function toggleQueueHandTile(srcIndex: number) {
		const bufferSlot = bufferToHandIndex.indexOf(srcIndex);
		if (bufferSlot >= 0) {
			charlestonSent.splice(bufferSlot, 1);
			return;
		}
		if (charlestonSent.length >= 3) return;
		const tile = state.self.hand[srcIndex];
		if (!tile) return;
		charlestonSent.push($state.snapshot(tile));
	}

	function removeFromCharlestonReceived(index: number) {
		charlestonReceived.splice(index, 1);
	}

	function fillRandomReceived(direction: CharlestonDirection) {
		const desiredCount = direction === 'courtesy' ? charlestonSent.length : 3;
		if (desiredCount === 0) {
			charlestonReceived = [];
			return;
		}
		const pool = fullTilePool();
		const visible: Tile[] = [
			...state.self.hand,
			...state.self.exposures.flatMap((e) => e.tiles),
			...state.opponents.left.flatMap((e) => e.tiles),
			...state.opponents.across.flatMap((e) => e.tiles),
			...state.opponents.right.flatMap((e) => e.tiles),
			...state.discards
		];
		for (const t of visible) {
			const idx = pool.findIndex((p) => tileEquals(p, t));
			if (idx >= 0) pool.splice(idx, 1);
		}
		shuffleInPlace(pool);

		// Deal a plausible 13-tile opponent hand from the unseen pool and ask the same engine
		// the bots use what that opponent would pass in this direction. This is why the
		// simulation no longer hands you a joker (illegal to pass) or a flower (the brain never
		// sheds one) — the old version drew uniformly from the pool and did neither.
		const oppHand = pool.slice(0, Math.min(13, pool.length));
		const oppState: GameState = {
			phase: 'charleston',
			self: { hand: oppHand, exposures: [] },
			opponents: { left: [], across: [], right: [] },
			discards: [],
			charleston: { passes: [] }
		};
		let passed: Tile[] = [];
		try {
			passed = [...ruleset.suggestCharlestonPass(oppState, direction).tiles];
		} catch {
			passed = [];
		}
		// If the brain under-fills (nearly everything guarded), top up from the opponent hand —
		// never with a joker.
		for (const t of oppHand) {
			if (passed.length >= desiredCount) break;
			if (t.kind === 'joker') continue;
			if (passed.includes(t)) continue;
			passed.push(t);
		}
		charlestonReceived = passed.slice(0, desiredCount).map((t) => $state.snapshot(t));
	}

	function clearCharlestonBuffers() {
		charlestonSent = [];
		charlestonReceived = [];
	}

	function multisetSubset(needle: Tile[], haystack: Tile[]): boolean {
		const pool = [...haystack];
		for (const n of needle) {
			const idx = pool.findIndex((p) => tileEquals(p, n));
			if (idx < 0) return false;
			pool.splice(idx, 1);
		}
		return true;
	}

	function commitCharlestonPass(
		direction: CharlestonDirection,
		sent: Tile[],
		received: Tile[]
	): { ok: true } | { ok: false; error: string } {
		if (!multisetSubset(sent, state.self.hand)) {
			return { ok: false, error: 'sent tiles must come from your current hand' };
		}
		const expectedSent = direction === 'courtesy' ? sent.length : 3;
		if (sent.length !== expectedSent) {
			return { ok: false, error: `${direction} pass requires ${expectedSent} sent tile(s)` };
		}
		if (received.length !== sent.length) {
			return { ok: false, error: 'sent and received counts must match' };
		}
		for (const s of sent) {
			const idx = state.self.hand.findIndex((h) => tileEquals(h, s));
			if (idx >= 0) state.self.hand.splice(idx, 1);
		}
		for (const r of received) state.self.hand.push($state.snapshot(r));
		state.charleston.passes.push({
			direction,
			sentTiles: sent.map((t) => $state.snapshot(t)),
			receivedTiles: received.map((t) => $state.snapshot(t))
		});
		clearCharlestonBuffers();
		return { ok: true };
	}

	function undoCharlestonPass() {
		const passes = state.charleston.passes;
		const last = passes.pop();
		if (!last) return;
		for (const r of last.receivedTiles) {
			const idx = state.self.hand.findIndex((h) => tileEquals(h, r));
			if (idx >= 0) state.self.hand.splice(idx, 1);
		}
		for (const s of last.sentTiles) state.self.hand.push($state.snapshot(s));
	}

	function suggestCharlestonPass(direction: CharlestonDirection): CharlestonPassSuggestion {
		try {
			// Read the same state the displayed ranking does, so the suggested tiles and the
			// targets shown above can never disagree. The CharlestonPanel clears the queued
			// buffer before calling this so effectiveState equals the full hand at compute
			// time; the queued tiles afterward become a live post-pass preview.
			return ruleset.suggestCharlestonPass(effectiveState, direction);
		} catch {
			return { tiles: [], rationale: 'engine error' };
		}
	}

	function evaluateCharlestonReceived(
		nextDirection: CharlestonDirection,
		received: Tile[]
	): CharlestonReceivedEvaluation | null {
		if (!ruleset.evaluateReceivedTiles) return null;
		try {
			return ruleset.evaluateReceivedTiles(state, nextDirection, received);
		} catch {
			return null;
		}
	}

	function exportJSON(): string {
		return JSON.stringify({ rulesetId, state }, null, 2);
	}

	function importJSON(raw: string): { ok: true } | { ok: false; error: string } {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.rulesetId && RULESETS[parsed.rulesetId as RulesetId]) {
				rulesetId = parsed.rulesetId;
			}
			if (parsed.state && typeof parsed.state === 'object') {
				state = cloneState(parsed.state as GameState);
			}
			pinnedTargetId = null;
			charlestonSent = [];
			charlestonReceived = [];
			return { ok: true };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : 'invalid JSON' };
		}
	}

	return {
		get state() {
			return state;
		},
		get rulesetId() {
			return rulesetId;
		},
		get ruleset() {
			return ruleset;
		},
		get focus() {
			return focus;
		},
		get pinnedTargetId() {
			return pinnedTargetId;
		},
		get evaluation() {
			return evaluation;
		},
		get topEval() {
			return topEval;
		},
		get suggestion() {
			return suggestion;
		},
		get isWinning() {
			return isWinning;
		},
		get jsonEditorOpen() {
			return jsonEditorOpen;
		},
		get charlestonSent() {
			return charlestonSent;
		},
		get charlestonReceived() {
			return charlestonReceived;
		},
		get queuedHandIndices() {
			return queuedHandIndices;
		},
		setRuleset,
		setPhase,
		pinTarget,
		setFocus,
		setJsonEditorOpen,
		addTile,
		removeFromHand,
		removeFromSelfExposure,
		removeFromOppExposure,
		removeFromDiscards,
		addSelfExposureSlot,
		addOppExposureSlot,
		reset,
		randomPosition,
		removeFromCharlestonSent,
		removeFromCharlestonReceived,
		fillRandomReceived,
		toggleQueueHandTile,
		clearCharlestonBuffers,
		commitCharlestonPass,
		undoCharlestonPass,
		suggestCharlestonPass,
		evaluateCharlestonReceived,
		exportJSON,
		importJSON
	};
}

export type PositionStore = ReturnType<typeof createPositionStore>;
