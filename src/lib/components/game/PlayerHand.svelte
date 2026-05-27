<script lang="ts">
	import Tile, { type TileState } from '$lib/components/Tile.svelte';
	import Meld from './Meld.svelte';
	import CharlestonControls from './CharlestonControls.svelte';
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

	const inCharleston = $derived(game.interaction.kind.startsWith('charleston'));

	const mode = $derived.by<'discard' | 'charleston' | 'idle'>(() => {
		const k = game.interaction.kind;
		if (k === 'human-turn') return 'discard';
		if (k === 'charleston-pass' || k === 'charleston-courtesy-pass') return 'charleston';
		return 'idle';
	});

	// The non-charleston turn status. Charleston states are owned by CharlestonControls, which
	// renders its own richer prompt inside this tray.
	const playStatus = $derived.by(() => {
		const k = game.interaction.kind;
		if (k === 'human-turn') return 'Your turn · discard a tile';
		if (k === 'bot-thinking') return `${game.seatLabel(game.turn)} is playing…`;
		if (k === 'claim') return 'A discard is on offer';
		return '';
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

	// Pick the largest tile size whose single-line row fits the available width, so the hand
	// never wraps to a second row. Constants mirror the SIZE map in Tile.svelte and the gap
	// classes below. The game hand is a flat sorted row (no suit groups, no trailing add-slot).
	type FitSize = 'lg' | 'md' | 'sm';
	const ORDER: FitSize[] = ['lg', 'md', 'sm'];
	const TILE_W: Record<FitSize, number> = { lg: 54, md: 42, sm: 30 };
	const GAP: Record<FitSize, number> = { lg: 8, md: 4, sm: 4 };

	function rowWidth(size: FitSize, n: number): number {
		return n * TILE_W[size] + Math.max(0, n - 1) * GAP[size];
	}

	let availWidth = $state(0);
	const tileSize = $derived.by<FitSize>(() => {
		const n = sorted.length;
		if (availWidth <= 0 || n === 0) return 'lg';
		for (const s of ORDER) if (rowWidth(s, n) <= availWidth) return s;
		return 'sm';
	});
	const handGap = $derived(tileSize === 'lg' ? 'gap-2' : 'gap-1');
</script>

<section class="grid gap-3 p-4 px-6 bg-bg-raised rounded-panel border border-line max-sm:px-3">
	{#if inCharleston}
		<div class="pb-3 border-b border-line">
			<CharlestonControls />
		</div>
	{:else if playStatus}
		<div class="flex items-center gap-4 flex-wrap pb-3 border-b border-line">
			<span class="text-sm font-semibold text-ink">{playStatus}</span>
			{#if game.canDeclareMahjong}
				<button
					type="button"
					class="text-sm font-medium px-4 py-2 rounded-chip bg-accent text-bg transition-colors duration-150 hover:bg-accent-ink"
					onclick={() => game.declareMahjong()}
				>
					Declare mahjong
				</button>
			{/if}
			{#if game.hintOn && game.engineSuggestion}
				<span class="inline-flex items-center gap-2 text-xs italic text-ink-soft ml-auto">
					engine would discard
					<Tile tile={game.engineSuggestion} size="sm" />
				</span>
			{/if}
		</div>
	{/if}

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

	<div class="flex {handGap} items-end min-w-0" bind:clientWidth={availWidth}>
		{#each sorted as item (item.srcIndex)}
			<Tile
				tile={item.tile}
				size={tileSize}
				state={tileStateFor(item.srcIndex)}
				onclick={mode === 'idle' ? undefined : () => clickTile(item)}
			/>
		{/each}
	</div>
</section>
