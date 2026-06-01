// App-level preferences persisted across reloads. Separate from `houseRulesStore` (which
// owns the per-table allowConcealed rule), `themeStore`, and `tileStyleStore` — each of
// those already has its own localStorage key consumed by a pre-paint script or independent
// component. This module owns the *new* prefs introduced alongside the pregame and settings
// surfaces: the last ruleset the user played, whether hints should default on, and whether
// to always reopen the pregame dialog on "New game".
//
// The app is a client-only SPA (`ssr = false`), so synchronous `localStorage` reads at
// module init are safe; mirrors the pattern in `themeStore.svelte.ts`.

import type { RulesetId } from './gameStore.svelte';

interface PersistedPrefs {
	schema: 1;
	lastRulesetId: RulesetId | null;
	defaultHintOn: boolean;
	alwaysShowPregame: boolean;
}

const STORAGE_KEY = 'mahjong-prefs';
const VALID_RULESETS: ReadonlySet<RulesetId> = new Set<RulesetId>([
	'nmjl-2026',
	'chinese-traditional'
]);

function defaults(): PersistedPrefs {
	return {
		schema: 1,
		lastRulesetId: null,
		defaultHintOn: false,
		alwaysShowPregame: false
	};
}

// Defensive parse: a missing key, malformed JSON, wrong schema, or unknown ruleset all
// fall back to defaults and rewrite the slot so future reads stay consistent.
function load(): PersistedPrefs {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults();
		const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
		if (parsed.schema !== 1) return defaults();
		const lastRulesetId =
			parsed.lastRulesetId && VALID_RULESETS.has(parsed.lastRulesetId)
				? parsed.lastRulesetId
				: null;
		return {
			schema: 1,
			lastRulesetId,
			defaultHintOn: typeof parsed.defaultHintOn === 'boolean' ? parsed.defaultHintOn : false,
			alwaysShowPregame:
				typeof parsed.alwaysShowPregame === 'boolean' ? parsed.alwaysShowPregame : false
		};
	} catch {
		return defaults();
	}
}

function save(prefs: PersistedPrefs) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// storage unavailable — in-memory state still works for the session
	}
}

let current = $state<PersistedPrefs>(typeof localStorage === 'undefined' ? defaults() : load());

export const preferencesStore = {
	get lastRulesetId(): RulesetId | null {
		return current.lastRulesetId;
	},
	get defaultHintOn(): boolean {
		return current.defaultHintOn;
	},
	get alwaysShowPregame(): boolean {
		return current.alwaysShowPregame;
	},
	setLastRulesetId(id: RulesetId) {
		current = { ...current, lastRulesetId: id };
		save(current);
	},
	setDefaultHintOn(value: boolean) {
		current = { ...current, defaultHintOn: value };
		save(current);
	},
	setAlwaysShowPregame(value: boolean) {
		current = { ...current, alwaysShowPregame: value };
		save(current);
	}
};

// Exported only for tests; not part of the runtime contract.
export const __testing__ = { load, save, defaults, STORAGE_KEY };
