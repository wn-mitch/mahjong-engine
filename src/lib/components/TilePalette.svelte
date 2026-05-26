<script lang="ts" module>
	import type { Tile as TileT, Suit } from '$lib/engine/tiles';

	const SUITS: Suit[] = ['crack', 'bamboo', 'dot'];
	const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

	const NUMBER_TILES: TileT[] = SUITS.flatMap((suit) =>
		RANKS.map((rank) => ({ kind: 'number', suit, rank }) as TileT)
	);

	const WIND_TILES: TileT[] = [
		{ kind: 'wind', wind: 'E' },
		{ kind: 'wind', wind: 'S' },
		{ kind: 'wind', wind: 'W' },
		{ kind: 'wind', wind: 'N' }
	];

	const DRAGON_TILES: TileT[] = [
		{ kind: 'dragon', dragon: 'red' },
		{ kind: 'dragon', dragon: 'green' },
		{ kind: 'dragon', dragon: 'white' }
	];

	const SPECIAL_TILES: TileT[] = [{ kind: 'flower' }, { kind: 'joker' }];

	type PaletteGroup = { id: string; label: string; ariaLabel: string; tiles: TileT[] };

	const GROUPS: PaletteGroup[] = [
		{
			id: 'crack',
			label: 'Cracks',
			ariaLabel: 'Cracks suit',
			tiles: NUMBER_TILES.filter((t) => t.kind === 'number' && t.suit === 'crack')
		},
		{
			id: 'bamboo',
			label: 'Bamboo',
			ariaLabel: 'Bamboo suit',
			tiles: NUMBER_TILES.filter((t) => t.kind === 'number' && t.suit === 'bamboo')
		},
		{
			id: 'dot',
			label: 'Dots',
			ariaLabel: 'Dots suit',
			tiles: NUMBER_TILES.filter((t) => t.kind === 'number' && t.suit === 'dot')
		},
		{ id: 'winds', label: 'Winds', ariaLabel: 'Wind tiles', tiles: WIND_TILES },
		{ id: 'dragons', label: 'Dragons', ariaLabel: 'Dragon tiles', tiles: DRAGON_TILES },
		{ id: 'special', label: 'Special', ariaLabel: 'Flower and joker tiles', tiles: SPECIAL_TILES }
	];

	export { NUMBER_TILES };
</script>

<script lang="ts">
	import Tile from './Tile.svelte';
	import { useStore } from '$lib/state/context';

	const store = useStore();

	const SUIT_NAME = { crack: 'cracks', bamboo: 'bamboo', dot: 'dots' } as const;
	const WIND_NAME = { N: 'north', E: 'east', S: 'south', W: 'west' } as const;

	function focusTarget(): string {
		const f = store.focus;
		switch (f.kind) {
			case 'hand':
				return 'your hand';
			case 'self-exposure':
				return `your exposure #${f.index + 1}`;
			case 'opp-exposure':
				return `${f.opp} player's exposure #${f.index + 1}`;
			case 'discards':
				return 'discard pile';
			case 'charleston-sent':
				return 'charleston sent tiles';
			case 'charleston-received':
				return 'charleston received tiles';
		}
	}

	function tileAriaLabel(t: TileT): string {
		switch (t.kind) {
			case 'number':
				return `add ${t.rank} of ${SUIT_NAME[t.suit]}`;
			case 'wind':
				return `add ${WIND_NAME[t.wind]} wind`;
			case 'dragon':
				return `add ${t.dragon} dragon`;
			case 'flower':
				return 'add flower';
			case 'joker':
				return 'add joker';
		}
	}

	const target = $derived(focusTarget());

	let paletteEl: HTMLElement | null = $state(null);
	let groupIdx = $state(0);
	let tileIdx = $state(0);

	function getButton(g: number, t: number): HTMLButtonElement | null {
		if (!paletteEl) return null;
		const groups = paletteEl.querySelectorAll<HTMLElement>('[data-palette-group]');
		const group = groups[g];
		if (!group) return null;
		return group.querySelectorAll<HTMLButtonElement>('button.tile')[t] ?? null;
	}

	$effect(() => {
		if (!paletteEl) return;
		const groups = Array.from(paletteEl.querySelectorAll<HTMLElement>('[data-palette-group]'));
		for (let g = 0; g < groups.length; g++) {
			const buttons = groups[g].querySelectorAll<HTMLButtonElement>('button.tile');
			for (let t = 0; t < buttons.length; t++) {
				buttons[t].tabIndex = g === groupIdx && t === tileIdx ? 0 : -1;
			}
		}
	});

	function moveTo(g: number, t: number) {
		groupIdx = g;
		tileIdx = t;
		getButton(g, t)?.focus();
	}

	function onKeyDown(e: KeyboardEvent) {
		const last = GROUPS.length - 1;
		const len = (i: number) => GROUPS[i].tiles.length;
		switch (e.key) {
			case 'ArrowRight':
				e.preventDefault();
				if (tileIdx + 1 < len(groupIdx)) moveTo(groupIdx, tileIdx + 1);
				else if (groupIdx < last) moveTo(groupIdx + 1, 0);
				return;
			case 'ArrowLeft':
				e.preventDefault();
				if (tileIdx > 0) moveTo(groupIdx, tileIdx - 1);
				else if (groupIdx > 0) moveTo(groupIdx - 1, len(groupIdx - 1) - 1);
				return;
			case 'ArrowDown':
				e.preventDefault();
				if (groupIdx < last) moveTo(groupIdx + 1, Math.min(tileIdx, len(groupIdx + 1) - 1));
				return;
			case 'ArrowUp':
				e.preventDefault();
				if (groupIdx > 0) moveTo(groupIdx - 1, Math.min(tileIdx, len(groupIdx - 1) - 1));
				return;
			case 'Home':
				e.preventDefault();
				moveTo(groupIdx, 0);
				return;
			case 'End':
				e.preventDefault();
				moveTo(groupIdx, len(groupIdx) - 1);
				return;
			case 'Escape':
				e.preventDefault();
				store.setFocus({ kind: 'hand' });
				(e.target as HTMLElement | null)?.blur();
				return;
		}
	}
</script>

<div
	class="palette bg-bg-raised border border-line rounded-panel p-3 pb-4 flex flex-col gap-3 min-h-0
	       max-md:p-3"
	role="toolbar"
	aria-label="Tile palette"
	tabindex="-1"
	bind:this={paletteEl}
	onkeydown={onKeyDown}
>
	<header class="grid gap-[2px] pb-2 border-b border-line">
		<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Palette</span>
		<span class="flex flex-wrap gap-x-2 gap-y-1 items-baseline" aria-live="polite" aria-atomic="true">
			<span class="text-xs italic text-ink-faint">adding to</span>
			<span class="text-sm font-semibold text-accent-ink">{target}</span>
		</span>
	</header>

	<div class="flex flex-col gap-3">
		{#each GROUPS as group (group.id)}
			<section class="grid gap-2" aria-label={group.ariaLabel} data-palette-group>
				<h3 class="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
					{group.label}
				</h3>
				<div class="flex flex-wrap gap-1 max-md:gap-[4px]">
					{#each group.tiles as tile, j (group.id + ':' + j)}
						<Tile
							{tile}
							size="sm"
							ariaLabel={tileAriaLabel(tile)}
							title={tileAriaLabel(tile)}
							onclick={() => store.addTile(tile)}
						/>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
