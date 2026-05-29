<script lang="ts" module>
	export type TileSize = 'xs' | 'sm' | 'md' | 'lg';
	export type TileState = 'idle' | 'suggested' | 'needed' | 'ghost';

	type SizeClasses = {
		tile: string;
		rank: string;
		suitMark: string;
		wind: string;
		dragon: string;
		whiteDragon: string;
		flower: string;
		joker: string;
	};

	const SIZE: Record<TileSize, SizeClasses> = {
		xs: {
			tile: 'w-[22px] h-[30px] rounded-[4px]',
			rank: 'text-[11px] mt-[2px]',
			suitMark: 'text-[8px] mb-[2px]',
			wind: 'text-[13px]',
			dragon: 'text-[14px]',
			whiteDragon: 'w-[12px] h-[18px]',
			flower: 'w-[14px] h-[14px]',
			joker: 'text-[7px]'
		},
		sm: {
			tile: 'w-[30px] h-[40px] rounded-[5px]',
			rank: 'text-[16px] mt-[3px]',
			suitMark: 'text-[10px] mb-[3px]',
			wind: 'text-[18px]',
			dragon: 'text-[20px]',
			whiteDragon: 'w-[16px] h-[24px]',
			flower: 'w-[18px] h-[18px]',
			joker: 'text-[9px]'
		},
		md: {
			tile: 'w-[42px] h-[56px] rounded-tile',
			rank: 'text-[22px] mt-[5px]',
			suitMark: 'text-[13px] mb-[5px]',
			wind: 'text-[26px]',
			dragon: 'text-[28px]',
			whiteDragon: 'w-[22px] h-[34px]',
			flower: 'w-[26px] h-[26px]',
			joker: 'text-[12px]'
		},
		lg: {
			tile: 'w-[54px] h-[72px] rounded-[7px]',
			rank: 'text-[28px] mt-[7px]',
			suitMark: 'text-[16px] mb-[6px]',
			wind: 'text-[34px]',
			dragon: 'text-[36px]',
			whiteDragon: 'w-[28px] h-[44px]',
			flower: 'w-[34px] h-[34px]',
			joker: 'text-[16px]'
		}
	};

	const STATE: Record<TileState, string> = {
		idle: '',
		suggested:
			'shadow-[0_0_0_2px_var(--color-accent),0_8px_18px_-10px_oklch(0.46_0.11_252/0.55)] -translate-y-[3px] motion-reduce:translate-y-0',
		needed: 'shadow-[0_0_0_1.5px_var(--color-need)]',
		ghost: 'opacity-[0.32]'
	};

	const SUIT_TEXT = {
		crack: 'text-suit-crack',
		bamboo: 'text-suit-bamboo',
		dot: 'text-suit-dot'
	} as const;

	const DRAGON_TEXT = {
		red: 'text-dragon-red',
		green: 'text-dragon-green'
	} as const;
</script>

<script lang="ts">
	import type { Tile } from '$lib/engine/tiles';
	import { tileStyleStore } from '$lib/state/tileStyleStore.svelte';
	import { tileGlyphSvg } from './tileGlyph';

	type Props = {
		tile: Tile;
		size?: TileSize;
		state?: TileState;
		onclick?: (e: MouseEvent) => void;
		title?: string;
		ariaLabel?: string;
		disabled?: boolean;
		jokerMark?: boolean;
	};

	let {
		tile,
		size = 'md',
		state = 'idle',
		onclick,
		title,
		ariaLabel,
		disabled = false,
		jokerMark = false
	}: Props = $props();

	const SUIT_GLYPH = { crack: '萬', bamboo: '索', dot: '筒' } as const;
	const SUIT_WESTERN = { crack: 'crk', bamboo: 'bam', dot: 'dot' } as const;
	const SUIT_NAME = { crack: 'cracks', bamboo: 'bamboo', dot: 'dots' } as const;
	const DRAGON_GLYPH = { red: '中', green: '發', white: '' } as const;
	const DRAGON_NAME = {
		red: 'red dragon',
		green: 'green dragon',
		white: 'white dragon'
	} as const;
	const WIND_NAME = { N: 'north', E: 'east', S: 'south', W: 'west' } as const;

	function defaultAriaLabel(t: Tile): string {
		switch (t.kind) {
			case 'number':
				return `${t.rank} ${SUIT_NAME[t.suit]}`;
			case 'wind':
				return `${WIND_NAME[t.wind]} wind`;
			case 'dragon':
				return DRAGON_NAME[t.dragon];
			case 'flower':
				return 'flower';
			case 'joker':
				return 'joker';
		}
	}

	const defaultLabel = $derived(ariaLabel ?? defaultAriaLabel(tile));
	const tip = $derived(title ?? defaultLabel);
	const isButton = $derived(typeof onclick === 'function');
	const s = $derived(SIZE[size]);

	const kindBg = $derived(
		tile.kind === 'joker'
			? 'bg-joker-bg'
			: tile.kind === 'flower'
				? 'bg-flower-bg'
				: 'bg-bg-raised'
	);
	const kindJustify = $derived(tile.kind === 'number' ? 'justify-between' : 'justify-center');

	// Icon mode renders a full-bleed traditional tile face (number suits, winds,
	// dragons). Flowers/jokers have no glyph and fall through to the flat face.
	const glyph = $derived(tileStyleStore.style === 'icon' ? tileGlyphSvg(tile) : null);

	function glyphColor(t: Tile): string {
		switch (t.kind) {
			case 'number':
				return SUIT_TEXT[t.suit];
			case 'dragon':
				return t.dragon === 'white' ? 'text-ink-soft' : DRAGON_TEXT[t.dragon];
			default:
				return 'text-ink';
		}
	}

	// Riichi faces encode rank/identity in CJK (Chinese numerals, 東南西北, 中發). Surface a
	// short NMJL-readable label in the corner: crak rank, wind letter, dragon initial.
	const DRAGON_INITIAL = { red: 'R', green: 'G', white: 'W' } as const;
	function iconBadge(t: Tile): string | null {
		switch (t.kind) {
			case 'number':
				return t.suit === 'crack' ? String(t.rank) : null;
			case 'wind':
				return t.wind;
			case 'dragon':
				return DRAGON_INITIAL[t.dragon];
			default:
				return null;
		}
	}
</script>

{#snippet face()}
	{#if glyph}
		<!-- eslint-disable-next-line svelte/no-at-html-tags — vendored, recolored CC0 asset -->
		<span class="tile-glyph block w-full h-full {glyphColor(tile)}">{@html glyph}</span>
		{#if iconBadge(tile)}
			<span
				class="absolute top-0 left-0 font-semibold tabular-nums leading-none bg-bg-raised/85 rounded-br-[3px] px-[2px] py-[1px] pointer-events-none {glyphColor(tile)} {s.suitMark}"
				aria-hidden="true"
			>
				{iconBadge(tile)}
			</span>
		{/if}
	{:else if tile.kind === 'number'}
		<span
			class="font-semibold tracking-[-0.02em] leading-none [font-feature-settings:'tnum','ss01']
			       {SUIT_TEXT[tile.suit]} {s.rank}"
		>
			{tile.rank}
		</span>
		{#if tileStyleStore.style === 'western'}
			<span
				class="font-semibold uppercase tracking-[0.04em] opacity-85 leading-none {SUIT_TEXT[tile.suit]} {s.suitMark}"
			>
				{SUIT_WESTERN[tile.suit]}
			</span>
		{:else}
			<span class="cjk font-medium opacity-85 leading-none {SUIT_TEXT[tile.suit]} {s.suitMark}">
				{SUIT_GLYPH[tile.suit]}
			</span>
		{/if}
	{:else if tile.kind === 'wind'}
		<span class="font-semibold tracking-[-0.04em] text-ink {s.wind}">{tile.wind}</span>
	{:else if tile.kind === 'dragon'}
		{#if tile.dragon === 'white'}
			<span
				class="block border-[1.5px] border-ink-soft rounded-[3px] {s.whiteDragon}"
				aria-hidden="true"
			></span>
		{:else}
			<span class="cjk font-medium leading-none {DRAGON_TEXT[tile.dragon]} {s.dragon}">
				{DRAGON_GLYPH[tile.dragon]}
			</span>
		{/if}
	{:else if tile.kind === 'flower'}
		<svg
			class="text-flower {s.flower}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 4 C14.5 6.5 14.5 9.5 12 12 C9.5 9.5 9.5 6.5 12 4 Z" />
			<path d="M12 20 C9.5 17.5 9.5 14.5 12 12 C14.5 14.5 14.5 17.5 12 20 Z" />
			<path d="M4 12 C6.5 9.5 9.5 9.5 12 12 C9.5 14.5 6.5 14.5 4 12 Z" />
			<path d="M20 12 C17.5 14.5 14.5 14.5 12 12 C14.5 9.5 17.5 9.5 20 12 Z" />
			<circle cx="12" cy="12" r="1.1" fill="currentColor" />
		</svg>
	{:else}
		<span class="font-mono font-semibold tracking-[0.05em] text-joker {s.joker}">JKR</span>
	{/if}
{/snippet}

{#if isButton}
	<button
		type="button"
		class="tile inline-flex flex-col items-center {kindJustify} relative select-none shrink-0
		       border border-line {kindBg}
		       transition-[box-shadow,transform,background-color] duration-200 ease-out-quart
		       cursor-pointer p-0 font-[inherit] text-[inherit]
		       motion-reduce:transition-none
		       hover:not-disabled:bg-[oklch(0.995_0.004_80)] hover:not-disabled:border-line-strong
		       active:not-disabled:translate-y-[0.5px]
		       disabled:cursor-default
		       focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
		       {s.tile} {STATE[state]}"
		aria-label={defaultLabel}
		title={tip}
		{disabled}
		onclick={(e) => onclick?.(e)}
	>
		{@render face()}
		{#if jokerMark}
			<span
				class="absolute top-0 right-0 text-[0.55em] font-mono font-semibold text-joker bg-bg-raised/85 leading-none px-[2px] py-[1px] rounded-bl-[3px] pointer-events-none"
				aria-label="joker substitution"
				title="joker substitution"
			>
				J
			</span>
		{/if}
	</button>
{:else}
	<span
		class="tile inline-flex flex-col items-center {kindJustify} relative select-none shrink-0
		       border border-line {kindBg}
		       transition-[box-shadow,transform,background-color] duration-200 ease-out-quart
		       motion-reduce:transition-none
		       {s.tile} {STATE[state]}"
		role="img"
		aria-label={defaultLabel}
		title={tip}
	>
		{@render face()}
		{#if jokerMark}
			<span
				class="absolute top-0 right-0 text-[0.55em] font-mono font-semibold text-joker bg-bg-raised/85 leading-none px-[2px] py-[1px] rounded-bl-[3px] pointer-events-none"
				aria-hidden="true"
			>
				J
			</span>
		{/if}
	</span>
{/if}

<style>
	.tile-glyph :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		padding: 2%;
		box-sizing: border-box;
	}
</style>
