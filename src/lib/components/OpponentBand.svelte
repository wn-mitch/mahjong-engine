<script lang="ts">
	import Tile from './Tile.svelte';
	import TileSlot from './TileSlot.svelte';
	import { useStore } from '$lib/state/context';
	import type { Opp } from '$lib/state/positionStore.svelte';

	const store = useStore();

	const seats: { opp: Opp; label: string }[] = [
		{ opp: 'left', label: 'Left' },
		{ opp: 'across', label: 'Across' },
		{ opp: 'right', label: 'Right' }
	];

	const allEmpty = $derived(
		store.state.opponents.left.length === 0 &&
			store.state.opponents.across.length === 0 &&
			store.state.opponents.right.length === 0
	);

	function isFocused(opp: Opp, i: number) {
		const f = store.focus;
		return f.kind === 'opp-exposure' && f.opp === opp && f.index === i;
	}
</script>

{#if allEmpty}
	<section
		class="flex items-center justify-between gap-4 px-6 py-2 bg-bg-sunk rounded-panel flex-wrap
		       max-sm:flex-col max-sm:items-start max-sm:gap-2"
	>
		<span
			class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft"
		>
			<span class="w-[5px] h-[5px] rounded-full bg-ink-faint" aria-hidden="true"></span>
			Opponents' exposures
		</span>
		<div class="flex gap-3 flex-wrap">
			{#each seats as seat (seat.opp)}
				<button
					type="button"
					class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
					onclick={() => store.addOppExposureSlot(seat.opp)}
				>
					+ {seat.label.toLowerCase()}
				</button>
			{/each}
		</div>
	</section>
{:else}
	<section class="px-6 py-3 bg-bg-sunk rounded-panel">
		<header class="mb-3">
			<span
				class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft"
			>
				<span class="w-[5px] h-[5px] rounded-full bg-ink-faint" aria-hidden="true"></span>
				Opponents' exposures
			</span>
		</header>

		<div class="grid grid-cols-3 gap-4 items-start max-sm:grid-cols-1">
			{#each seats as seat (seat.opp)}
				{@const exposures = store.state.opponents[seat.opp]}
				<div class="flex flex-col gap-2 min-w-0">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
							{seat.label}
						</span>
						<button
							type="button"
							class="w-[1.4em] h-[1.4em] inline-grid place-items-center text-sm leading-none text-ink-soft border border-line rounded-full bg-bg-raised hover:text-accent hover:border-accent"
							onclick={() => store.addOppExposureSlot(seat.opp)}
							aria-label="add exposure for {seat.label} player"
						>
							+
						</button>
					</div>
					{#if exposures.length === 0}
						<span class="text-sm text-ink-faint">—</span>
					{:else}
						<div class="flex flex-wrap gap-3">
							{#each exposures as ex, i (i)}
								<div
									class="px-2 py-1 rounded-[6px] transition-colors duration-[180ms] ease-out-quart
									       {isFocused(seat.opp, i) ? 'bg-accent-soft' : ''}"
								>
									<div class="flex gap-[3px]">
										{#each ex.tiles as tile, j (j)}
											<Tile
												{tile}
												size="sm"
												onclick={() => store.removeFromOppExposure(seat.opp, i, j)}
											/>
										{/each}
										<TileSlot
											size="sm"
											focused={isFocused(seat.opp, i)}
											label="add tile to {seat.label} player's exposure"
											onclick={() =>
												store.setFocus({ kind: 'opp-exposure', opp: seat.opp, index: i })}
										/>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}
