<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import { useGame } from '$lib/state/gameContext';
	import type { CharlestonDirection } from '$lib/engine/gameState';

	const game = useGame();

	const DIRECTION_PHRASE: Record<CharlestonDirection, string> = {
		right: 'to your right',
		across: 'across the table',
		left: 'to your left',
		courtesy: 'across the table'
	};

	const kind = $derived(game.interaction.kind);
	const dir = $derived(game.charlestonDirection);
	const ready = $derived(game.queuedIndices.size === game.passTarget);
</script>

<section class="grid gap-3 p-4 px-6 rounded-panel border border-line bg-bg-raised max-sm:px-4">
	{#if kind === 'charleston-pass' && dir}
		<div class="grid gap-1">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Charleston{game.isOptionalStep ? ' · second' : ''}
			</span>
			<span class="text-lg font-semibold tracking-tight text-ink">
				Pass three tiles {DIRECTION_PHRASE[dir]}
			</span>
		</div>
		<div class="flex items-center gap-3 flex-wrap">
			<button
				type="button"
				class="text-sm font-medium px-4 py-2 rounded-chip bg-accent text-bg
				       transition-colors duration-150 hover:bg-accent-ink disabled:opacity-40 disabled:cursor-default"
				disabled={!ready}
				onclick={() => game.commitCharlestonPass()}
			>
				Pass {game.queuedIndices.size}/3
			</button>
			{#if game.hintOn && game.suggestedTiles.length > 0}
				<span class="inline-flex items-center gap-2 text-xs italic text-ink-soft">
					engine would pass
					{#each game.suggestedTiles as tile, i (i)}
						<Tile {tile} size="sm" />
					{/each}
				</span>
			{:else}
				<span class="text-xs italic text-ink-faint">choose three tiles from your hand below</span>
			{/if}
		</div>
	{:else if kind === 'charleston-vote'}
		<div class="grid gap-1">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Second charleston
			</span>
			<span class="text-lg font-semibold tracking-tight text-ink">
				Pass another round? The whole table must agree.
			</span>
		</div>
		<div class="flex gap-3">
			<button
				type="button"
				class="text-sm font-medium px-4 py-2 rounded-chip bg-accent text-bg transition-colors duration-150 hover:bg-accent-ink"
				onclick={() => game.voteSecondCharleston(true)}
			>
				Pass again
			</button>
			<button
				type="button"
				class="text-sm font-medium px-4 py-2 rounded-chip bg-bg-raised text-ink border border-line transition-colors duration-150 hover:border-line-strong"
				onclick={() => game.voteSecondCharleston(false)}
			>
				Stop here
			</button>
		</div>
	{:else if kind === 'charleston-courtesy-count'}
		<div class="grid gap-1">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Courtesy pass
			</span>
			<span class="text-lg font-semibold tracking-tight text-ink">
				How many tiles to trade across?
			</span>
			<span class="text-xs italic text-ink-faint">
				you and the player across each pass the same count (the lower of your two choices)
			</span>
		</div>
		<div class="flex gap-2">
			{#each [0, 1, 2, 3] as n (n)}
				<button
					type="button"
					class="numeric text-sm font-medium w-10 py-2 rounded-chip bg-bg-raised text-ink border border-line transition-colors duration-150 hover:border-line-strong"
					onclick={() => game.setCourtesyCount(n)}
				>
					{n}
				</button>
			{/each}
		</div>
	{:else if kind === 'charleston-courtesy-pass'}
		<div class="grid gap-1">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Courtesy pass
			</span>
			<span class="text-lg font-semibold tracking-tight text-ink">
				Choose {game.passTarget} tile{game.passTarget === 1 ? '' : 's'} to send across
			</span>
		</div>
		<div class="flex items-center gap-3 flex-wrap">
			<button
				type="button"
				class="text-sm font-medium px-4 py-2 rounded-chip bg-accent text-bg transition-colors duration-150 hover:bg-accent-ink disabled:opacity-40 disabled:cursor-default"
				disabled={!ready}
				onclick={() => game.commitCourtesy()}
			>
				Pass {game.queuedIndices.size}/{game.passTarget}
			</button>
		</div>
	{/if}
</section>
