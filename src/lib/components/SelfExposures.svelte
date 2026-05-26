<script lang="ts">
	import Tile from './Tile.svelte';
	import TileSlot from './TileSlot.svelte';
	import { useStore } from '$lib/state/context';

	const store = useStore();

	const exposures = $derived(store.state.self.exposures);

	function isFocused(i: number) {
		const f = store.focus;
		return f.kind === 'self-exposure' && f.index === i;
	}
</script>

<section class="px-6 py-2">
	<header class="flex flex-wrap items-baseline justify-between gap-3 mb-2">
		<span class="inline-flex items-center gap-2 text-base font-semibold text-ink">
			<span class="w-[6px] h-[6px] rounded-full bg-ink-faint" aria-hidden="true"></span>
			Your exposures
			<span class="numeric text-sm font-medium text-ink-faint">{exposures.length}</span>
		</span>
		<button
			type="button"
			class="text-sm text-ink-soft px-3 py-1 rounded-chip border border-line bg-bg-raised hover:text-accent hover:border-accent"
			onclick={() => store.addSelfExposureSlot()}
		>
			+ group
		</button>
	</header>

	{#if exposures.length === 0}
		<p class="text-xs text-ink-faint m-0 p-0 italic">No exposures yet.</p>
	{:else}
		<div class="flex flex-wrap gap-4">
			{#each exposures as exposure, i (i)}
				<div
					class="inline-grid grid-cols-[auto_1fr] items-center gap-2 p-2 rounded-[8px] transition-colors duration-[180ms] ease-out-quart
					       {isFocused(i) ? 'bg-accent-soft' : ''}"
				>
					<button
						type="button"
						class="w-[1.4em] h-[1.4em] inline-grid place-items-center text-xs rounded-full border border-dashed border-line-strong text-ink-faint
						       {isFocused(i) ? 'text-accent border-accent border-solid' : ''}"
						onclick={() => store.setFocus({ kind: 'self-exposure', index: i })}
					>
						<span class="numeric">{i + 1}</span>
					</button>
					<div class="flex gap-1">
						{#each exposure.tiles as tile, j (j)}
							<Tile {tile} size="md" onclick={() => store.removeFromSelfExposure(i, j)} />
						{/each}
						<TileSlot
							size="md"
							focused={isFocused(i)}
							label="add tile to this exposure"
							onclick={() => store.setFocus({ kind: 'self-exposure', index: i })}
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
