import { describe, it, expect } from 'vitest';
import { resolveInitialTileStyle, nextTileStyle } from '../src/lib/state/tileStyleStore.svelte';

describe('resolveInitialTileStyle', () => {
	it('honors a recognized stored value', () => {
		expect(resolveInitialTileStyle('cjk')).toBe('cjk');
		expect(resolveInitialTileStyle('western')).toBe('western');
		expect(resolveInitialTileStyle('icon')).toBe('icon');
	});

	it('falls back to cjk for an unrecognized or missing value', () => {
		expect(resolveInitialTileStyle('sepia')).toBe('cjk');
		expect(resolveInitialTileStyle('')).toBe('cjk');
		expect(resolveInitialTileStyle(null)).toBe('cjk');
	});
});

describe('nextTileStyle', () => {
	it('cycles cjk → western → icon → cjk', () => {
		expect(nextTileStyle('cjk')).toBe('western');
		expect(nextTileStyle('western')).toBe('icon');
		expect(nextTileStyle('icon')).toBe('cjk');
	});
});
