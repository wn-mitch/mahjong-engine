import { describe, it, expect } from 'vitest';
import { resolveInitialTileStyle, nextTileStyle } from '../src/lib/state/tileStyleStore.svelte';

describe('resolveInitialTileStyle', () => {
	it('honors a recognized stored value', () => {
		expect(resolveInitialTileStyle('cjk')).toBe('cjk');
		expect(resolveInitialTileStyle('western')).toBe('western');
		expect(resolveInitialTileStyle('icon')).toBe('icon');
	});

	it('falls back to icon for an unrecognized or missing value', () => {
		expect(resolveInitialTileStyle('sepia')).toBe('icon');
		expect(resolveInitialTileStyle('')).toBe('icon');
		expect(resolveInitialTileStyle(null)).toBe('icon');
	});
});

describe('nextTileStyle', () => {
	it('cycles icon → cjk → western → icon', () => {
		expect(nextTileStyle('icon')).toBe('cjk');
		expect(nextTileStyle('cjk')).toBe('western');
		expect(nextTileStyle('western')).toBe('icon');
	});
});
