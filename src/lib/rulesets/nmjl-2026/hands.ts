import type { TargetHand } from '../../engine/ruleset';

export interface NMJLHand extends TargetHand {
	section:
		| '2026'
		| '2468'
		| 'like-numbers'
		| 'quints'
		| 'consecutive-run'
		| '13579'
		| 'winds-dragons'
		| '369'
		| 'singles-and-pairs';
	concealed: boolean;
	value: number;
	pattern: string;
	suitConstraint?: string;
}

export const HANDS: NMJLHand[] = [];
