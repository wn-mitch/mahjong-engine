import type { TargetHand } from '../../engine/ruleset';
import type { Dragon, Wind } from '../../engine/tiles';

export type SuitVar = 'A' | 'B' | 'C';
export type NumVar = 'X' | 'Y';
export type DragonVar = 'D1' | 'D2';

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type TileSpec =
	| { kind: 'num'; suit: SuitVar; rank: Rank }
	| { kind: 'numVar'; suit: SuitVar; numVar: NumVar; offset?: number }
	| { kind: 'wind'; wind: Wind }
	| { kind: 'dragon'; dragon: Dragon }
	| { kind: 'dragonMatch'; suit: SuitVar; relation: 'same' | 'opp' }
	| { kind: 'dragonVar'; var: DragonVar }
	| { kind: 'flower' };

export type GroupKind = 'single' | 'pair' | 'pung' | 'kong' | 'quint' | 'sextet';

export const GROUP_SIZE: Record<GroupKind, number> = {
	single: 1,
	pair: 2,
	pung: 3,
	kong: 4,
	quint: 5,
	sextet: 6
};

export interface Group {
	kind: GroupKind;
	tile: TileSpec;
}

export interface NMJLConstraints {
	suitVars: SuitVar[];
	distinctSuits?: { min: number; max: number };
	numberDomains?: Partial<Record<NumVar, number[]>>;
	windDomain?: Wind[];
	dragonsAllSame?: boolean;
}

export type NMJLSection =
	| '2026'
	| '2468'
	| 'like-numbers'
	| 'quints'
	| 'consecutive-run'
	| '13579'
	| 'winds-dragons'
	| '369'
	| 'singles-and-pairs';

export interface NMJLHand extends TargetHand {
	id: string;
	section: NMJLSection;
	pattern: string;
	suitConstraint: string;
	groups: Group[];
	constraints: NMJLConstraints;
	concealed: boolean;
	value: number;
	jokerFriendly?: boolean;
}

// --- builder helpers (kept terse on purpose) ---

const num = (suit: SuitVar, rank: Rank): TileSpec => ({ kind: 'num', suit, rank });
const nv = (suit: SuitVar, v: NumVar, offset = 0): TileSpec => ({
	kind: 'numVar',
	suit,
	numVar: v,
	offset
});
const w = (wind: Wind): TileSpec => ({ kind: 'wind', wind });
const dr = (dragon: Dragon): TileSpec => ({ kind: 'dragon', dragon });
const dm = (suit: SuitVar, relation: 'same' | 'opp' = 'same'): TileSpec => ({
	kind: 'dragonMatch',
	suit,
	relation
});
const dv = (v: DragonVar): TileSpec => ({ kind: 'dragonVar', var: v });
const fl = (): TileSpec => ({ kind: 'flower' });

const single = (tile: TileSpec): Group => ({ kind: 'single', tile });
const pair = (tile: TileSpec): Group => ({ kind: 'pair', tile });
const pung = (tile: TileSpec): Group => ({ kind: 'pung', tile });
const kong = (tile: TileSpec): Group => ({ kind: 'kong', tile });
const quint = (tile: TileSpec): Group => ({ kind: 'quint', tile });
const sextet = (tile: TileSpec): Group => ({ kind: 'sextet', tile });

function hand(h: Omit<NMJLHand, 'rulesetId' | 'description'>): NMJLHand {
	return {
		...h,
		rulesetId: 'nmjl-2026',
		description: `${h.pattern} — ${h.suitConstraint}`
	};
}

const NEWS: Group[] = [single(w('N')), single(w('E')), single(w('W')), single(w('S'))];

// --- 2026 (X 25-30) ---

const section2026: NMJLHand[] = [
	hand({
		id: '2026-1',
		section: '2026',
		pattern: '222 000 2222 6666',
		suitConstraint: 'Any 2 Suits',
		groups: [pung(num('A', 2)), pung(dr('white')), kong(num('B', 2)), kong(num('C', 6))],
		constraints: { suitVars: ['A', 'B', 'C'], distinctSuits: { min: 2, max: 2 } },
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: '2026-2',
		section: '2026',
		pattern: '2026 DDD 2222 DDD',
		suitConstraint: '2 Suits, Matching Dragons, Kong 2 or 6',
		groups: [
			single(num('A', 2)),
			single(dr('white')),
			single(num('A', 2)),
			single(num('B', 6)),
			pung(dm('A')),
			kong(nv('A', 'X')),
			pung(dm('B'))
		],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 2, max: 2 },
			numberDomains: { X: [2, 6] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '2026-3',
		section: '2026',
		pattern: 'FFF 2026 222 6666',
		suitConstraint: 'Any 3 Suits',
		groups: [
			pung(fl()),
			single(num('A', 2)),
			single(dr('white')),
			single(num('B', 2)),
			single(num('C', 6)),
			pung(num('A', 2)),
			kong(num('C', 6))
		],
		constraints: { suitVars: ['A', 'B', 'C'], distinctSuits: { min: 3, max: 3 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '2026-4',
		section: '2026',
		pattern: '22 00 222 666 NEWS',
		suitConstraint: 'Any 2 Suits',
		groups: [
			pair(num('A', 2)),
			pair(dr('white')),
			pung(num('A', 2)),
			pung(num('B', 6)),
			...NEWS
		],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 2, max: 2 } },
		concealed: false,
		value: 25
	})
];

// --- 2468 (X 25-30, one C) ---

const section2468: NMJLHand[] = [
	hand({
		id: '2468-1',
		section: '2468',
		pattern: '222 444 6666 8888',
		suitConstraint: '1 or 2 Suits',
		groups: [pung(num('A', 2)), pung(num('A', 4)), kong(num('B', 6)), kong(num('B', 8))],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 1, max: 2 } },
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: '2468-2',
		section: '2468',
		pattern: 'FF 2222 44 66 8888',
		suitConstraint: '2 Suits',
		groups: [
			pair(fl()),
			kong(num('A', 2)),
			pair(num('A', 4)),
			pair(num('B', 6)),
			kong(num('B', 8))
		],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 2, max: 2 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '2468-3',
		section: '2468',
		pattern: 'EE 22 444 666 88 WW',
		suitConstraint: '1 Suit, East/West Only',
		groups: [
			pair(w('E')),
			pair(num('A', 2)),
			pung(num('A', 4)),
			pung(num('A', 6)),
			pair(num('A', 8)),
			pair(w('W'))
		],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			windDomain: ['E', 'W']
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '2468-4',
		section: '2468',
		pattern: '2222 DDD 8888 DDD',
		suitConstraint: '2 Suits w Matching Dragons',
		groups: [kong(num('A', 2)), pung(dm('A')), kong(num('B', 8)), pung(dm('B'))],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 2, max: 2 } },
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: '2468-5',
		section: '2468',
		pattern: 'FFF 22 44 666 8888',
		suitConstraint: 'Any 1 Suit',
		groups: [
			pung(fl()),
			pair(num('A', 2)),
			pair(num('A', 4)),
			pung(num('A', 6)),
			kong(num('A', 8))
		],
		constraints: { suitVars: ['A'], distinctSuits: { min: 1, max: 1 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '2468-6',
		section: '2468',
		pattern: '2468 2222 D 2222 D',
		suitConstraint: '3 Suits, Like Kongs 2/4/6/8 w Matching Dragon',
		groups: [
			single(num('A', 2)),
			single(num('A', 4)),
			single(num('A', 6)),
			single(num('A', 8)),
			kong(nv('B', 'X')),
			single(dm('B')),
			kong(nv('C', 'X')),
			single(dm('C'))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [2, 4, 6, 8] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '2468-7',
		section: '2468',
		pattern: 'FFF 2468 FFF 2222',
		suitConstraint: '2 Suits, Kong 2/4/6/8',
		groups: [
			pung(fl()),
			single(num('A', 2)),
			single(num('A', 4)),
			single(num('A', 6)),
			single(num('A', 8)),
			pung(fl()),
			kong(nv('B', 'X'))
		],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 2, max: 2 },
			numberDomains: { X: [2, 4, 6, 8] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '2468-8',
		section: '2468',
		pattern: 'FF 246 888 246 888',
		suitConstraint: '2 Suits',
		groups: [
			pair(fl()),
			single(num('A', 2)),
			single(num('A', 4)),
			single(num('A', 6)),
			pung(num('A', 8)),
			single(num('B', 2)),
			single(num('B', 4)),
			single(num('B', 6)),
			pung(num('B', 8))
		],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 2, max: 2 } },
		concealed: true,
		value: 30
	})
];

// --- Any Like Numbers (X 25-30) ---

const sectionLikeNumbers: NMJLHand[] = [
	hand({
		id: 'like-1',
		section: 'like-numbers',
		pattern: '1111 FFFFFF 1111',
		suitConstraint: 'Any 2 Suits',
		groups: [kong(nv('A', 'X')), sextet(fl()), kong(nv('B', 'X'))],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 2, max: 2 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
		},
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'like-2',
		section: 'like-numbers',
		pattern: '1111 D 111 D 1111 D',
		suitConstraint: '3 Suits w Matching Dragon',
		groups: [
			kong(nv('A', 'X')),
			single(dm('A')),
			pung(nv('B', 'X')),
			single(dm('B')),
			kong(nv('C', 'X')),
			single(dm('C'))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: 'like-3',
		section: 'like-numbers',
		pattern: 'FF 1111 11 1111 DD',
		suitConstraint: '3 Suits w Any Dragon',
		groups: [
			pair(fl()),
			kong(nv('A', 'X')),
			pair(nv('B', 'X')),
			kong(nv('C', 'X')),
			pair(dv('D1'))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
		},
		concealed: false,
		value: 25
	})
];

// --- Quints (X 40-45) ---

const sectionQuints: NMJLHand[] = [
	hand({
		id: 'quints-1',
		section: 'quints',
		pattern: '11111 1111 11111',
		suitConstraint: '3 Suits, Like Nos',
		groups: [quint(nv('A', 'X')), kong(nv('B', 'X')), quint(nv('C', 'X'))],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
		},
		concealed: false,
		value: 40,
		jokerFriendly: true
	}),
	hand({
		id: 'quints-2',
		section: 'quints',
		pattern: 'FF 11111 22 33333',
		suitConstraint: '1 Suit, 3 Consec',
		groups: [
			pair(fl()),
			quint(nv('A', 'X')),
			pair(nv('A', 'X', 1)),
			quint(nv('A', 'X', 2))
		],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7] }
		},
		concealed: false,
		value: 40
	}),
	hand({
		id: 'quints-3',
		section: 'quints',
		pattern: '11111 44444 DDDD',
		suitConstraint: '1 Suit w Opp Dragon',
		groups: [quint(nv('A', 'X')), quint(nv('A', 'Y')), kong(dm('A', 'opp'))],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			numberDomains: {
				X: [1, 2, 3, 4, 5, 6, 7, 8, 9],
				Y: [1, 2, 3, 4, 5, 6, 7, 8, 9]
			}
		},
		concealed: false,
		value: 40,
		jokerFriendly: true
	})
];

// --- Consecutive Run (X 25-35, one C) ---
// Encoded with NumVar X as the starting rank; the matcher's domain bounds keep the
// run within 1..9. Multi-number runs use consecutive-rank ranges directly (X..X+k).

const sectionConsec: NMJLHand[] = [
	hand({
		id: 'consec-1',
		section: 'consecutive-run',
		pattern: '11 222 33 444 5555',
		suitConstraint: '1 Suit, These Nos',
		groups: [
			pair(nv('A', 'X')),
			pung(nv('A', 'X', 1)),
			pair(nv('A', 'X', 2)),
			pung(nv('A', 'X', 3)),
			kong(nv('A', 'X', 4))
		],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			numberDomains: { X: [1, 5] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: 'consec-2',
		section: 'consecutive-run',
		pattern: 'FFF 1111 234 5555',
		suitConstraint: '1 or 2 Suits, 5 Consec',
		groups: [
			pung(fl()),
			kong(nv('A', 'X')),
			single(nv('B', 'X', 1)),
			single(nv('B', 'X', 2)),
			single(nv('B', 'X', 3)),
			kong(nv('B', 'X', 4))
		],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 1, max: 2 },
			numberDomains: { X: [1, 2, 3, 4, 5] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: 'consec-3',
		section: 'consecutive-run',
		pattern: '11 22 111 222 3333',
		suitConstraint: '3 Suits, 3 Consec',
		groups: [
			pair(nv('A', 'X')),
			pair(nv('A', 'X', 1)),
			pung(nv('B', 'X')),
			pung(nv('B', 'X', 1)),
			kong(nv('C', 'X', 2))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: 'consec-4',
		section: 'consecutive-run',
		pattern: '111 222 3333 4444',
		suitConstraint: '1 or 2 Suits, 4 Consec',
		groups: [
			pung(nv('A', 'X')),
			pung(nv('A', 'X', 1)),
			kong(nv('B', 'X', 2)),
			kong(nv('B', 'X', 3))
		],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 1, max: 2 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6] }
		},
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'consec-5',
		section: 'consecutive-run',
		pattern: 'FFF 11 22 333 DDDD',
		suitConstraint: '1 or 2 Suits, Ds Match Middle No',
		groups: [
			pung(fl()),
			pair(nv('A', 'X')),
			pair(nv('A', 'X', 1)),
			pung(nv('A', 'X', 2)),
			kong(dm('A'))
		],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 2 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: 'consec-6',
		section: 'consecutive-run',
		pattern: '1111 FFFFFF 2222',
		suitConstraint: '1 Suit, 2 Consec',
		groups: [kong(nv('A', 'X')), sextet(fl()), kong(nv('A', 'X', 1))],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7, 8] }
		},
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'consec-7',
		section: 'consecutive-run',
		pattern: 'FF 1111 2222 3333',
		suitConstraint: '1 or 3 Suits, 3 Consec',
		groups: [
			pair(fl()),
			kong(nv('A', 'X')),
			kong(nv('B', 'X', 1)),
			kong(nv('C', 'X', 2))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 1, max: 3 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6, 7] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: 'consec-8',
		section: 'consecutive-run',
		pattern: '1 22 333 1 22 333 44',
		suitConstraint: '3 Suits, 4 Consec',
		groups: [
			single(nv('A', 'X')),
			pair(nv('A', 'X', 1)),
			pung(nv('A', 'X', 2)),
			single(nv('B', 'X')),
			pair(nv('B', 'X', 1)),
			pung(nv('B', 'X', 2)),
			pair(nv('C', 'X', 3))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 2, 3, 4, 5, 6] }
		},
		concealed: true,
		value: 35
	})
];

// --- 13579 (X 25-30, two C) ---

const section13579: NMJLHand[] = [
	hand({
		id: '13579-1',
		section: '13579',
		pattern: '11 333 55 777 9999',
		suitConstraint: '1 or 3 Suits',
		groups: [
			pair(num('A', 1)),
			pung(num('A', 3)),
			pair(num('B', 5)),
			pung(num('B', 7)),
			kong(num('C', 9))
		],
		constraints: { suitVars: ['A', 'B', 'C'], distinctSuits: { min: 1, max: 3 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '13579-2',
		section: '13579',
		pattern: '111 333 3333 5555',
		suitConstraint: '2 Suits',
		groups: [
			pung(nv('A', 'X')),
			pung(nv('A', 'X', 2)),
			kong(nv('B', 'X', 2)),
			kong(nv('B', 'X', 4))
		],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 2, max: 2 },
			numberDomains: { X: [1, 5] }
		},
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: '13579-3',
		section: '13579',
		pattern: 'NN 1111 33 5555 SS',
		suitConstraint: '1 Suit, N/S Only',
		groups: [
			pair(w('N')),
			kong(nv('A', 'X')),
			pair(nv('A', 'X', 2)),
			kong(nv('A', 'X', 4)),
			pair(w('S'))
		],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			windDomain: ['N', 'S'],
			numberDomains: { X: [1, 5] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '13579-4',
		section: '13579',
		pattern: '113579 1111 1111',
		suitConstraint: '3 Suits, Pair Any Odd, Kongs Match',
		groups: [
			single(num('A', 1)),
			single(num('A', 3)),
			single(num('A', 5)),
			single(num('A', 7)),
			single(num('A', 9)),
			single(nv('A', 'X')),
			kong(nv('B', 'Y')),
			kong(nv('C', 'Y'))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 3, 5, 7, 9], Y: [1, 3, 5, 7, 9] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '13579-5',
		section: '13579',
		pattern: 'FFF 11 33 555 DDDD',
		suitConstraint: '1 Suit w Matching Dragon',
		groups: [
			pung(fl()),
			pair(nv('A', 'X')),
			pair(nv('A', 'X', 2)),
			pung(nv('A', 'X', 4)),
			kong(dm('A'))
		],
		constraints: {
			suitVars: ['A'],
			distinctSuits: { min: 1, max: 1 },
			numberDomains: { X: [1, 5] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '13579-6',
		section: '13579',
		pattern: '11 33 111 333 5555',
		suitConstraint: 'Any 3 Suits',
		groups: [
			pair(nv('A', 'X')),
			pair(nv('A', 'X', 2)),
			pung(nv('B', 'X')),
			pung(nv('B', 'X', 2)),
			kong(nv('C', 'X', 4))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [1, 5] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '13579-7',
		section: '13579',
		pattern: '1111 33 55 77 9999',
		suitConstraint: '1 or 2 Suits',
		groups: [
			kong(num('A', 1)),
			pair(num('A', 3)),
			pair(num('B', 5)),
			pair(num('B', 7)),
			kong(num('B', 9))
		],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 1, max: 2 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '13579-8',
		section: '13579',
		pattern: 'FF 11 33 55 111 111',
		suitConstraint: '3 Suits, These Nos',
		groups: [
			pair(fl()),
			pair(num('A', 1)),
			pair(num('A', 3)),
			pair(num('A', 5)),
			pung(num('B', 1)),
			pung(num('C', 1))
		],
		constraints: { suitVars: ['A', 'B', 'C'], distinctSuits: { min: 3, max: 3 } },
		concealed: true,
		value: 35
	}),
	hand({
		id: '13579-9',
		section: '13579',
		pattern: 'FF 135 777 999 DDD',
		suitConstraint: '1 Suit w Opp Dragon',
		groups: [
			pair(fl()),
			single(num('A', 1)),
			single(num('A', 3)),
			single(num('A', 5)),
			pung(num('A', 7)),
			pung(num('A', 9)),
			pung(dm('A', 'opp'))
		],
		constraints: { suitVars: ['A'], distinctSuits: { min: 1, max: 1 } },
		concealed: true,
		value: 30
	})
];

// --- Winds-Dragons (X 25, one C) ---

const sectionWindsDragons: NMJLHand[] = [
	hand({
		id: 'wd-1',
		section: 'winds-dragons',
		pattern: 'NNNN EEE WWW SSSS',
		suitConstraint: '—',
		groups: [kong(w('N')), pung(w('E')), pung(w('W')), kong(w('S'))],
		constraints: { suitVars: [] },
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'wd-2',
		section: 'winds-dragons',
		pattern: '1234 DDD DDD DDDD',
		suitConstraint: '1 Suit, 3 Dragons',
		groups: [
			single(num('A', 1)),
			single(num('A', 2)),
			single(num('A', 3)),
			single(num('A', 4)),
			pung(dr('red')),
			pung(dr('green')),
			kong(dr('white'))
		],
		constraints: { suitVars: ['A'], distinctSuits: { min: 1, max: 1 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: 'wd-3',
		section: 'winds-dragons',
		pattern: 'NNN 1111 1111 SSS',
		suitConstraint: 'Any Like Odd Nos in 2 Suits',
		groups: [pung(w('N')), kong(nv('A', 'X')), kong(nv('B', 'X')), pung(w('S'))],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 2, max: 2 },
			numberDomains: { X: [1, 3, 5, 7, 9] }
		},
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'wd-4',
		section: 'winds-dragons',
		pattern: 'EEE 2222 2222 WWW',
		suitConstraint: 'Any Like Even Nos in 2 Suits',
		groups: [pung(w('E')), kong(nv('A', 'X')), kong(nv('B', 'X')), pung(w('W'))],
		constraints: {
			suitVars: ['A', 'B'],
			distinctSuits: { min: 2, max: 2 },
			numberDomains: { X: [2, 4, 6, 8] }
		},
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'wd-5',
		section: 'winds-dragons',
		pattern: 'FFF NNNN FFF DDDD',
		suitConstraint: 'Any Wind, Any Dragon',
		groups: [pung(fl()), kong(w('N')), pung(fl()), kong(dv('D1'))],
		constraints: { suitVars: [] },
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: 'wd-6',
		section: 'winds-dragons',
		pattern: '1 N 2 EE 3 WWW 4 SSSS',
		suitConstraint: '1 Suit, These Nos',
		groups: [
			single(num('A', 1)),
			single(w('N')),
			single(num('A', 2)),
			pair(w('E')),
			single(num('A', 3)),
			pung(w('W')),
			single(num('A', 4)),
			kong(w('S'))
		],
		constraints: { suitVars: ['A'], distinctSuits: { min: 1, max: 1 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: 'wd-7',
		section: 'winds-dragons',
		pattern: 'FF NNNN SSSS DD DD',
		suitConstraint: '2 Dragons',
		groups: [pair(fl()), kong(w('N')), kong(w('S')), pair(dv('D1')), pair(dv('D2'))],
		constraints: { suitVars: [] },
		concealed: false,
		value: 25
	}),
	hand({
		id: 'wd-8',
		section: 'winds-dragons',
		pattern: 'NN EEE 2026 WWW SS',
		suitConstraint: '2026 Any 1 Suit',
		groups: [
			pair(w('N')),
			pung(w('E')),
			single(num('A', 2)),
			single(dr('white')),
			single(num('A', 2)),
			single(num('A', 6)),
			pung(w('W')),
			pair(w('S'))
		],
		constraints: { suitVars: ['A'], distinctSuits: { min: 1, max: 1 } },
		concealed: true,
		value: 30
	})
];

// --- 369 (X 25-30, one C) ---

const section369: NMJLHand[] = [
	hand({
		id: '369-1',
		section: '369',
		pattern: '333 666 6666 9999',
		suitConstraint: '2 or 3 Suits',
		groups: [pung(num('A', 3)), pung(num('B', 6)), kong(num('B', 6)), kong(num('C', 9))],
		constraints: { suitVars: ['A', 'B', 'C'], distinctSuits: { min: 2, max: 3 } },
		concealed: false,
		value: 25,
		jokerFriendly: true
	}),
	hand({
		id: '369-2',
		section: '369',
		pattern: '33 66 333 666 9999',
		suitConstraint: '3 Suits',
		groups: [
			pair(num('A', 3)),
			pair(num('A', 6)),
			pung(num('B', 3)),
			pung(num('B', 6)),
			kong(num('C', 9))
		],
		constraints: { suitVars: ['A', 'B', 'C'], distinctSuits: { min: 3, max: 3 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '369-3',
		section: '369',
		pattern: 'FFF 33 666 99 DDDD',
		suitConstraint: '1 Suit w Matching/Opp Dragon',
		groups: [
			pung(fl()),
			pair(num('A', 3)),
			pung(num('A', 6)),
			pair(num('A', 9)),
			kong(dv('D1'))
		],
		constraints: { suitVars: ['A'], distinctSuits: { min: 1, max: 1 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '369-4',
		section: '369',
		pattern: '33 66 666 999 NEWS',
		suitConstraint: '2 Suits',
		groups: [
			pair(num('A', 3)),
			pair(num('A', 6)),
			pung(num('B', 6)),
			pung(num('B', 9)),
			...NEWS
		],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 2, max: 2 } },
		concealed: false,
		value: 25
	}),
	hand({
		id: '369-5',
		section: '369',
		pattern: 'FF 3369 3333 3333',
		suitConstraint: '3 Suits, Pair 3/6/9, Kongs Match',
		groups: [
			pair(fl()),
			single(nv('A', 'X')),
			single(num('A', 3)),
			single(num('A', 6)),
			single(num('A', 9)),
			kong(nv('B', 'Y')),
			kong(nv('C', 'Y'))
		],
		constraints: {
			suitVars: ['A', 'B', 'C'],
			distinctSuits: { min: 3, max: 3 },
			numberDomains: { X: [3, 6, 9], Y: [3, 6, 9] }
		},
		concealed: false,
		value: 25
	}),
	hand({
		id: '369-6',
		section: '369',
		pattern: 'FF 333 666 999 369',
		suitConstraint: '2 Suits',
		groups: [
			pair(fl()),
			pung(num('A', 3)),
			pung(num('A', 6)),
			pung(num('A', 9)),
			single(num('B', 3)),
			single(num('B', 6)),
			single(num('B', 9))
		],
		constraints: { suitVars: ['A', 'B'], distinctSuits: { min: 2, max: 2 } },
		concealed: true,
		value: 30
	})
];

// Singles-and-pairs section: all concealed per the strategy doc — encoded as empty.
// Future scored play can populate this section without changing the engine surface.
const sectionSinglesPairs: NMJLHand[] = [];

export const HANDS: NMJLHand[] = [
	...section2026,
	...section2468,
	...sectionLikeNumbers,
	...sectionQuints,
	...sectionConsec,
	...section13579,
	...sectionWindsDragons,
	...section369,
	...sectionSinglesPairs
];

