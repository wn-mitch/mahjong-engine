import type { GameState } from '../../engine/gameState';
import type {
	Ruleset,
	TargetEvaluation,
	TargetHand,
	TileSuggestion
} from '../../engine/ruleset';

export class ChineseTraditionalRuleset implements Ruleset {
	readonly id = 'chinese-traditional';
	readonly name = 'Chinese Traditional';
	readonly version = '0.1.0';

	evaluateTargets(_state: GameState): TargetEvaluation[] {
		return [];
	}

	isWinningHand(_state: GameState): boolean {
		return false;
	}

	suggestDiscard(_state: GameState, _target?: TargetHand): TileSuggestion {
		return { discard: null, rationale: 'not implemented' };
	}
}

export const chineseTraditional = new ChineseTraditionalRuleset();
