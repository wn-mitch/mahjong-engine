import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { __testing__ } from '../src/lib/state/preferences.svelte';

const { load, save, defaults, STORAGE_KEY } = __testing__;

// Vitest runs in Node by default, no DOM. Stand up a minimal in-memory localStorage so we can
// exercise the persistence path without pulling in jsdom for a 6-test module.
beforeAll(() => {
	const store = new Map<string, string>();
	const stub: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (key) => (store.has(key) ? store.get(key)! : null),
		setItem: (key, value) => void store.set(key, String(value)),
		removeItem: (key) => void store.delete(key),
		key: (i) => Array.from(store.keys())[i] ?? null
	};
	Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true });
});

beforeEach(() => {
	localStorage.clear();
});

describe('preferences persistence', () => {
	it('returns defaults when no key is set', () => {
		const prefs = load();
		expect(prefs).toEqual(defaults());
	});

	it('round-trips a saved preference set', () => {
		const stored = { ...defaults(), lastRulesetId: 'chinese-traditional' as const };
		save(stored);
		expect(load()).toEqual(stored);
	});

	it('resets to defaults on malformed JSON', () => {
		localStorage.setItem(STORAGE_KEY, '{ not json');
		expect(load()).toEqual(defaults());
	});

	it('resets to defaults on a schema mismatch', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ schema: 99, lastRulesetId: 'nmjl-2026' })
		);
		expect(load()).toEqual(defaults());
	});

	it('rejects an unknown ruleset id and falls back to null', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ schema: 1, lastRulesetId: 'martian-2099', defaultHintOn: true })
		);
		const loaded = load();
		expect(loaded.lastRulesetId).toBeNull();
		expect(loaded.defaultHintOn).toBe(true);
	});

	it('coerces non-boolean flags to false', () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				schema: 1,
				lastRulesetId: 'nmjl-2026',
				defaultHintOn: 'yes',
				alwaysShowPregame: 1
			})
		);
		const loaded = load();
		expect(loaded.defaultHintOn).toBe(false);
		expect(loaded.alwaysShowPregame).toBe(false);
	});
});
