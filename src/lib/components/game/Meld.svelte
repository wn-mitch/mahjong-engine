<script lang="ts">
	import Tile, { type TileSize } from '$lib/components/Tile.svelte';
	import type { Tile as TileT } from '$lib/engine/tiles';

	type Props = { tiles: TileT[]; size?: TileSize };
	let { tiles, size = 'sm' }: Props = $props();
</script>

<div class="flex gap-[3px] px-[3px] py-[2px] rounded-[6px] bg-bg-raised border border-line">
	{#each tiles as tile, i (i)}
		<Tile {tile} {size} />
	{/each}
</div>
