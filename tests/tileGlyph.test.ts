import { describe, it, expect } from 'vitest';
import type { Tile } from '../src/lib/engine/tiles';
import { glyphKey, recolorTwoTone } from '../src/lib/components/tileGlyph';

describe('glyphKey', () => {
	it('maps number suits to Man/Sou/Pin + rank', () => {
		expect(glyphKey({ kind: 'number', suit: 'crack', rank: 3 })).toBe('Man3');
		expect(glyphKey({ kind: 'number', suit: 'bamboo', rank: 1 })).toBe('Sou1');
		expect(glyphKey({ kind: 'number', suit: 'dot', rank: 5 })).toBe('Pin5');
	});

	it('maps winds and dragons to their riichi names', () => {
		expect(glyphKey({ kind: 'wind', wind: 'E' })).toBe('Ton');
		expect(glyphKey({ kind: 'wind', wind: 'N' })).toBe('Pei');
		expect(glyphKey({ kind: 'dragon', dragon: 'red' })).toBe('Chun');
		expect(glyphKey({ kind: 'dragon', dragon: 'green' })).toBe('Hatsu');
		expect(glyphKey({ kind: 'dragon', dragon: 'white' })).toBe('Haku');
	});

	it('returns null for tiles with no riichi equivalent', () => {
		expect(glyphKey({ kind: 'flower', index: 0 } as Tile)).toBeNull();
		expect(glyphKey({ kind: 'joker', index: 0 } as Tile)).toBeNull();
	});
});

describe('recolorTwoTone', () => {
	it('maps white to the tile face token and other colors to currentColor', () => {
		const out = recolorTwoTone(
			'<svg width="300" height="400" viewBox="0 0 300 400"><circle style="fill:#ffffff;stroke:#000000"/><rect style="fill:#b93c3c"/></svg>'
		);
		expect(out).toContain('fill:var(--color-bg-raised)');
		expect(out).toContain('stroke:currentColor');
		expect(out).toContain('fill:currentColor');
		expect(out).not.toContain('#000000');
		expect(out).not.toContain('#b93c3c');
		expect(out).not.toContain('#ffffff');
	});

	it('handles the attribute color form too', () => {
		const out = recolorTwoTone('<svg viewBox="0 0 1 1"><path fill="#fff" stroke="#004900"/></svg>');
		expect(out).toContain('fill="var(--color-bg-raised)"');
		expect(out).toContain('stroke="currentColor"');
	});

	it('preserves fill:none and leaves non-paint attributes alone', () => {
		const out = recolorTwoTone(
			'<svg viewBox="0 0 1 1"><path style="fill:none;stroke-width:8;fill-opacity:1;stroke:#000"/></svg>'
		);
		expect(out).toContain('fill:none');
		expect(out).toContain('stroke-width:8');
		expect(out).toContain('fill-opacity:1');
		expect(out).toContain('stroke:currentColor');
	});

	it('strips width/height from the root svg but keeps the viewBox', () => {
		const out = recolorTwoTone('<svg width="300" height="400" viewBox="0 0 300 400"></svg>');
		expect(out).toContain('viewBox="0 0 300 400"');
		expect(out).not.toMatch(/<svg[^>]*\swidth=/);
		expect(out).not.toMatch(/<svg[^>]*\sheight=/);
	});

	it('does not strip width/height from inner elements', () => {
		const out = recolorTwoTone(
			'<svg width="300" height="400" viewBox="0 0 300 400"><pattern width="6" height="6"/></svg>'
		);
		expect(out).toContain('<pattern width="6" height="6"/>');
	});
});
