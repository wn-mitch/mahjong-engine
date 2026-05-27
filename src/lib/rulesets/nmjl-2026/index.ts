import type { CharlestonDirection, GameState } from '../../engine/gameState';
import type {
	CharlestonPassSuggestion,
	CharlestonReceivedEvaluation,
	CharlestonStep,
	ClaimOption,
	DealCounts,
	GameRuleset,
	MahjongCheckOptions,
	TargetEvaluation,
	TargetHand,
	TileSuggestion
} from '../../engine/ruleset';
import type { Tile } from '../../engine/tiles';
import { countTile, tileEquals } from '../../engine/tiles';
import { buildCensus } from '../../engine/census';
import {
	evaluateReceived as evaluateReceivedImpl,
	suggestCharlestonPass as suggestCharlestonPassImpl,
	topUpToThree
} from './charleston';
import { HANDS, type NMJLHand } from './hands';
import { evaluateHand } from './matcher';
import { tileValue } from './decide';

export interface EvaluateOptions {
	includeConcealed?: boolean;
}

export class NMJLRuleset implements GameRuleset {
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
		const hasExposures = state.self.exposures.length > 0;
		for (const hand of HANDS) {
			// A concealed ("C") hand may only be won fully concealed — once you've claimed a
			// discard into an exposure, those hands are off the table.
			if (hand.concealed && hasExposures) continue;
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
		const sugg = suggestCharlestonPassImpl(state, direction, this.evaluateTargets(state));
		// The mandatory passes (right/across/left) must always send exactly three tiles; the brain
		// may under-fill when nearly every tile is guarded, so top up here. Courtesy is optional
		// and legitimately passes 0–3.
		if (direction === 'courtesy') return sugg;
		return { ...sugg, tiles: topUpToThree(sugg.tiles, state.self.hand) };
	}

	evaluateReceivedTiles(
		state: GameState,
		nextDirection: CharlestonDirection,
		received: Tile[]
	): CharlestonReceivedEvaluation {
		return evaluateReceivedImpl(state, nextDirection, received, this.evaluateTargets(state));
	}

	dealCounts(): DealCounts {
		// East (dealer) is dealt 14 and opens play by discarding; everyone else gets 13.
		return { perSeat: 13, dealerExtra: 1 };
	}

	charlestonPlan(): CharlestonStep[] {
		// First charleston is mandatory; the second charleston and the courtesy pass are
		// optional and driven by table agreement.
		return [
			{ direction: 'right', optional: false },
			{ direction: 'across', optional: false },
			{ direction: 'left', optional: false },
			{ direction: 'left', optional: true },
			{ direction: 'across', optional: true },
			{ direction: 'right', optional: true },
			{ direction: 'courtesy', optional: true }
		];
	}

	canClaimForExposure(state: GameState, discard: Tile): ClaimOption[] {
		// Flowers and jokers are never claimable. You must hold at least one natural copy of the
		// discard — a group can't be conjured from the discard plus jokers alone — and jokers may
		// only fill the remaining slots of a pung/kong (never a pair/single, but those aren't
		// claimable anyway).
		if (discard.kind === 'flower' || discard.kind === 'joker') return [];
		const hand = state.self.hand;
		const naturals = countTile(hand, discard);
		if (naturals < 1) return [];
		const jokers = countTile(hand, { kind: 'joker' });

		const options: ClaimOption[] = [];
		if (naturals + jokers >= 2) {
			options.push({ kind: 'pung', tile: discard, jokersNeeded: Math.max(0, 2 - naturals) });
		}
		if (naturals + jokers >= 3) {
			options.push({ kind: 'kong', tile: discard, jokersNeeded: Math.max(0, 3 - naturals) });
		}
		return options;
	}

	isLegalExposure(tiles: Tile[], claimedTile: Tile, _state: GameState): boolean {
		if (claimedTile.kind === 'flower' || claimedTile.kind === 'joker') return false;
		if (tiles.length !== 3 && tiles.length !== 4) return false; // pung or kong only
		const naturals = tiles.filter((t) => t.kind !== 'joker');
		if (naturals.length === 0) return false; // an all-joker exposure is illegal
		// Every natural tile must be the claimed tile (no chows in American mahjong); the claimed
		// tile itself must appear among them.
		if (!naturals.every((t) => tileEquals(t, claimedTile))) return false;
		return naturals.some((t) => tileEquals(t, claimedTile));
	}

	isLegalMahjong(state: GameState, opts: MahjongCheckOptions = {}): boolean {
		if (opts.fromDiscard) {
			// You can't claim a discarded joker, and the claimed tile becomes the 14th — add it to
			// the hand and ask whether some pattern is now complete. Joker-as-pair is already
			// rejected by the matcher (only groups of 3+ accept jokers).
			if (opts.fromDiscard.kind === 'joker') return false;
			const augmented: GameState = {
				...state,
				self: { ...state.self, hand: [...state.self.hand, opts.fromDiscard] }
			};
			return this.isWinningHand(augmented);
		}
		return this.isWinningHand(state);
	}
}

export const nmjl2026 = new NMJLRuleset();
