export type Suit = 'bam' | 'crack' | 'dot';
export type Wind = 'N' | 'E' | 'W' | 'S';
export type Dragon = 'R' | 'G' | 'W';

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
			return `${t.dragon}d`;
		case 'flower':
			return 'F';
		case 'joker':
			return 'J';
	}
}

export function countTile(tiles: Tile[], target: Tile): number {
	return tiles.filter((t) => tileEquals(t, target)).length;
}
