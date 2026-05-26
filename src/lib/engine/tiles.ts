export type Suit = 'crack' | 'bamboo' | 'dot';
export type Wind = 'N' | 'E' | 'W' | 'S';
export type Dragon = 'red' | 'green' | 'white';

export type NumberTile = { kind: 'number'; suit: Suit; rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
export type WindTile = { kind: 'wind'; wind: Wind };
export type DragonTile = { kind: 'dragon'; dragon: Dragon };
export type FlowerTile = { kind: 'flower'; index?: number };
export type JokerTile = { kind: 'joker' };

export type Tile = NumberTile | WindTile | DragonTile | FlowerTile | JokerTile;

export function tileEquals(a: Tile, b: Tile): boolean {
	if (a.kind !== b.kind) return false;
	switch (a.kind) {
		case 'number':
			return a.suit === (b as NumberTile).suit && a.rank === (b as NumberTile).rank;
		case 'wind':
			return a.wind === (b as WindTile).wind;
		case 'dragon':
			return a.dragon === (b as DragonTile).dragon;
		case 'flower':
		case 'joker':
			return true;
	}
}

export function tileToString(t: Tile): string {
	switch (t.kind) {
		case 'number':
			return `${t.rank}${t.suit[0].toUpperCase()}`;
		case 'wind':
			return t.wind;
		case 'dragon':
			return `${t.dragon[0].toUpperCase()}d`;
		case 'flower':
			return 'F';
		case 'joker':
			return 'J';
	}
}

export function countTile(tiles: Tile[], target: Tile): number {
	return tiles.filter((t) => tileEquals(t, target)).length;
}

export function multisetDiff(have: Tile[], need: Tile[]): { missing: Tile[]; leftover: Tile[] } {
	const remaining = [...have];
	const missing: Tile[] = [];
	for (const t of need) {
		const idx = remaining.findIndex((r) => tileEquals(r, t));
		if (idx === -1) missing.push(t);
		else remaining.splice(idx, 1);
	}
	return { missing, leftover: remaining };
}

const SUITS: Suit[] = ['crack', 'bamboo', 'dot'];
const WINDS: Wind[] = ['N', 'E', 'S', 'W'];
const DRAGONS: Dragon[] = ['red', 'green', 'white'];

export function fullTilePool(): Tile[] {
	const pool: Tile[] = [];
	for (const suit of SUITS) {
		for (let rank = 1; rank <= 9; rank++) {
			for (let i = 0; i < 4; i++) {
				pool.push({ kind: 'number', suit, rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
			}
		}
	}
	for (const wind of WINDS) {
		for (let i = 0; i < 4; i++) pool.push({ kind: 'wind', wind });
	}
	for (const dragon of DRAGONS) {
		for (let i = 0; i < 4; i++) pool.push({ kind: 'dragon', dragon });
	}
	for (let i = 0; i < 8; i++) pool.push({ kind: 'flower' });
	for (let i = 0; i < 8; i++) pool.push({ kind: 'joker' });
	return pool;
}

export function shuffleInPlace<T>(arr: T[], rand: () => number = Math.random): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

const SUIT_GROUP: Record<Suit, number> = { crack: 0, bamboo: 1, dot: 2 };
const WIND_ORDER: Record<Wind, number> = { E: 0, S: 1, W: 2, N: 3 };
const DRAGON_ORDER: Record<Dragon, number> = { red: 0, green: 1, white: 2 };

export function tileSortKey(t: Tile): [number, number] {
	switch (t.kind) {
		case 'number':
			return [SUIT_GROUP[t.suit], t.rank];
		case 'wind':
			return [3, WIND_ORDER[t.wind]];
		case 'dragon':
			return [4, DRAGON_ORDER[t.dragon]];
		case 'flower':
			return [5, 0];
		case 'joker':
			return [6, 0];
	}
}

export function compareTiles(a: Tile, b: Tile): number {
	const [ga, wa] = tileSortKey(a);
	const [gb, wb] = tileSortKey(b);
	return ga !== gb ? ga - gb : wa - wb;
}

// Canonical identity key — two tiles share a key iff `tileEquals` holds (flowers and
// jokers collapse to a single key apiece, matching their interchangeable comparison).
export function tileKey(t: Tile): string {
	switch (t.kind) {
		case 'number':
			return `n:${t.suit}:${t.rank}`;
		case 'wind':
			return `w:${t.wind}`;
		case 'dragon':
			return `d:${t.dragon}`;
		case 'flower':
			return 'F';
		case 'joker':
			return 'J';
	}
}

// How many physical copies of a tile exist in the full pool: 8 flowers, 8 jokers, 4 of
// everything else. The denominator for "how many are still unseen."
export function cap(t: Tile): number {
	return t.kind === 'flower' || t.kind === 'joker' ? 8 : 4;
}
