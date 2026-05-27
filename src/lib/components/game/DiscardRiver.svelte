<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import DiscardViewToggle from '$lib/components/DiscardViewToggle.svelte';
	import { useGame } from '$lib/state/gameContext';
	import { discardViewStore } from '$lib/state/discardViewStore.svelte';
	import { tileKey, compareTiles } from '$lib/engine/tiles';

	const game = useGame();

	const discards = $derived(game.discards);
	const lastIndex = $derived(discards.length - 1);

	// Key of the most recent discard, so the stacked view can carry the "last discard" ring
	// onto the group it belongs to.
	const lastKey = $derived(lastIndex >= 0 ? tileKey(discards[lastIndex].tile) : null);

	// Stacked view: collapse identical discards (tileKey folds all jokers → 'J', flowers → 'F')
	// into one representative tile with a count, sorted in canonical tile order.
	const grouped = $derived.by(() => {
		const byKey = new Map<string, { tile: (typeof discards)[number]['tile']; count: number }>();
		for (const { tile } of discards) {
			const key = tileKey(tile);
			const existing = byKey.get(key);
			if (existing) existing.count += 1;
			else byKey.set(key, { tile, count: 1 });
		}
		return [...byKey.entries()]
			.map(([key, group]) => ({ key, ...group }))
			.sort((a, b) => compareTiles(a.tile, b.tile));
	});
</script>

<section class="grid gap-2 p-4 px-6 bg-bg-raised rounded-panel border border-line max-sm:px-4">
	<header class="flex items-center gap-2">
		<span class="w-[5px] h-[5px] rounded-full bg-ink-faint" aria-hidden="true"></span>
		<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">Discards</span>
		<span class="numeric text-xs text-ink-faint">{discards.length}</span>
		<DiscardViewToggle />
		<span class="numeric text-xs text-ink-faint ml-auto">{game.wallRemaining} in wall</span>
	</header>

	{#if discards.length === 0}
		<p class="text-xs italic text-ink-faint">No discards yet.</p>
	{:else if discardViewStore.isStacked}
		<!-- Stacked: one tile per distinct discard, with a count. Naturally compact, so uncapped. -->
		<div class="flex flex-wrap gap-[4px] items-start">
			{#each grouped as group (group.key)}
				<div
					class="relative rounded-[6px] {group.key === lastKey
						? 'shadow-[0_0_0_2px_var(--color-line-strong)]'
						: ''}"
				>
					<Tile tile={group.tile} size="sm" />
					{#if group.count > 1}
						<span
							class="absolute top-0 right-0 numeric text-[0.55em] font-semibold text-ink-soft bg-bg-raised/85 leading-none px-[2px] py-[1px] rounded-bl-[3px] pointer-events-none"
							aria-hidden="true"
						>
							{group.count}
						</span>
						<span class="sr-only">, {group.count} discarded</span>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<!-- River: chronological grid, capped to ~3 rows (3×40px tile + 2×4px gap) with internal scroll. -->
		<div class="flex flex-wrap gap-[4px] items-start max-h-[128px] overflow-y-auto">
			{#each discards as entry, i (i)}
				<div
					class="rounded-[6px] {i === lastIndex
						? 'shadow-[0_0_0_2px_var(--color-line-strong)]'
						: ''}"
				>
					<Tile tile={entry.tile} size="sm" />
				</div>
			{/each}
		</div>
	{/if}
</section>
