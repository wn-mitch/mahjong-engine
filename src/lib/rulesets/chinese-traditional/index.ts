import type { GameState } from '../../engine/gameState';
import type {
	CharlestonDirection,
	CharlestonPassSuggestion,
	CharlestonStep,
	ClaimOption,
	DealCounts,
	EvaluateOptions,
	GameRuleset,
	MahjongCheckOptions,
	TargetEvaluation,
	TargetHand,
	TileSuggestion,
	WinningHandOptions
} from '../../engine/ruleset';
import type { NumberTile, Tile } from '../../engine/tiles';
import { countTile, tileEquals } from '../../engine/tiles';
import { evaluateAll, isWinning } from './evaluator';
import { suggestDiscard as suggestDiscardImpl } from './discard';

export class ChineseTraditionalRuleset implements GameRuleset {
	readonly id = 'chinese-traditional';
	readonly name = 'Chinese (modern HK-style)';
	readonly version = '1.0.0';

	evaluateTargets(state: GameState, _opts: EvaluateOptions = {}): TargetEvaluation[] {
		// Chinese has no "concealed-only" archetype gate, so `includeConcealed` is ignored.
		return evaluateAll(state);
	}

	isWinningHand(state: GameState, _opts: WinningHandOptions = {}): boolean {
		// No minimum-points rule under this house variant: any structural completion wins.
		return isWinning(state);
	}

	suggestDiscard(state: GameState, target?: TargetHand): TileSuggestion {
		return suggestDiscardImpl(state, target);
	}

	suggestCharlestonPass(
		_state: GameState,
		_direction: CharlestonDirection
	): CharlestonPassSuggestion {
		// Chinese mahjong has no Charleston; the engine still calls this method on every
		// ruleset, so return an empty suggestion with a clear rationale.
		return {
			tiles: [],
			rationale: 'No Charleston in Chinese mahjong — play starts immediately after the deal.'
		};
	}

	dealCounts(): DealCounts {
		// East (dealer) is dealt 14 and opens play by discarding; everyone else gets 13.
		return { perSeat: 13, dealerExtra: 1 };
	}

	charlestonPlan(): CharlestonStep[] {
		// Empty plan signals "no charleston" to the live-play runner — play starts at the
		// dealer's first discard.
		return [];
	}

	canClaimForExposure(state: GameState, discard: Tile): ClaimOption[] {
		// Flowers/bonuses are never claimable. Jokers don't exist in this pool but reject
		// defensively in case a malformed state slips through.
		if (discard.kind === 'flower' || discard.kind === 'joker') return [];

		const hand = state.self.hand;
		const naturals = countTile(hand, discard);
		const options: ClaimOption[] = [];

		// Pung and kong are claimable regardless of which seat discarded.
		if (naturals >= 2) options.push({ kind: 'pung', tile: discard, jokersNeeded: 0 });
		if (naturals >= 3) options.push({ kind: 'kong', tile: discard, jokersNeeded: 0 });

		// Chow is claimable only when the discard came from the upstream seat (relative
		// position 'left' — the seat that would otherwise play just before this viewer).
		// `lastDiscarder` is populated by `seatView` while a claim window is open.
		if (discard.kind === 'number' && state.lastDiscarder === 'left') {
			for (const support of chowCompletions(hand, discard as NumberTile)) {
				options.push({ kind: 'chow', tile: discard, jokersNeeded: 0, support });
			}
		}

		return options;
	}

	isLegalExposure(tiles: Tile[], claimedTile: Tile, _state: GameState): boolean {
		if (claimedTile.kind === 'flower' || claimedTile.kind === 'joker') return false;
		if (tiles.some((t) => t.kind === 'joker' || t.kind === 'flower')) return false;
		if (!tiles.some((t) => tileEquals(t, claimedTile))) return false;

		if (tiles.length === 4) {
			// Kong: four of a kind, all equal to the claimed tile.
			return tiles.every((t) => tileEquals(t, claimedTile));
		}
		if (tiles.length === 3) {
			// Pung: three of a kind.
			if (tiles.every((t) => tileEquals(t, claimedTile))) return true;
			// Chow: three consecutive same-suit numbers including the claimed tile.
			if (tiles.every((t) => t.kind === 'number')) {
				const nums = (tiles as NumberTile[]).slice().sort((a, b) => a.rank - b.rank);
				const sameSuit = nums.every((n) => n.suit === nums[0].suit);
				const consecutive =
					nums[1].rank === nums[0].rank + 1 && nums[2].rank === nums[1].rank + 1;
				return sameSuit && consecutive;
			}
		}
		return false;
	}

	isLegalMahjong(state: GameState, opts: MahjongCheckOptions = {}): boolean {
		if (opts.fromDiscard) {
			if (opts.fromDiscard.kind === 'joker') return false;
			const augmented: GameState = {
				...state,
				self: { ...state.self, hand: [...state.self.hand, opts.fromDiscard] }
			};
			return isWinning(augmented);
		}
		return isWinning(state);
	}
}

// All ways a claimed number tile can complete a chow given the natural tiles in `hand`. Each
// completion is the *two* support tiles the claimant would pull from hand alongside the claim.
// Up to three completions exist (claimed as low, middle, or high tile of the sequence).
function chowCompletions(hand: Tile[], claimed: NumberTile): Tile[][] {
	const out: Tile[][] = [];
	const tileAt = (rank: number): NumberTile | null =>
		rank >= 1 && rank <= 9
			? { kind: 'number', suit: claimed.suit, rank: rank as NumberTile['rank'] }
			: null;
	const hasNatural = (t: NumberTile): boolean => hand.some((h) => tileEquals(h, t));

	const candidates: Array<[NumberTile | null, NumberTile | null]> = [
		[tileAt(claimed.rank + 1), tileAt(claimed.rank + 2)], // claimed is low
		[tileAt(claimed.rank - 1), tileAt(claimed.rank + 1)], // claimed is middle
		[tileAt(claimed.rank - 2), tileAt(claimed.rank - 1)] // claimed is high
	];

	for (const [a, b] of candidates) {
		if (a && b && hasNatural(a) && hasNatural(b)) out.push([a, b]);
	}
	return out;
}

export const chineseTraditional = new ChineseTraditionalRuleset();
