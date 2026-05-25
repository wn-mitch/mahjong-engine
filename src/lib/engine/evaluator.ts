import type { GameState } from './gameState';
import type { Ruleset, TargetEvaluation } from './ruleset';

export function evaluate(ruleset: Ruleset, state: GameState): TargetEvaluation[] {
	return ruleset.evaluateTargets(state).sort((a, b) => b.completionScore - a.completionScore);
}
