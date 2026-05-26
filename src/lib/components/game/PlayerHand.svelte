<script lang="ts">
	import Tile, { type TileState } from '$lib/components/Tile.svelte';
	import Meld from './Meld.svelte';
	import { useGame } from '$lib/state/gameContext';
	import { compareTiles, tileEquals, type Tile as TileT } from '$lib/engine/tiles';

	const game = useGame();

	type Indexed = { tile: TileT; srcIndex: number };

	// Sort for display while keeping each tile's raw hand index, which the store's charleston
	// queue and discard both key off.
	const sorted = $derived.by<Indexed[]>(() =>
		game.humanView.self.hand
			.map((tile, srcIndex) => ({ tile, srcIndex }))
			.sort((a, b) => compareTiles(a.tile, b.tile))
	);

	const exposures = $derived(game.seats[0].exposures);

	const mode = $derived.by<'discard' | 'charleston' | 'idle'>(() => {
		const k = game.interaction.kind;
		if (k === 'human-turn') return 'discard';
		if (k === 'charleston-pass' || k === 'charleston-courtesy-pass') return 'charleston';
		return 'idle';
	});

	// Map the engine's suggested tiles (a discard pick, or the charleston pass tiles) onto
	// concrete non-queued hand indices, consuming each match so duplicates ring the right count.
	const suggestedSrc = $derived.by<Set<number>>(() => {
		const set = new Set<number>();
		const used = new Set<number>();
		for (const sugg of game.suggestedTiles) {
			for (const { tile, srcIndex } of sorted) {
				if (used.has(srcIndex) || game.queuedIndices.has(srcIndex)) continue;
				if (tileEquals(tile, sugg)) {
					used.add(srcIndex);
					set.add(srcIndex);
					break;
				}
			}
		}
		return set;
	});

	function tileStateFor(srcIndex: number): TileState {
		if (game.queuedIndices.has(srcIndex)) return 'ghost';
		if (suggestedSrc.has(srcIndex)) return 'suggested';
		return 'idle';
	}

	function clickTile(item: Indexed) {
		if (mode === 'discard') game.selectDiscard(item.tile);
		else if (mode === 'charleston') game.toggleCharlestonTile(item.srcIndex);
	}

	const hint = $derived.by(() => {
		if (mode === 'discard') return 'click a tile to discard it';
		if (mode === 'charleston')
			return game.passTarget > 0
				? `click to stage tiles · ${game.queuedIndices.size}/${game.passTarget} chosen`
				: 'passing nothing';
		return 'waiting…';
	});
</script>

<section class="grid gap-3 p-4 px-6 bg-bg rounded-panel border border-line max-sm:px-3">
	<header class="flex items-baseline gap-4 flex-wrap">
		<span class="inline-flex items-center gap-2 text-base font-semibold text-ink tracking-tight">
			<span class="w-[6px] h-[6px] rounded-full bg-ink-faint" aria-hidden="true"></span>
			Your hand
			<span class="numeric text-sm font-medium text-ink-faint">
				{game.humanView.self.hand.length}
			</span>
		</span>
		<span class="text-xs italic text-ink-faint max-sm:hidden">{hint}</span>
	</header>

	{#if exposures.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each exposures as ex, i (i)}
				<Meld tiles={ex.tiles} size="md" />
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap gap-[6px] items-end">
		{#each sorted as item (item.srcIndex)}
			<Tile
				tile={item.tile}
				size="lg"
				state={tileStateFor(item.srcIndex)}
				onclick={mode === 'idle' ? undefined : () => clickTile(item)}
			/>
		{/each}
	</div>
</section>
