<script lang="ts">
	import Tile from './Tile.svelte';
	import TileSlot from './TileSlot.svelte';
	import CharlestonArrow from './CharlestonArrow.svelte';
	import { useStore } from '$lib/state/context';
	import { nextCharlestonDirection } from '$lib/state/positionStore.svelte';
	import type { CharlestonDirection } from '$lib/engine/gameState';

	const store = useStore();

	const passes = $derived(store.state.charleston.passes);
	const nextDir = $derived<CharlestonDirection | null>(
		nextCharlestonDirection(passes.length)
	);
	const sent = $derived(store.charlestonSent);
	const received = $derived(store.charlestonReceived);

	const sentFocused = $derived(store.focus.kind === 'charleston-sent');
	const receivedFocused = $derived(store.focus.kind === 'charleston-received');

	const requiredCount = $derived(nextDir === 'courtesy' ? sent.length : 3);
	const canCommit = $derived(
		nextDir !== null &&
			sent.length === received.length &&
			(nextDir === 'courtesy' ? sent.length <= 3 : sent.length === 3)
	);

	let suggestionState = $state<{ direction: CharlestonDirection; text: string } | null>(null);
	let commitError = $state<string | null>(null);

	const DIRECTION_LABEL: Record<CharlestonDirection, string> = {
		right: 'Right',
		across: 'Across',
		left: 'Left',
		courtesy: 'Courtesy'
	};

	const ORDER: CharlestonDirection[] = ['right', 'across', 'left', 'courtesy'];

	function suggest() {
		if (!nextDir) return;
		// Clear queued tiles BEFORE asking the engine, so it reasons over the full hand. The
		// suggester reads `effectiveState`, which equals the full state once the buffer is
		// empty — keeping the ranking the user sees consistent with the pass that's chosen.
		store.clearCharlestonBuffers();
		const s = store.suggestCharlestonPass(nextDir);
		if (s.tiles.length === 0) {
			suggestionState = { direction: nextDir, text: s.rationale };
			return;
		}
		for (const t of s.tiles) {
			store.setFocus({ kind: 'charleston-sent' });
			store.addTile(t);
		}
		suggestionState = { direction: nextDir, text: s.rationale };
	}

	function commit() {
		if (!nextDir) return;
		commitError = null;
		const result = store.commitCharlestonPass(nextDir, [...sent], [...received]);
		if (!result.ok) {
			commitError = result.error;
			return;
		}
		suggestionState = null;
	}

	function undo() {
		store.undoCharlestonPass();
		store.clearCharlestonBuffers();
		suggestionState = null;
		commitError = null;
	}

	function skipCourtesy() {
		commitError = null;
		const result = store.commitCharlestonPass('courtesy', [], []);
		if (!result.ok) commitError = result.error;
		else suggestionState = null;
	}

</script>

<section class="px-6 py-3 max-sm:px-4 bg-bg-sunk rounded-panel">
	<header class="mb-3 flex items-center justify-between gap-3">
		<span
			class="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft"
		>
			<span class="w-[5px] h-[5px] rounded-full bg-ink-faint" aria-hidden="true"></span>
			Charleston
		</span>
		<div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]">
			{#each ORDER as dir, i (dir)}
				{@const done = i < passes.length}
				{@const active = i === passes.length}
				<span
					class="px-2 py-1 rounded-chip border
					       {done
						? 'border-line text-ink-faint bg-bg-raised line-through'
						: active
							? 'border-accent text-accent-ink bg-accent-soft'
							: 'border-line text-ink-faint bg-transparent'}"
				>
					{DIRECTION_LABEL[dir]}
				</span>
			{/each}
		</div>
	</header>

	{#if nextDir === null}
		<p class="text-sm text-ink-soft italic">Charleston complete. Switch phase to Play.</p>
	{:else}
		<div class="grid gap-3">
			<div class="flex items-center gap-3 flex-wrap">
				<button
					type="button"
					class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
					onclick={suggest}
				>
					suggest pass ({DIRECTION_LABEL[nextDir].toLowerCase()})
				</button>
				<button
					type="button"
					class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent disabled:text-ink-faint disabled:cursor-not-allowed"
					disabled={nextDir === 'courtesy' && sent.length === 0}
					title={nextDir === 'courtesy' && sent.length === 0
						? 'queue sent tiles first to determine how many to receive'
						: 'draw random tiles from the unseen pool to simulate what opponents pass you'}
					onclick={() => store.fillRandomReceived(nextDir)}
				>
					received random
				</button>
				{#if nextDir === 'courtesy'}
					<button
						type="button"
						class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
						onclick={skipCourtesy}
					>
						skip courtesy
					</button>
				{/if}
				{#if passes.length > 0}
					<button
						type="button"
						class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
						onclick={undo}
					>
						undo last pass
					</button>
				{/if}
			</div>

			{#if suggestionState && suggestionState.direction === nextDir}
				<p class="text-xs text-ink-soft italic">{suggestionState.text}</p>
			{/if}

			<div class="grid grid-cols-[6rem_1fr] items-center gap-2 max-sm:grid-cols-1 max-sm:items-start max-sm:gap-1">
				<button
					type="button"
					class="text-xs font-semibold uppercase tracking-[0.08em] text-left
					       {sentFocused ? 'text-accent' : 'text-ink-faint'}"
					onclick={() => store.setFocus({ kind: 'charleston-sent' })}
				>
					Sent → {DIRECTION_LABEL[nextDir].toLowerCase()}
				</button>
				<div class="flex flex-wrap gap-[4px] items-center">
					{#each sent as tile, i (i)}
						<Tile {tile} size="sm" onclick={() => store.removeFromCharlestonSent(i)} />
					{/each}
					{#if sent.length < 3}
						<TileSlot
							size="sm"
							focused={sentFocused}
							label="add tile to charleston sent"
							onclick={() => store.setFocus({ kind: 'charleston-sent' })}
						/>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-[6rem_1fr] items-center gap-2 max-sm:grid-cols-1 max-sm:items-start max-sm:gap-1">
				<button
					type="button"
					class="text-xs font-semibold uppercase tracking-[0.08em] text-left
					       {receivedFocused ? 'text-accent' : 'text-ink-faint'}"
					onclick={() => store.setFocus({ kind: 'charleston-received' })}
				>
					Received ← {DIRECTION_LABEL[nextDir].toLowerCase()}
				</button>
				<div class="flex flex-wrap gap-[4px] items-center">
					{#each received as tile, i (i)}
						<Tile {tile} size="sm" onclick={() => store.removeFromCharlestonReceived(i)} />
					{/each}
					{#if received.length < 3}
						<TileSlot
							size="sm"
							focused={receivedFocused}
							label="add tile to charleston received"
							onclick={() => store.setFocus({ kind: 'charleston-received' })}
						/>
					{/if}
				</div>
			</div>

			<div class="flex items-center justify-between gap-3">
				<span class="text-xs text-ink-faint">
					{sent.length}/{requiredCount} sent · {received.length}/{requiredCount} received
				</span>
				<button
					type="button"
					class="text-sm font-medium px-4 py-2 rounded-chip
					       {canCommit
						? 'bg-accent text-bg hover:bg-accent-ink'
						: 'bg-bg-raised border border-line text-ink-faint cursor-not-allowed'}"
					disabled={!canCommit}
					onclick={commit}
				>
					commit pass
				</button>
			</div>

			{#if commitError}
				<p class="text-sm text-error m-0">{commitError}</p>
			{/if}
		</div>
	{/if}

	{#if passes.length > 0}
		<div class="mt-3 pt-3 border-t border-line grid gap-2">
			<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">History</span>
			<ul class="list-none p-0 m-0 grid gap-2">
				{#each passes as p, i (i)}
					<li class="flex items-center gap-3 flex-wrap text-xs">
						<span class="font-semibold uppercase tracking-[0.08em] text-ink-soft min-w-[5rem]">
							{DIRECTION_LABEL[p.direction]}
						</span>
						<CharlestonArrow variant="pass" direction={p.direction} />
						<div class="flex gap-[3px]">
							{#each p.sentTiles as tile, j (j)}
								<Tile {tile} size="xs" />
							{/each}
						</div>
						<CharlestonArrow variant="receive" />
						<div class="flex gap-[3px]">
							{#each p.receivedTiles as tile, j (j)}
								<Tile {tile} size="xs" />
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
