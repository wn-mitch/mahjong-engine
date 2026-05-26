<script lang="ts">
	import Tile from './Tile.svelte';
	import { useStore } from '$lib/state/context';

	const store = useStore();

	const suggestion = $derived(store.suggestion);
	const topEval = $derived(store.topEval);
	const winning = $derived(store.isWinning);
	const handEmpty = $derived(store.state.self.hand.length === 0);
	const visible = $derived(
		winning || (!handEmpty && (suggestion.discard !== null || !!suggestion.rationale))
	);
	const topRank = $derived(topEval ? store.evaluation.indexOf(topEval) + 1 : null);
</script>

{#if visible}
	<aside
		class="grid gap-2 p-3 px-4 rounded-panel border border-line bg-bg-raised
		       {winning ? 'bg-need-soft border-need' : ''}"
		aria-live="polite"
	>
		{#if winning}
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Winning hand
			</span>
			<span class="text-lg font-semibold tracking-tight text-ink">
				{topEval?.target.description ?? 'a complete hand exists'}
			</span>
		{:else if suggestion.discard}
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Engine suggests discard
			</span>
			<div class="flex items-center gap-3 flex-wrap">
				<Tile tile={suggestion.discard} size="md" state="suggested" />
				<span class="text-sm italic text-ink leading-snug">{suggestion.rationale}</span>
			</div>
		{:else}
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Engine</span>
			<span class="text-sm italic text-ink leading-snug">{suggestion.rationale}</span>
		{/if}

		{#if topEval && !winning && topRank !== null}
			<div class="grid gap-[2px] pt-2 border-t border-line">
				<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
					working toward
				</span>
				<span class="text-sm font-medium text-ink-soft overflow-hidden text-ellipsis">
					#{topRank} · {topEval.target.description}
				</span>
				{#if store.pinnedTargetId}
					<span
						class="justify-self-start text-xs font-semibold uppercase tracking-[0.1em] text-accent-ink"
					>
						pinned
					</span>
				{/if}
			</div>
		{/if}
	</aside>
{/if}
