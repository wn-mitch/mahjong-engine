import type { CharlestonDirection, GameState } from '../../engine/gameState';
import type {
	CharlestonPassSuggestion,
	CharlestonReceivedEvaluation,
	Ruleset,
	TargetEvaluation,
	TargetHand,
	TileSuggestion
} from '../../engine/ruleset';
import type { Tile } from '../../engine/tiles';
import { tileEquals } from '../../engine/tiles';
import { buildCensus } from '../../engine/census';
import {
	evaluateReceived as evaluateReceivedImpl,
	suggestCharlestonPass as suggestCharlestonPassImpl
} from './charleston';
import { HANDS, type NMJLHand } from './hands';
import { evaluateHand } from './matcher';
import { tileValue } from './decide';

export interface EvaluateOptions {
	includeConcealed?: boolean;
}

export class NMJLRuleset implements Ruleset {
	readonly id = 'nmjl-2026';
	readonly name = 'American NMJL 2026';
	readonly version = '2026.0.0';

	get hands() {
		return HANDS;
	}

	evaluateTargets(state: GameState, opts: EvaluateOptions = {}): TargetEvaluation[] {
		const pool = opts.includeConcealed ? HANDS : HANDS.filter((h) => !h.concealed);
		const results = pool.map((h) => evaluateHand(h, state));
		results.sort((a, b) => b.completionScore - a.completionScore);
		return results;
	}

	isWinningHand(state: GameState): boolean {
		for (const hand of HANDS) {
			const r = evaluateHand(hand, state);
			if (r.completionScore >= 1) return true;
		}
		return false;
	}

	suggestDiscard(state: GameState, target?: TargetHand): TileSuggestion {
		const ranked = this.evaluateTargets(state);
		if (ranked.length === 0) return { discard: null, rationale: 'no live targets' };

		const top = target
			? (ranked.find((r) => r.target.id === target.id) ?? ranked[0])
			: ranked[0];

		const hand = state.self.hand;
		if (hand.length === 0) return { discard: null, rationale: 'empty hand' };

		const needed = top.tilesNeeded;
		const candidates = hand.filter((t) => !needed.some((n) => tileEquals(n, t)));
		if (candidates.length === 0) {
			return {
				discard: null,
				rationale: `every tile is needed for ${(top.target as NMJLHand).pattern}`
			};
		}

		// Pick the candidate whose value is lowest across the full live ranking: the tile we
		// can shed with the least damage to any reachable target, weighted by completion. The
		// "live ranking" naturally encodes cross-hand utility — a tile that fits more reachable
		// hands has a higher value than one that fits only weak or dead targets.
		const census = buildCensus(state);
		const scored = candidates.map((t) => ({ tile: t, value: tileValue(t, ranked, census) }));
		scored.sort((a, b) => a.value - b.value);
		const pick = scored[0].tile;

		return {
			discard: pick,
			rationale: `lowest cross-hand value, not needed for ${(top.target as NMJLHand).pattern}`
		};
	}

	suggestCharlestonPass(
		state: GameState,
		direction: CharlestonDirection
	): CharlestonPassSuggestion {
		return suggestCharlestonPassImpl(state, direction, this.evaluateTargets(state));
	}

	evaluateReceivedTiles(
		state: GameState,
		nextDirection: CharlestonDirection,
		received: Tile[]
	): CharlestonReceivedEvaluation {
		return evaluateReceivedImpl(state, nextDirection, received, this.evaluateTargets(state));
	}
}

export const nmjl2026 = new NMJLRuleset();
