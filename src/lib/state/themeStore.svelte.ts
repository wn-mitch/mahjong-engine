// App-level color theme. The theme is genuinely global (not per-route) and the app is a static
// SPA (ssr = false), so a module-level runes singleton is safe — there is no per-request server
// state to leak between. The initial value is normally read straight off <html data-theme> (set by
// the inline script in app.html before paint); detectInitial falls back to resolving it itself if
// that script never ran.

export type Theme = 'light' | 'dark';

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
	if (stored === 'dark' || stored === 'light') return stored;
	return prefersDark ? 'dark' : 'light';
}

function detectInitial(): Theme {
	if (typeof document === 'undefined') return 'light';
	const attr = document.documentElement.dataset.theme;
	if (attr === 'dark' || attr === 'light') return attr;

	let stored: string | null = null;
	try {
		stored = localStorage.getItem('theme');
	} catch {
		stored = null;
	}
	const prefersDark =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
	return resolveInitialTheme(stored, prefersDark);
}

function apply(theme: Theme) {
	if (typeof document !== 'undefined') {
		if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
		else delete document.documentElement.dataset.theme;
	}
	try {
		localStorage.setItem('theme', theme);
	} catch {
		// storage unavailable (private mode, etc.) — in-memory state still works for the session
	}
}

let current = $state<Theme>(detectInitial());

function set(theme: Theme) {
	current = theme;
	apply(theme);
}

function toggle() {
	set(current === 'dark' ? 'light' : 'dark');
}

export const themeStore = {
	get theme(): Theme {
		return current;
	},
	get isDark(): boolean {
		return current === 'dark';
	},
	set,
	toggle
};
