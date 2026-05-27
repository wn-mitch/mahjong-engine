// How number-tile suits are drawn: CJK suit-marks (萬/索/筒, the default), Western American labels
// (crak/bam/dot), or flat suit icons. Like themeStore, this is a genuinely global, client-only
// preference and the app is a static SPA (ssr = false), so a module-level runes singleton is safe —
// no per-request server state.

export type TileStyle = 'cjk' | 'western' | 'icon';

const ORDER: readonly TileStyle[] = ['cjk', 'western', 'icon'];

export function resolveInitialTileStyle(stored: string | null): TileStyle {
	if (stored === 'cjk' || stored === 'western' || stored === 'icon') return stored;
	return 'cjk';
}

export function nextTileStyle(current: TileStyle): TileStyle {
	return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

function detectInitial(): TileStyle {
	try {
		return resolveInitialTileStyle(localStorage.getItem('tile-style'));
	} catch {
		// storage unavailable (private mode, etc.)
		return 'cjk';
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
