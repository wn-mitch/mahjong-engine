import { describe, it, expect } from 'vitest';
import { resolveInitialTheme } from '../src/lib/state/themeStore.svelte';

describe('resolveInitialTheme', () => {
	it('honors a stored explicit choice over the system preference', () => {
		expect(resolveInitialTheme('dark', false)).toBe('dark');
		expect(resolveInitialTheme('light', true)).toBe('light');
	});

	it('falls back to the system preference when nothing is stored', () => {
		expect(resolveInitialTheme(null, true)).toBe('dark');
		expect(resolveInitialTheme(null, false)).toBe('light');
	});

	it('ignores an unrecognized stored value and uses the system preference', () => {
		expect(resolveInitialTheme('sepia', true)).toBe('dark');
		expect(resolveInitialTheme('', false)).toBe('light');
	});
});
