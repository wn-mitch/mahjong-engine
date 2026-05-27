<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import Meld from './Meld.svelte';
	import { useGame } from '$lib/state/gameContext';
	import { compareTiles } from '$lib/engine/tiles';
	import type { SeatId } from '$lib/engine/game';

	type Props = { seat: SeatId };
	let { seat }: Props = $props();

	const game = useGame();

	const data = $derived(game.seats[seat]);
	const isTurn = $derived(game.turn === seat && game.phase === 'play');
	const revealedHand = $derived.by(() => [...data.hand].sort(compareTiles));
</script>

<div
	class="grid gap-2 content-start min-w-0 p-3 rounded-panel transition-colors duration-200 ease-out-quart
	       {isTurn ? 'bg-bg-raised border border-line-strong' : 'bg-bg-sunk border border-transparent'}"
>
	<header class="flex items-baseline gap-2">
		<span
			class="w-[6px] h-[6px] rounded-full {isTurn ? 'bg-ink' : 'bg-ink-faint'}"
			aria-hidden="true"
		></span>
		<span class="text-sm font-semibold text-ink">{game.seatLabel(seat)}</span>
		<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
			{game.relativeLabel(seat)}
		</span>
		<span class="numeric text-xs text-ink-faint ml-auto">{data.hand.length}</span>
		{#if isTurn}
			<span class="text-xs italic text-ink-soft">to play</span>
		{/if}
	</header>

	{#if game.revealed}
		<div class="flex overflow-hidden [&>*:not(:first-child)]:-ml-[6px]">
			{#each revealedHand as tile, i (i)}
				<Tile {tile} size="xs" />
			{/each}
		</div>
	{:else}
		<div class="flex gap-[2px] overflow-hidden" aria-label="{data.hand.length} concealed tiles">
			{#each data.hand as _, i (i)}
				<span class="block w-[16px] h-[22px] rounded-[3px] bg-bg-raised border border-line shrink-0"></span>
			{/each}
		</div>
	{/if}

	{#if data.exposures.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each data.exposures as ex, i (i)}
				<Meld tiles={ex.tiles} size="sm" />
			{/each}
		</div>
	{/if}
</div>
