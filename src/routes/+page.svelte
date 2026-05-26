<script lang="ts">
	import GameTable from '$lib/components/game/GameTable.svelte';
	import { createGameStore } from '$lib/state/gameStore.svelte';
	import { provideGame } from '$lib/state/gameContext';

	const game = createGameStore('nmjl-2026');
	provideGame(game);
</script>

<svelte:head>
	<title>mahjong-engine — play</title>
</svelte:head>

<header
	class="grid items-center gap-6 p-4 px-6 border-b border-line grid-cols-[auto_1fr] max-sm:px-4"
>
	<div class="grid">
		<span class="text-base font-semibold tracking-tight">mahjong-engine</span>
		<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
			NMJL 2026 · you vs three
		</span>
	</div>
	<nav class="justify-self-end">
		<a
			href="/studio"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-accent"
		>
			Position studio →
		</a>
	</nav>
</header>

<GameTable />
