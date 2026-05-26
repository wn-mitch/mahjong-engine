<script lang="ts">
	import Tile from './Tile.svelte';
	import TileSlot from './TileSlot.svelte';
	import { useStore } from '$lib/state/context';
	import { compareTiles, tileEquals, tileSortKey, type Tile as TileT } from '$lib/engine/tiles';

	const store = useStore();

	const hand = $derived(store.state.self.hand);
	const focused = $derived(store.focus.kind === 'hand');
	const sentFocused = $derived(store.focus.kind === 'charleston-sent');
	const receivedFocused = $derived(store.focus.kind === 'charleston-received');
	const charlestonFocused = $derived(sentFocused || receivedFocused);
	const queuedSet = $derived(store.queuedHandIndices);
	const suggestedDiscard = $derived(store.suggestion.discard);

	function handleTileClick(srcIndex: number) {
		if (sentFocused) {
			store.toggleQueueHandTile(srcIndex);
		} else if (receivedFocused) {
			// no-op: received tiles come from opponents (palette), not your own hand
		} else {
			store.removeFromHand(srcIndex);
		}
	}

	type SortMode = 'order' | 'identity';
	let sortMode = $state<SortMode>('order');

	type IndexedTile = { tile: TileT; srcIndex: number };

	const groupedHand = $derived.by<IndexedTile[][]>(() => {
		const indexed: IndexedTile[] = hand.map((tile, srcIndex) => ({ tile, srcIndex }));
		const identityKey = (t: TileT) => tileSortKey(t).join(':');
		const counts = new Map<string, number>();
		for (const { tile } of indexed) {
			const k = identityKey(tile);
			counts.set(k, (counts.get(k) ?? 0) + 1);
		}
		indexed.sort((a, b) => {
			const [ga, wa] = tileSortKey(a.tile);
			const [gb, wb] = tileSortKey(b.tile);
			if (ga !== gb) return ga - gb;
			if (sortMode === 'identity') {
				const ca = counts.get(identityKey(a.tile)) ?? 0;
				const cb = counts.get(identityKey(b.tile)) ?? 0;
				if (ca !== cb) return cb - ca;
			}
			return wa - wb;
		});

		const groups: IndexedTile[][] = [];
		let currentSuit = -1;
		let currentIdentity = '';
		for (const item of indexed) {
			const [g] = tileSortKey(item.tile);
			const key = identityKey(item.tile);
			const startNew =
				g !== currentSuit || (sortMode === 'identity' && key !== currentIdentity);
			if (startNew) {
				groups.push([]);
				currentSuit = g;
				currentIdentity = key;
			}
			groups[groups.length - 1].push(item);
		}
		return groups;
	});

	// Pick the largest tile size whose single-line row fits the available width.
	// Constants mirror the SIZE map in Tile.svelte / TileSlot.svelte and the gap
	// classes applied below, so the fit is computed without a render-measure loop.
	type FitSize = 'lg' | 'md' | 'sm';
	const ORDER: FitSize[] = ['lg', 'md', 'sm'];
	const TILE_W: Record<FitSize, number> = { lg: 54, md: 42, sm: 30 };
	const WITHIN_GAP: Record<FitSize, number> = { lg: 8, md: 4, sm: 4 };
	const INTER_GAP: Record<FitSize, number> = { lg: 16, md: 8, sm: 8 };

	function rowWidthFor(size: FitSize, groups: IndexedTile[][]): number {
		let w = TILE_W[size]; // trailing add-slot
		for (const g of groups) {
			w += g.length * TILE_W[size] + Math.max(0, g.length - 1) * WITHIN_GAP[size];
		}
		w += groups.length * INTER_GAP[size]; // gaps between groups + one before the slot
		return w;
	}

	let availWidth = $state(0);
	const tileSize = $derived.by<FitSize>(() => {
		if (availWidth <= 0) return 'md';
		for (const s of ORDER) if (rowWidthFor(s, groupedHand) <= availWidth) return s;
		return 'sm';
	});
	const groupGap = $derived(tileSize === 'lg' ? 'gap-2' : 'gap-1');
	const interGroupGap = $derived(tileSize === 'lg' ? 'gap-4' : 'gap-2');

	const suggestedSrcIndex = $derived.by(() => {
		if (!suggestedDiscard) return -1;
		for (let i = 0; i < hand.length; i++) {
			if (queuedSet.has(i)) continue;
			if (tileEquals(hand[i], suggestedDiscard)) return i;
		}
		return -1;
	});
	function isSuggested(srcIndex: number): boolean {
		return srcIndex === suggestedSrcIndex;
	}
	function isQueued(srcIndex: number): boolean {
		return queuedSet.has(srcIndex);
	}
</script>

<section
	class="p-4 px-6 bg-bg rounded-panel border border-transparent transition-[border-color] duration-200 ease-out-quart
	       max-sm:p-3
	       {focused ? 'border-accent-soft' : ''}"
>
	<header class="flex items-baseline gap-4 mb-3 flex-wrap">
		<button
			class="inline-flex items-center gap-2 text-base font-semibold text-ink tracking-tight"
			type="button"
			onclick={() => store.setFocus({ kind: 'hand' })}
			aria-pressed={focused}
		>
			<span
				class="w-[6px] h-[6px] rounded-full {focused ? 'bg-accent' : 'bg-ink-faint'}"
				aria-hidden="true"
			></span>
			Your hand
			<span class="numeric text-sm font-medium text-ink-faint">{hand.length}</span>
		</button>
		<span class="text-xs italic text-ink-faint max-sm:hidden">
			{#if sentFocused}
				click a tile to queue it for the pass · click again to unqueue
			{:else if receivedFocused}
				received tiles come from the palette — click the dashed slot in Received
			{:else}
				click a tile to remove · click the dashed slot to keep adding
			{/if}
		</span>
		<div
			class="ml-auto inline-flex gap-[2px] p-[2px] bg-bg-sunk rounded-chip border border-line"
			role="radiogroup"
			aria-label="sort mode"
		>
			{#each ['order', 'identity'] as const as mode (mode)}
				<button
					type="button"
					class="text-xs font-medium px-2 py-[2px] rounded-chip text-ink-soft
					       transition-colors duration-[180ms] ease-out-quart hover:text-ink
					       {sortMode === mode
						? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
						: ''}"
					role="radio"
					aria-checked={sortMode === mode}
					onclick={() => (sortMode = mode)}
				>
					{mode}
				</button>
			{/each}
		</div>
	</header>

	<div class="flex {interGroupGap} items-end min-w-0" bind:clientWidth={availWidth}>
		{#each groupedHand as group, gi (gi)}
			<div class="flex {groupGap} items-end">
				{#each group as item (item.srcIndex)}
					<Tile
						tile={item.tile}
						size={tileSize}
						state={isQueued(item.srcIndex)
							? 'ghost'
							: isSuggested(item.srcIndex)
								? 'suggested'
								: 'idle'}
						title={isQueued(item.srcIndex)
							? 'queued for the current charleston pass · click to unqueue'
							: isSuggested(item.srcIndex)
								? sentFocused
									? 'engine suggests passing this next'
									: 'engine suggests discarding this tile'
								: sentFocused
									? 'click to queue this tile for the current charleston pass'
									: undefined}
						onclick={() => handleTileClick(item.srcIndex)}
					/>
				{/each}
			</div>
		{/each}
		<TileSlot
			size={tileSize}
			{focused}
			label="add tile to hand"
			onclick={() => store.setFocus({ kind: 'hand' })}
		/>
	</div>
</section>
