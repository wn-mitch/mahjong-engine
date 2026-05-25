import { describe, it, expect } from 'vitest';
import { nmjl2026, chineseTraditional } from '../src/lib/rulesets';
import { emptyState } from '../src/lib/engine/gameState';
import type { Ruleset } from '../src/lib/engine/ruleset';

const rulesets: Ruleset[] = [nmjl2026, chineseTraditional];

describe('Ruleset interface conformance', () => {
	for (const r of rulesets) {
		describe(r.id, () => {
			it('has id, name, version', () => {
				expect(r.id).toBeTypeOf('string');
				expect(r.name).toBeTypeOf('string');
				expect(r.version).toBeTypeOf('string');
			});

			it('evaluateTargets returns an array', () => {
				const result = r.evaluateTargets(emptyState());
				expect(Array.isArray(result)).toBe(true);
			});

			it('isWinningHand returns a boolean', () => {
				const result = r.isWinningHand(emptyState());
				expect(typeof result).toBe('boolean');
			});

			it('suggestDiscard returns a TileSuggestion', () => {
				const result = r.suggestDiscard(emptyState());
				expect(result).toHaveProperty('discard');
				expect(result).toHaveProperty('rationale');
				expect(typeof result.rationale).toBe('string');
			});
		});
	}
});
