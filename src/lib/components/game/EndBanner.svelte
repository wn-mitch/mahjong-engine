<script lang="ts">
	import { useGame } from '$lib/state/gameContext';

	const game = useGame();
	const result = $derived(game.result);

	const headline = $derived.by(() => {
		if (!result) return '';
		if (result.kind === 'wall-exhausted') return 'Wall exhausted — the hand is a draw';
		if (result.winner === 0) return 'You won the hand';
		return `${game.seatLabel(result.winner!)} won the hand`;
	});

	const detail = $derived.by(() => {
		if (!result || result.kind !== 'mahjong') return '';
		return result.fromDiscard ? 'by claiming a discard' : 'by self-draw';
	});

	const humanWon = $derived(result?.kind === 'mahjong' && result.winner === 0);
</script>

{#if result}
	<section
		class="grid gap-3 p-5 px-6 rounded-panel border {humanWon
			? 'bg-need-soft border-need'
			: 'bg-bg-raised border-line'}"
	>
		<div class="grid gap-1">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Hand over
			</span>
			<span class="text-2xl font-semibold tracking-tight text-ink">{headline}</span>
			{#if detail}
				<span class="text-sm italic text-ink-soft">{detail}</span>
			{/if}
		</div>
		<div>
			<button
				type="button"
				class="text-sm font-medium px-4 py-2 rounded-chip bg-accent text-bg transition-colors duration-150 hover:bg-accent-ink"
				onclick={() => game.newGame()}
			>
				New game
			</button>
		</div>
	</section>
{/if}
