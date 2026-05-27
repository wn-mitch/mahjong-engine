<script lang="ts">
	import OpponentSeat from './OpponentSeat.svelte';
	import DiscardRiver from './DiscardRiver.svelte';
	import PlayerHand from './PlayerHand.svelte';
	import CharlestonControls from './CharlestonControls.svelte';
	import ClaimPrompt from './ClaimPrompt.svelte';
	import ActionBar from './ActionBar.svelte';
	import EndBanner from './EndBanner.svelte';
	import CardTargets from './CardTargets.svelte';
	import GameLog from './GameLog.svelte';
	import { useGame } from '$lib/state/gameContext';
	import type { SeatId } from '$lib/engine/game';

	const game = useGame();

	// Top band read left→right as Left / Across / Right, mirroring a seat at the table.
	const opponents: SeatId[] = [3, 2, 1];

	const inCharleston = $derived(game.interaction.kind.startsWith('charleston'));
	const inClaim = $derived(game.interaction.kind === 'claim');
	const ended = $derived(game.phase === 'ended');

	// The log occupies a left column and the card a right one; the center play area flexes
	// between them. Width caps grow as columns are added so the play area keeps its breathing room.
	const layout = $derived.by(() => {
		if (game.logOpen && game.cardOpen)
			return 'max-w-[1660px] grid-cols-[15rem_minmax(0,1fr)_22rem] max-lg:grid-cols-1';
		if (game.logOpen) return 'max-w-[1280px] grid-cols-[15rem_minmax(0,1fr)] max-lg:grid-cols-1';
		if (game.cardOpen)
			return 'max-w-[1480px] grid-cols-[minmax(0,1fr)_22rem] max-lg:grid-cols-1';
		return 'max-w-[1100px] grid-cols-1';
	});
</script>

<main class="mx-auto grid gap-6 p-6 content-start max-sm:p-3 max-sm:gap-3 {layout}">
	{#if game.logOpen}
		<aside class="sticky top-6 self-start max-lg:static">
			<GameLog />
		</aside>
	{/if}

	<div class="grid gap-4 content-start min-w-0 max-sm:pb-28">
		<section class="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
			{#each opponents as seat (seat)}
				<OpponentSeat {seat} />
			{/each}
		</section>

		<DiscardRiver />

		{#if ended}
			<EndBanner />
		{/if}

		{#if inClaim}
			<ClaimPrompt />
		{:else if inCharleston}
			<CharlestonControls />
		{/if}

		<ActionBar />

		<PlayerHand />
	</div>

	{#if game.cardOpen}
		<aside class="sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto max-lg:static max-lg:max-h-none">
			<CardTargets />
		</aside>
	{/if}
</main>
