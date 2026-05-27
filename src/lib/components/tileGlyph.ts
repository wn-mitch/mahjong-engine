// Maps a Tile to a vendored riichi tile-face SVG (FluffyStuff, CC0) and recolors it
// two-tone so it sits inside the flat paper tile box: the figure becomes the suit
// color (via currentColor on the wrapping element) and white areas become the tile
// face token, so background-white reads as the paper face while foreground-white
// detail reads as a paper-toned highlight over the colored figure.

import type { Tile } from '$lib/engine/tiles';

const RAW = import.meta.glob('$lib/assets/tiles/riichi/*.svg', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

// Index the glob by bare filename (e.g. "Man3") rather than full path.
const BY_NAME: Record<string, string> = {};
for (const [path, svg] of Object.entries(RAW)) {
	const name = path.split('/').pop()?.replace(/\.svg$/, '');
	if (name) BY_NAME[name] = svg;
}

const SUIT_PREFIX = { crack: 'Man', bamboo: 'Sou', dot: 'Pin' } as const;
const WIND_NAME = { E: 'Ton', S: 'Nan', W: 'Shaa', N: 'Pei' } as const;
const DRAGON_NAME = { red: 'Chun', green: 'Hatsu', white: 'Haku' } as const;

/** Filename (no extension) of the riichi glyph for a tile, or null if none exists. */
export function glyphKey(tile: Tile): string | null {
	switch (tile.kind) {
		case 'number':
			return `${SUIT_PREFIX[tile.suit]}${tile.rank}`;
		case 'wind':
			return WIND_NAME[tile.wind];
		case 'dragon':
			return DRAGON_NAME[tile.dragon];
		default:
			return null; // flowers, jokers — no riichi equivalent
	}
}

const WHITE = /(fill|stroke):#(?:fff|ffffff)\b/gi;
const HEX = /(fill|stroke):#[0-9a-f]{3,6}\b/gi;
const ATTR_WHITE = /(fill|stroke)="#(?:fff|ffffff)"/gi;
const ATTR_HEX = /(fill|stroke)="#[0-9a-f]{3,6}"/gi;

/**
 * Two-tone recolor: white → the tile face token; every other solid color →
 * currentColor. `none` and the unused gradient defs are left alone. Strips the
 * root svg width/height so it scales to its wrapper (viewBox is preserved).
 */
export function recolorTwoTone(svg: string): string {
	const recolored = svg
		.replace(WHITE, '$1:var(--color-bg-raised)')
		.replace(HEX, '$1:currentColor')
		.replace(ATTR_WHITE, '$1="var(--color-bg-raised)"')
		.replace(ATTR_HEX, '$1="currentColor"');

	// Strip width/height only from the opening <svg ...> tag.
	return recolored.replace(/<svg\b[^>]*>/, (tag) =>
		tag.replace(/\s(?:width|height)="[^"]*"/g, '')
	);
}

const CACHE = new Map<string, string>();

/** Recolored SVG markup for a tile, or null if the tile has no glyph. */
export function tileGlyphSvg(tile: Tile): string | null {
	const key = glyphKey(tile);
	if (!key) return null;
	const raw = BY_NAME[key];
	if (!raw) return null;
	let out = CACHE.get(key);
	if (out === undefined) {
		out = recolorTwoTone(raw);
		CACHE.set(key, out);
	}
	return out;
}
