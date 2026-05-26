<script lang="ts">
	import Tile from './Tile.svelte';
	import TileSlot from './TileSlot.svelte';
	import { useStore } from '$lib/state/context';

	const store = useStore();

	const discards = $derived(store.state.discards);
	const focused = $derived(store.focus.kind === 'discards');
	const empty = $derived(discards.length === 0);
</script>

<section class="px-6 {empty ? 'py-2' : 'py-3'}">
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
				size="sm"
				{focused}
				label="add tile to discard pile"
				onclick={() => store.setFocus({ kind: 'discards' })}
			/>
		{/if}
	</header>
	{#if !empty}
		<div class="flex flex-wrap gap-[4px]">
			{#each discards as tile, i (i)}
				<Tile {tile} size="sm" onclick={() => store.removeFromDiscards(i)} />
			{/each}
			<TileSlot
				size="sm"
				{focused}
				label="add tile to discard pile"
				onclick={() => store.setFocus({ kind: 'discards' })}
			/>
		</div>
	{/if}
</section>
