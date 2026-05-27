// How the Discards panel is drawn: Stacked (the default — identical discards collapsed into one tile
// with a count, numbers over history) or River (the chronological grid). Like tileStyleStore, this is
// a genuinely global, client-only preference and the app is a static SPA (ssr = false), so a
// module-level runes singleton is safe — no per-request server state.

export type DiscardView = 'stacked' | 'river';

function detectInitial(): DiscardView {
	try {
		const stored = localStorage.getItem('discard-view');
		if (stored === 'stacked' || stored === 'river') return stored;
	} catch {
		// storage unavailable (private mode, etc.)
	}
	return 'stacked';
}

let current = $state<DiscardView>(detectInitial());

function set(view: DiscardView) {
	current = view;
	try {
		localStorage.setItem('discard-view', view);
	} catch {
		// storage unavailable — in-memory state still works for the session
	}
}

function toggle() {
	set(current === 'stacked' ? 'river' : 'stacked');
}

export const discardViewStore = {
	get view(): DiscardView {
		return current;
	},
	get isStacked(): boolean {
		return current === 'stacked';
	},
	set,
	toggle
};
