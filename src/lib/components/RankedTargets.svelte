<script lang="ts">
	import Tile from './Tile.svelte';
	import { useStore } from '$lib/state/context';
	import type { PatternSlot, TargetEvaluation } from '$lib/engine/ruleset';

	const store = useStore();

	const ranked = $derived(store.evaluation.slice(0, 12));
	const pinned = $derived(store.pinnedTargetId);

	const isOnboarding = $derived(
		store.state.self.hand.length === 0 &&
			store.state.self.exposures.length === 0 &&
			store.state.opponents.left.length === 0 &&
			store.state.opponents.across.length === 0 &&
			store.state.opponents.right.length === 0 &&
			store.state.discards.length === 0
	);

	function fmtScore(n: number): string {
		if (!Number.isFinite(n)) return '—';
		return n.toFixed(2);
	}

	function groupSlots(slots: PatternSlot[]): PatternSlot[][] {
		const out: PatternSlot[][] = [];
		for (const slot of slots) {
			const last = out[out.length - 1];
			if (!last || last[0].groupIndex !== slot.groupIndex) out.push([slot]);
			else last.push(slot);
		}
		return out;
	}

	function describeTarget(t: TargetEvaluation): string {
		const need = t.tilesNeeded.length;
		const joker = t.jokerSlotsRemaining;
		const parts: string[] = [];
		if (need === 0) parts.push('complete');
		else if (need === 1) parts.push('needs 1 tile');
		else parts.push(`needs ${need} tiles`);
		if (joker > 0) parts.push(`${joker} joker slot${joker === 1 ? '' : 's'}`);
		if (t.notes) parts.push(t.notes);
		return parts.join(' · ');
	}
</script>

<section
	class="bg-bg-raised border border-line rounded-panel p-4 min-w-0 flex flex-col min-h-0"
>
	<header class="flex items-baseline justify-between mb-3">
		<h2 class="m-0 text-base font-semibold tracking-tight">Ranked targets</h2>
		{#if pinned && !isOnboarding}
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.08em] text-accent-ink hover:text-accent"
				onclick={() => store.pinTarget(null)}
			>
				clear pin
			</button>
		{/if}
	</header>

	{#if isOnboarding}
		<div class="grid gap-3">
			<p class="m-0 text-base font-semibold text-ink tracking-tight leading-snug">
				Build a position to see the engine read it.
			</p>
			<p class="m-0 text-sm text-ink-soft italic leading-normal">
				Pick tiles from the palette, or start from a known position.
			</p>
			<ul
				class="list-none p-0 m-0 grid gap-2 pt-2 border-t border-line"
			>
				<li class="m-0">
					<button
						type="button"
						class="text-sm font-medium text-ink-soft py-1 text-left w-full hover:text-accent"
						onclick={() => store.randomPosition()}
					>
						Random position
					</button>
				</li>
				<li class="m-0">
					<button
						type="button"
						class="text-sm font-medium text-ink-soft py-1 text-left w-full hover:text-accent"
						onclick={() => store.setJsonEditorOpen(true)}
					>
						Paste position JSON
					</button>
				</li>
				<li class="m-0">
					<button
						type="button"
						class="text-sm font-medium text-ink-soft py-1 text-left w-full hover:text-accent"
						onclick={() => store.setFocus({ kind: 'hand' })}
					>
						Start with your hand →
					</button>
				</li>
			</ul>
		</div>
	{:else if ranked.length === 0}
		<p class="text-sm text-ink-faint italic">
			No hands enumerated. Add a tile or select a different ruleset.
		</p>
	{:else}
		<ol class="list-none p-0 m-0 flex flex-col min-h-0 gap-1">
			{#each ranked as evaluation, i (evaluation.target.id)}
				{@const isPinned = pinned === evaluation.target.id}
				{@const isTop = i === 0 && !pinned}
				{@const featured = isTop || isPinned}
				{@const expanded = i < 3 || isPinned}
				{@const accentText = featured ? 'text-accent-ink' : 'text-ink-faint'}
				{@const groups = groupSlots(evaluation.patternSlots)}
				<li
					class="py-3 border-b border-line last:border-b-0
					       {featured ? 'bg-accent-soft/50 -mx-4 px-4' : ''}"
				>
					<button
						type="button"
						class="grid grid-cols-[1.6rem_1fr] gap-x-3 gap-y-1 w-full text-left p-0"
						onclick={() => store.pinTarget(evaluation.target.id)}
						aria-pressed={isPinned}
						title={isPinned ? 'click to unpin' : 'click to pin as the engine’s target'}
					>
						<span class="numeric text-base font-semibold {accentText} leading-tight">
							{i + 1}
						</span>
						<span class="flex items-baseline gap-3 min-w-0">
							<span class="flex-1 text-sm font-medium text-ink tracking-tight leading-snug line-clamp-2">
								{evaluation.target.description}
							</span>
							<span class="numeric text-base font-semibold shrink-0 {accentText}">
								{fmtScore(evaluation.completionScore)}
							</span>
						</span>
						<span class="col-start-2 text-xs text-ink-soft italic leading-normal">
							{describeTarget(evaluation)}
						</span>
						<span
							class="col-start-2 relative block h-[3px] bg-line rounded-[1.5px] overflow-hidden mt-[2px]
							       after:content-[''] after:absolute after:left-0 after:top-0 after:h-full after:rounded-[1.5px]
							       after:w-[var(--fill,0%)] after:transition-[width] after:duration-300 after:ease-out-quart
							       {featured ? 'after:bg-accent' : 'after:bg-ink'}"
							style:--fill="{Math.max(0, Math.min(1, evaluation.completionScore)) * 100}%"
						></span>
					</button>

					{#if groups.length > 0}
						<div class="pl-[calc(1.6rem+0.75rem)] mt-2">
							{#if expanded}
								<div class="flex flex-wrap gap-3 items-center">
									{#each groups as group, gi (gi)}
										<div class="flex gap-[3px]">
											{#each group as slot, j (j)}
												{#if slot.status === 'needed'}
													<Tile tile={slot.tile} size="xs" state={featured ? 'needed' : 'idle'} />
												{:else if slot.status === 'joker-filled'}
													<Tile tile={slot.tile} size="xs" state="ghost" jokerMark />
												{:else}
													<Tile tile={slot.tile} size="xs" state="ghost" />
												{/if}
											{/each}
										</div>
									{/each}
								</div>
							{:else}
								<div class="flex flex-wrap gap-[5px] items-center" aria-hidden="true">
									{#each groups as group, gi (gi)}
										{@const satisfied = group.every((s) => s.status !== 'needed')}
										<span
											class="block h-[3px] w-[14px] rounded-full {satisfied
												? 'bg-ink-soft'
												: 'bg-line'}"
										></span>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>
