import type { GameState } from '../../engine/gameState';
import type {
	Ruleset,
	TargetEvaluation,
	TargetHand,
	TileSuggestion
} from '../../engine/ruleset';
import { HANDS } from './hands';

export class NMJLRuleset implements Ruleset {
	readonly id = 'nmjl-2026';
	readonly name = 'American NMJL 2026';
	readonly version = '2026.0.0';

	get hands() {
		return HANDS;
	}

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

export const nmjl2026 = new NMJLRuleset();
