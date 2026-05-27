<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import { useGame } from '$lib/state/gameContext';
	import type { PatternSlot, TargetEvaluation } from '$lib/engine/ruleset';

	const game = useGame();
	const ranked = $derived(game.targets.slice(0, 12));

	function fmtScore(n: number): string {
		return Number.isFinite(n) ? n.toFixed(2) : '—';
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
		const parts: string[] = [];
		// `need === 0` is also true when no valid layout exists at all (score 0) — only call that
		// "complete" when the hand actually scored a win, otherwise it reads as a false positive.
		if (need === 0) parts.push(t.completionScore >= 1 ? 'complete' : 'unreachable');
		else if (need === 1) parts.push('needs 1 tile');
		else parts.push(`needs ${need} tiles`);
		if (t.jokerSlotsRemaining > 0)
			parts.push(`${t.jokerSlotsRemaining} joker slot${t.jokerSlotsRemaining === 1 ? '' : 's'}`);
		if (t.notes) parts.push(t.notes);
		return parts.join(' · ');
	}
</script>

<section class="bg-bg-raised border border-line rounded-panel p-4 min-w-0 flex flex-col">
	<header class="flex items-baseline justify-between gap-3 mb-3">
		<h2 class="m-0 text-base font-semibold tracking-tight">The card</h2>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-150
			       {game.allowConcealed ? 'text-accent-ink hover:text-accent' : 'text-ink-faint hover:text-ink-soft'}"
			aria-pressed={game.allowConcealed}
			title={game.allowConcealed
				? 'House rule on: concealed hands can be won after exposing. Click for standard rules.'
				: 'Standard: concealed hands hidden once you’ve exposed. Click to allow them (no-score play).'}
			onclick={() => game.toggleAllowConcealed()}
		>
			{game.allowConcealed ? 'concealed ✓' : 'best lines'}
		</button>
	</header>

	{#if ranked.length === 0}
		<p class="text-sm text-ink-faint italic">No hands enumerated for this position.</p>
	{:else}
		<ol class="list-none p-0 m-0 flex flex-col gap-1">
			{#each ranked as evaluation, i (evaluation.target.id)}
				{@const featured = i === 0}
				{@const expanded = i < 3}
				{@const accentText = featured ? 'text-accent-ink' : 'text-ink-faint'}
				{@const groups = groupSlots(evaluation.patternSlots)}
				<li class="py-3 border-b border-line last:border-b-0 {featured ? 'bg-accent-soft/50 -mx-4 px-4' : ''}">
					<div class="grid grid-cols-[1.6rem_1fr] gap-x-3 gap-y-1">
						<span class="numeric text-base font-semibold {accentText} leading-tight">{i + 1}</span>
						<span class="flex items-baseline gap-3 min-w-0">
							<span class="flex-1 text-sm font-medium text-ink tracking-tight leading-snug line-clamp-2">
								{evaluation.target.description}
							</span>
							<span class="numeric text-base font-semibold shrink-0 {accentText}">
								{fmtScore(evaluation.completionScore)}
							</span>
						</span>
						<span class="col-start-2 text-xs text-ink-soft italic leading-normal">
							{#if evaluation.target.concealed}
								<span
									class="not-italic font-semibold uppercase tracking-[0.06em] text-[0.65rem] text-accent-ink mr-1"
									title="Concealed hand — only winnable here because the concealed house rule is on"
								>
									concealed
								</span>
							{/if}
							{describeTarget(evaluation)}
						</span>
						<span
							class="col-start-2 relative block h-[3px] bg-line rounded-[1.5px] overflow-hidden mt-[2px]
							       after:content-[''] after:absolute after:left-0 after:top-0 after:h-full after:rounded-[1.5px]
							       after:w-[var(--fill,0%)] after:transition-[width] after:duration-300 after:ease-out-quart
							       {featured ? 'after:bg-accent' : 'after:bg-ink'}"
							style:--fill="{Math.max(0, Math.min(1, evaluation.completionScore)) * 100}%"
						></span>
					</div>

					{#if groups.length > 0 && expanded}
						<div class="pl-[calc(1.6rem+0.75rem)] mt-2">
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
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>
