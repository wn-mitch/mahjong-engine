import type { Dragon, Suit, Tile } from '../../engine/tiles';
import { cap, tileEquals, tileKey } from '../../engine/tiles';
import type { GameState } from '../../engine/gameState';
import { buildCensus, type TileCensus } from '../../engine/census';
import type { PatternSlot, TargetEvaluation } from '../../engine/ruleset';
import {
	GROUP_SIZE,
	type DragonVar,
	type Group,
	type GroupKind,
	type NMJLHand,
	type NumVar,
	type SuitVar,
	type TileSpec
} from './hands';

const ALL_SUITS: Suit[] = ['crack', 'bamboo', 'dot'];
const ALL_DRAGONS: Dragon[] = ['red', 'green', 'white'];

const SUIT_TO_MATCHING_DRAGON: Record<Suit, Dragon> = {
	crack: 'red',
	bamboo: 'green',
	dot: 'white'
};

const SUIT_TO_OPP_DRAGONS: Record<Suit, Dragon[]> = {
	crack: ['green', 'white'],
	bamboo: ['red', 'white'],
	dot: ['red', 'green']
};

interface Assignment {
	suits: Partial<Record<SuitVar, Suit>>;
	nums: Partial<Record<NumVar, number>>;
	dragons: Partial<Record<DragonVar, Dragon>>;
	oppDragonChoice: Record<string, Dragon>; // keyed by group index for dragonMatch:opp
}

function* enumerateSuits(
	vars: SuitVar[],
	allowed: number[]
): Generator<Partial<Record<SuitVar, Suit>>> {
	if (vars.length === 0) {
		yield {};
		return;
	}
	const allow = new Set(allowed);
	function* rec(
		i: number,
		current: Partial<Record<SuitVar, Suit>>
	): Generator<Partial<Record<SuitVar, Suit>>> {
		if (i === vars.length) {
			const distinct = new Set(Object.values(current));
			if (allow.has(distinct.size)) yield { ...current };
			return;
		}
		for (const s of ALL_SUITS) {
			current[vars[i]] = s;
			yield* rec(i + 1, current);
		}
		delete current[vars[i]];
	}
	yield* rec(0, {});
}

function* enumerateNums(
	numVars: NumVar[],
	domains: Partial<Record<NumVar, number[]>>
): Generator<Partial<Record<NumVar, number>>> {
	if (numVars.length === 0) {
		yield {};
		return;
	}
	function* rec(
		i: number,
		current: Partial<Record<NumVar, number>>
	): Generator<Partial<Record<NumVar, number>>> {
		if (i === numVars.length) {
			yield { ...current };
			return;
		}
		const v = numVars[i];
		const domain = domains[v] ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
		for (const n of domain) {
			current[v] = n;
			yield* rec(i + 1, current);
		}
		delete current[v];
	}
	yield* rec(0, {});
}

function* enumerateDragons(
	vars: DragonVar[]
): Generator<Partial<Record<DragonVar, Dragon>>> {
	if (vars.length === 0) {
		yield {};
		return;
	}
	function* rec(
		i: number,
		current: Partial<Record<DragonVar, Dragon>>
	): Generator<Partial<Record<DragonVar, Dragon>>> {
		if (i === vars.length) {
			yield { ...current };
			return;
		}
		const used = new Set(Object.values(current));
		for (const d of ALL_DRAGONS) {
			if (used.has(d)) continue;
			current[vars[i]] = d;
			yield* rec(i + 1, current);
		}
		delete current[vars[i]];
	}
	yield* rec(0, {});
}

function collectVars(groups: Group[]): {
	numVars: NumVar[];
	dragonVars: DragonVar[];
	oppDragonGroups: number[];
} {
	const numSet = new Set<NumVar>();
	const dragonSet = new Set<DragonVar>();
	const oppDragonGroups: number[] = [];
	groups.forEach((g, idx) => {
		const t = g.tile;
		if (t.kind === 'numVar') numSet.add(t.numVar);
		else if (t.kind === 'dragonVar') dragonSet.add(t.var);
		else if (t.kind === 'dragonMatch' && t.relation === 'opp') oppDragonGroups.push(idx);
	});
	return {
		numVars: [...numSet],
		dragonVars: [...dragonSet],
		oppDragonGroups
	};
}

function materializeTile(
	spec: TileSpec,
	a: Assignment,
	groupIdx: number
): Tile | null {
	switch (spec.kind) {
		case 'num': {
			const s = a.suits[spec.suit];
			if (!s) return null;
			return { kind: 'number', suit: s, rank: spec.rank };
		}
		case 'numVar': {
			const s = a.suits[spec.suit];
			const base = a.nums[spec.numVar];
			if (!s || base === undefined) return null;
			const rank = base + (spec.offset ?? 0);
			if (rank < 1 || rank > 9) return null;
			return { kind: 'number', suit: s, rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
		}
		case 'wind':
			return { kind: 'wind', wind: spec.wind };
		case 'dragon':
			return { kind: 'dragon', dragon: spec.dragon };
		case 'dragonMatch': {
			const s = a.suits[spec.suit];
			if (!s) return null;
			if (spec.relation === 'same') return { kind: 'dragon', dragon: SUIT_TO_MATCHING_DRAGON[s] };
			const chosen = a.oppDragonChoice[String(groupIdx)];
			if (!chosen) return null;
			return { kind: 'dragon', dragon: chosen };
		}
		case 'dragonVar': {
			const d = a.dragons[spec.var];
			if (!d) return null;
			return { kind: 'dragon', dragon: d };
		}
		case 'flower':
			return { kind: 'flower' };
	}
}

interface MaterializedGroup {
	kind: GroupKind;
	tile: Tile;
}

function materializeHand(hand: NMJLHand, a: Assignment): MaterializedGroup[] | null {
	const out: MaterializedGroup[] = [];
	for (let i = 0; i < hand.groups.length; i++) {
		const g = hand.groups[i];
		const t = materializeTile(g.tile, a, i);
		if (!t) return null;
		out.push({ kind: g.kind, tile: t });
	}
	return out;
}

function exceedsTileLimit(groups: MaterializedGroup[]): boolean {
	const counts = new Map<string, number>();
	for (const g of groups) {
		const size = GROUP_SIZE[g.kind];
		const key = tileKey(g.tile);
		const next = (counts.get(key) ?? 0) + size;
		if (next > cap(g.tile)) return true;
		counts.set(key, next);
	}
	return false;
}

interface MatchScore {
	missing: Tile[];
	score: number;
	jokerSlotsRemaining: number;
	jokersUsed: number;
	slots: PatternSlot[];
}

function scoreAgainstPlayer(
	target: MaterializedGroup[],
	nonJokers: Tile[],
	jokerCount: number,
	census: TileCensus
): MatchScore {
	const pool = [...nonJokers];
	const perGroup: { kind: GroupKind; tile: Tile; missingCount: number; size: number }[] = [];

	for (const g of target) {
		const size = GROUP_SIZE[g.kind];
		let missingCount = 0;
		for (let i = 0; i < size; i++) {
			const idx = pool.findIndex((p) => tileEquals(p, g.tile));
			if (idx >= 0) pool.splice(idx, 1);
			else missingCount++;
		}
		perGroup.push({ kind: g.kind, tile: g.tile, missingCount, size });
	}

	let jokersLeft = jokerCount;
	let jokersUsed = 0;
	let jokerSlotsRemaining = 0;
	const finalMissing: Tile[] = [];
	const slots: PatternSlot[] = [];
	// Real (non-joker) copies each tile type still needs from the unseen pool, summed across
	// groups — groups requiring the same tile compete for the same wall, so reachability has
	// to aggregate demand rather than judge each group in isolation.
	const realDemand = new Map<string, { tile: Tile; need: number }>();

	for (let groupIndex = 0; groupIndex < perGroup.length; groupIndex++) {
		const grp = perGroup[groupIndex];
		const acceptsJoker = grp.size >= 3;
		const filledFromPool = grp.size - grp.missingCount;
		let fillFromJokers = 0;
		let realNeed = grp.missingCount;
		// A joker-eligible group with zero natural tiles isn't really "started" — we don't let
		// jokers manufacture an entire suit out of nothing, which would let a hand with one
		// dot tile score as if it were close to a 4-dot kong. Pairs and singles can never use
		// jokers in the first place, so this only changes behavior for pung/kong/quint/sextet.
		if (acceptsJoker && filledFromPool > 0) {
			fillFromJokers = Math.min(grp.missingCount, jokersLeft);
			jokersLeft -= fillFromJokers;
			jokersUsed += fillFromJokers;
			realNeed = grp.missingCount - fillFromJokers;
		}
		if (acceptsJoker) jokerSlotsRemaining += realNeed;
		for (let i = 0; i < realNeed; i++) finalMissing.push(grp.tile);
		if (realNeed > 0) {
			const key = tileKey(grp.tile);
			const entry = realDemand.get(key) ?? { tile: grp.tile, need: 0 };
			entry.need += realNeed;
			realDemand.set(key, entry);
		}
		for (let i = 0; i < grp.size; i++) {
			let status: PatternSlot['status'];
			if (i < filledFromPool) status = 'filled';
			else if (i < filledFromPool + fillFromJokers) status = 'joker-filled';
			else status = 'needed';
			slots.push({ tile: grp.tile, status, groupIndex });
		}
	}

	// Reachability: if a needed tile demands more real copies than remain unseen, this target
	// is dead — unwinnable even drawing every remaining copy. Collapse it to 0 so it ranks
	// below any still-attainable target instead of masquerading as nearly complete.
	let reachable = true;
	for (const { tile, need } of realDemand.values()) {
		if (need > census.unseenCount(tile)) {
			reachable = false;
			break;
		}
	}

	const score = reachable ? (14 - finalMissing.length) / 14 : 0;
	return { missing: finalMissing, score, jokerSlotsRemaining, jokersUsed, slots };
}

function* enumerateOppDragons(
	groups: number[],
	suitAssignment: Partial<Record<SuitVar, Suit>>,
	hand: NMJLHand
): Generator<Record<string, Dragon>> {
	if (groups.length === 0) {
		yield {};
		return;
	}
	function* rec(i: number, current: Record<string, Dragon>): Generator<Record<string, Dragon>> {
		if (i === groups.length) {
			yield { ...current };
			return;
		}
		const groupIdx = groups[i];
		const spec = hand.groups[groupIdx].tile;
		if (spec.kind !== 'dragonMatch' || spec.relation !== 'opp') return;
		const s = suitAssignment[spec.suit];
		if (!s) return;
		for (const d of SUIT_TO_OPP_DRAGONS[s]) {
			current[String(groupIdx)] = d;
			yield* rec(i + 1, current);
		}
		delete current[String(groupIdx)];
	}
	yield* rec(0, {});
}

export function evaluateHand(hand: NMJLHand, state: GameState): TargetEvaluation {
	const census = buildCensus(state);
	const allTiles: Tile[] = [
		...state.self.hand,
		...state.self.exposures.flatMap((e) => e.tiles)
	];
	let jokerCount = 0;
	const nonJokers: Tile[] = [];
	for (const t of allTiles) {
		if (t.kind === 'joker') jokerCount++;
		else nonJokers.push(t);
	}

	const { numVars, dragonVars, oppDragonGroups } = collectVars(hand.groups);
	const suitAllowed =
		hand.constraints.distinctSuits ??
		Array.from({ length: hand.constraints.suitVars.length + 1 }, (_, i) => i);

	let best: MatchScore | null = null;
	for (const suits of enumerateSuits(hand.constraints.suitVars, suitAllowed)) {
		for (const nums of enumerateNums(numVars, hand.constraints.numberDomains ?? {})) {
			for (const dragons of enumerateDragons(dragonVars)) {
				for (const oppDragonChoice of enumerateOppDragons(oppDragonGroups, suits, hand)) {
					const a: Assignment = { suits, nums, dragons, oppDragonChoice };
					const materialized = materializeHand(hand, a);
					if (!materialized) continue;
					if (exceedsTileLimit(materialized)) continue;
					const result = scoreAgainstPlayer(materialized, nonJokers, jokerCount, census);
					if (!best || result.score > best.score) best = result;
				}
			}
		}
	}

	if (!best) {
		return {
			target: hand,
			tilesNeeded: [],
			jokerSlotsRemaining: 0,
			completionScore: 0,
			patternSlots: []
		};
	}
	return {
		target: hand,
		tilesNeeded: best.missing,
		jokerSlotsRemaining: best.jokerSlotsRemaining,
		completionScore: best.score,
		patternSlots: best.slots
	};
}
