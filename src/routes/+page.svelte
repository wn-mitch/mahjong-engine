<script lang="ts">
	import { base } from '$app/paths';
	import GameTable from '$lib/components/game/GameTable.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import TileStyleToggle from '$lib/components/TileStyleToggle.svelte';
	import { createGameStore } from '$lib/state/gameStore.svelte';
	import { provideGame } from '$lib/state/gameContext';
	import { createMediaQuery, DESKTOP_QUERY } from '$lib/state/media.svelte';

	const game = createGameStore('nmjl-2026');
	provideGame(game);

	// On mobile the log and card are bottom sheets, so only one shows at a time: opening one closes
	// the other. On desktop they are side columns and both can stay open.
	const desktop = createMediaQuery(DESKTOP_QUERY);
	function tapLog() {
		if (!desktop.matches && !game.logOpen && game.cardOpen) game.toggleCard();
		game.toggleLog();
	}
	function tapCard() {
		if (!desktop.matches && !game.cardOpen && game.logOpen) game.toggleLog();
		game.toggleCard();
	}
</script>

<svelte:head>
	<title>mahjong-engine — play</title>
</svelte:head>

<header
	class="grid items-center gap-6 p-4 px-6 border-b border-line grid-cols-[auto_1fr] max-sm:px-4"
>
	<div class="grid">
		<span class="text-base font-semibold tracking-tight whitespace-nowrap">mahjong-engine</span>
		<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
			NMJL 2026 · you vs three
		</span>
	</div>
	<nav class="flex flex-wrap items-center gap-x-4 gap-y-2 justify-self-end">
		<div
			class="inline-flex gap-[2px] p-[2px] bg-bg-sunk rounded-chip border border-line"
			role="group"
			aria-label="View options"
		>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.logOpen
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.logOpen}
				onclick={tapLog}
			>
				Log
			</button>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.cardOpen
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.cardOpen}
				onclick={tapCard}
			>
				Card
			</button>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.hintOn
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.hintOn}
				onclick={() => game.toggleHint()}
			>
				Hint
			</button>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.revealed
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.revealed}
				onclick={() => game.toggleReveal()}
			>
				Reveal
			</button>
		</div>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-ink transition-colors duration-150"
			onclick={() => game.newGame()}
		>
			New game
		</button>
		<a
			href="{base}/studio"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-accent"
		>
			Position studio →
		</a>
		<TileStyleToggle />
		<ThemeToggle />
	</nav>
</header>

<GameTable />
