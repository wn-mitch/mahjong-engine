<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import { useGame } from '$lib/state/gameContext';

	const game = useGame();

	const discards = $derived(game.discards);
	const lastIndex = $derived(discards.length - 1);
</script>

<section class="grid gap-2 px-6 py-4 max-sm:px-3">
	<header class="flex items-center gap-2">
		<span class="w-[5px] h-[5px] rounded-full bg-ink-faint" aria-hidden="true"></span>
		<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">Discards</span>
		<span class="numeric text-xs text-ink-faint">{discards.length}</span>
		<span class="numeric text-xs text-ink-faint ml-auto">{game.wallRemaining} in wall</span>
	</header>

	{#if discards.length === 0}
		<p class="text-xs italic text-ink-faint">No discards yet.</p>
	{:else}
		<div class="flex flex-wrap gap-[4px] items-start">
			{#each discards as entry, i (i)}
				<div class="rounded-[6px] {i === lastIndex ? 'shadow-[0_0_0_2px_var(--color-line-strong)]' : ''}">
					<Tile tile={entry.tile} size="sm" />
				</div>
			{/each}
		</div>
	{/if}
</section>
