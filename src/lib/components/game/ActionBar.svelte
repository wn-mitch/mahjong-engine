<script lang="ts">
	import { useGame } from '$lib/state/gameContext';
	import Tile from '$lib/components/Tile.svelte';

	const game = useGame();

	const status = $derived.by(() => {
		const k = game.interaction.kind;
		if (k === 'human-turn') return 'Your turn — discard a tile';
		if (k === 'bot-thinking') return `${game.seatLabel(game.turn)} is playing…`;
		if (k === 'claim') return 'A discard is on offer';
		if (k === 'charleston-pass') return 'Charleston — choose your pass';
		if (k === 'charleston-vote') return 'Charleston — second round?';
		if (k.startsWith('charleston-courtesy')) return 'Charleston — courtesy pass';
		return '';
	});
</script>

<section class="flex items-center gap-4 px-6 py-3 rounded-panel border border-line bg-bg-raised flex-wrap max-sm:px-4">
	<span class="text-sm font-semibold text-ink">{status}</span>

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
		<span class="inline-flex items-center gap-2 text-xs italic text-ink-soft">
			engine would discard
			<Tile tile={game.engineSuggestion} size="sm" />
		</span>
	{/if}

	<div class="flex items-center gap-4 ml-auto">
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] {game.cardOpen
				? 'text-ink'
				: 'text-ink-faint hover:text-ink-soft'}"
			aria-pressed={game.cardOpen}
			onclick={() => game.toggleCard()}
		>
			Card {game.cardOpen ? 'on' : 'off'}
		</button>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] {game.hintOn
				? 'text-ink'
				: 'text-ink-faint hover:text-ink-soft'}"
			aria-pressed={game.hintOn}
			onclick={() => game.toggleHint()}
		>
			Hint {game.hintOn ? 'on' : 'off'}
		</button>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] {game.revealed
				? 'text-ink'
				: 'text-ink-faint hover:text-ink-soft'}"
			aria-pressed={game.revealed}
			onclick={() => game.toggleReveal()}
		>
			Reveal {game.revealed ? 'on' : 'off'}
		</button>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-ink"
			onclick={() => game.newGame()}
		>
			New game
		</button>
	</div>
</section>
