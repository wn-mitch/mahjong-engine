<script lang="ts">
	import OpponentSeat from './OpponentSeat.svelte';
	import DiscardRiver from './DiscardRiver.svelte';
	import PlayerHand from './PlayerHand.svelte';
	import ClaimPrompt from './ClaimPrompt.svelte';
	import EndBanner from './EndBanner.svelte';
	import CardTargets from './CardTargets.svelte';
	import GameLog from './GameLog.svelte';
	import MobileSheet from './MobileSheet.svelte';
	import { useGame } from '$lib/state/gameContext';
	import { createMediaQuery, DESKTOP_QUERY } from '$lib/state/media.svelte';
	import type { SeatId } from '$lib/engine/game';

	const game = useGame();

	// Above this width the log and card sit as side columns; below it they become bottom sheets.
	const desktop = createMediaQuery(DESKTOP_QUERY);

	// Top band read left→right as Left / Across / Right, mirroring a seat at the table.
	const opponents: SeatId[] = [3, 2, 1];

	const inClaim = $derived(game.interaction.kind === 'claim');
	const ended = $derived(game.phase === 'ended');

	// Sheets are one-at-a-time on mobile (the header toggles enforce that when opening). Resizing
	// down from desktop, where both columns are open, would otherwise stack two sheets — so collapse
	// both to a clean game view when that happens.
	$effect(() => {
		if (!desktop.matches && game.logOpen && game.cardOpen) {
			game.toggleLog();
			game.toggleCard();
		}
	});

	// The log occupies a left column and the card a right one; the center play area flexes
	// between them. Width caps grow as columns are added so the play area keeps its breathing room.
	const layout = $derived.by(() => {
		if (game.logOpen && game.cardOpen)
			return 'max-w-[1900px] grid-cols-[16rem_minmax(0,1fr)_24rem] max-lg:grid-cols-1';
		if (game.logOpen) return 'max-w-[1440px] grid-cols-[16rem_minmax(0,1fr)] max-lg:grid-cols-1';
		if (game.cardOpen)
			return 'max-w-[1680px] grid-cols-[minmax(0,1fr)_24rem] max-lg:grid-cols-1';
		return 'max-w-[1200px] grid-cols-1';
	});
</script>

<main class="mx-auto grid gap-6 p-6 content-start max-sm:p-3 max-sm:gap-3 {layout}">
	{#if game.logOpen && desktop.matches}
		<aside class="sticky top-6 self-start max-lg:static">
			<GameLog />
		</aside>
	{/if}

	<!-- Card-table column: opponents → discards → hand as one tight cluster, top-aligned so the
	     three columns share a top edge. The hand centers horizontally within the tray. -->
	<div class="flex flex-col gap-4 min-w-0">
		{#if ended}
			<EndBanner />
		{/if}

		<!-- Opponents ring the top of the cluster, demoted into the sunk tone. -->
		<section class="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
			{#each opponents as seat (seat)}
				<OpponentSeat {seat} />
			{/each}
		</section>

		<!-- Table center: the focal shared state. The claim prompt sits here because it
		     concerns a tile resting on the table. -->
		<DiscardRiver />

		{#if inClaim}
			<ClaimPrompt />
		{/if}

		<!-- Player tray: hand fused with its turn status and actions. -->
		<PlayerHand />
	</div>

	{#if game.cardOpen && desktop.matches}
		<aside class="sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto max-lg:static max-lg:max-h-none">
			<CardTargets />
		</aside>
	{/if}
</main>

{#if !desktop.matches}
	{#if game.logOpen}
		<MobileSheet label="Log" onclose={() => game.toggleLog()}>
			<GameLog />
		</MobileSheet>
	{/if}
	{#if game.cardOpen}
		<MobileSheet label="The card" onclose={() => game.toggleCard()}>
			<CardTargets />
		</MobileSheet>
	{/if}
{/if}
