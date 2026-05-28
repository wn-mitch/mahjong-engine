// How number-tile suits are drawn: traditional tile-face icons (the default, recolored two-tone into
// the suit palette), CJK suit-marks (萬/索/筒), or Western American labels (crak/bam/dot). Like
// themeStore, this is a genuinely global, client-only preference and the app is a static SPA
// (ssr = false), so a module-level runes singleton is safe — no per-request server state.

export type TileStyle = 'cjk' | 'western' | 'icon';

const ORDER: readonly TileStyle[] = ['icon', 'cjk', 'western'];

export function resolveInitialTileStyle(stored: string | null): TileStyle {
	if (stored === 'cjk' || stored === 'western' || stored === 'icon') return stored;
	return 'icon';
}

export function nextTileStyle(current: TileStyle): TileStyle {
	return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

function detectInitial(): TileStyle {
	try {
		return resolveInitialTileStyle(localStorage.getItem('tile-style'));
	} catch {
		// storage unavailable (private mode, etc.)
		return 'icon';
	}
}

let current = $state<TileStyle>(detectInitial());

function set(style: TileStyle) {
	current = style;
	try {
		localStorage.setItem('tile-style', style);
	} catch {
		// storage unavailable — in-memory state still works for the session
	}
}

function cycle() {
	set(nextTileStyle(current));
}

export const tileStyleStore = {
	get style(): TileStyle {
		return current;
	},
	set,
	cycle
};
