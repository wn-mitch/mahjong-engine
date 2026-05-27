<script lang="ts">
	import Tile from './Tile.svelte';
	import TileSlot from './TileSlot.svelte';
	import { useStore } from '$lib/state/context';
	import { createMediaQuery, PHONE_QUERY } from '$lib/state/media.svelte';

	const store = useStore();

	// Discards are click-to-remove, so they're a tap target on a phone — size up like the palette.
	const phone = createMediaQuery(PHONE_QUERY);
	const tileSize = $derived(phone.matches ? 'md' : 'sm');

	const discards = $derived(store.state.discards);
	const focused = $derived(store.focus.kind === 'discards');
	const empty = $derived(discards.length === 0);
</script>

<section class="px-6 max-sm:px-4 {empty ? 'py-2' : 'py-3'}">
	<header class="flex items-center justify-between gap-3 {empty ? '' : 'mb-2'}">
		<button
			type="button"
			class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft"
			onclick={() => store.setFocus({ kind: 'discards' })}
		>
			<span
				class="w-[5px] h-[5px] rounded-full {focused ? 'bg-accent' : 'bg-ink-faint'}"
				aria-hidden="true"
			></span>
			Discards
			<span class="numeric text-sm font-medium text-ink-faint">{discards.length}</span>
		</button>
		{#if empty}
			<TileSlot
				size={tileSize}
				{focused}
				label="add tile to discard pile"
				onclick={() => store.setFocus({ kind: 'discards' })}
			/>
		{/if}
	</header>
	{#if !empty}
		<div class="flex flex-wrap gap-[4px] max-sm:gap-2">
			{#each discards as tile, i (i)}
				<Tile {tile} size={tileSize} onclick={() => store.removeFromDiscards(i)} />
			{/each}
			<TileSlot
				size={tileSize}
				{focused}
				label="add tile to discard pile"
				onclick={() => store.setFocus({ kind: 'discards' })}
			/>
		</div>
	{/if}
</section>
