<script lang="ts">
	import OpponentSeat from './OpponentSeat.svelte';
	import DiscardRiver from './DiscardRiver.svelte';
	import PlayerHand from './PlayerHand.svelte';
	import CharlestonControls from './CharlestonControls.svelte';
	import ClaimPrompt from './ClaimPrompt.svelte';
	import ActionBar from './ActionBar.svelte';
	import EndBanner from './EndBanner.svelte';
	import CardTargets from './CardTargets.svelte';
	import { useGame } from '$lib/state/gameContext';
	import type { SeatId } from '$lib/engine/game';

	const game = useGame();

	// Top band read left→right as Left / Across / Right, mirroring a seat at the table.
	const opponents: SeatId[] = [3, 2, 1];

	const inCharleston = $derived(game.interaction.kind.startsWith('charleston'));
	const inClaim = $derived(game.interaction.kind === 'claim');
	const ended = $derived(game.phase === 'ended');
</script>

<main
	class="mx-auto grid gap-6 p-6 content-start max-sm:p-3 max-sm:gap-3
	       {game.cardOpen
		? 'max-w-[1480px] grid-cols-[minmax(0,1fr)_22rem] max-lg:grid-cols-1'
		: 'max-w-[1100px] grid-cols-1'}"
>
	<div class="grid gap-4 content-start min-w-0">
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
