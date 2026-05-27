<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';

	import Selectors from '$lib/components/Selectors.svelte';
	import Hand from '$lib/components/Hand.svelte';
	import SelfExposures from '$lib/components/SelfExposures.svelte';
	import OpponentBand from '$lib/components/OpponentBand.svelte';
	import DiscardPile from '$lib/components/DiscardPile.svelte';
	import RankedTargets from '$lib/components/RankedTargets.svelte';
	import EngineSuggestion from '$lib/components/EngineSuggestion.svelte';
	import TilePalette from '$lib/components/TilePalette.svelte';
	import PositionIO from '$lib/components/PositionIO.svelte';
	import CharlestonPanel from '$lib/components/CharlestonPanel.svelte';

	import { createPositionStore } from '$lib/state/positionStore.svelte';
	import { provideStore } from '$lib/state/context';

	const store = createPositionStore();
	provideStore(store);

	onMount(() => {
		if (page.url.searchParams.has('random') || page.url.searchParams.has('sample')) {
			store.randomPosition();
		}
	});
</script>

<svelte:head>
	<title>mahjong-engine — position analyzer</title>
</svelte:head>

<nav class="flex justify-end px-6 pt-3">
	<a
		href="{base}/"
		class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-accent"
	>
		Play a hand →
	</a>
</nav>

<Selectors />

<main
	class="mx-auto grid max-w-[1500px] gap-6 p-6
	       grid-cols-[14rem_minmax(0,1fr)_minmax(20rem,24rem)]
	       [grid-template-areas:'palette_position_reasoning']
	       max-lg:grid-cols-[13rem_minmax(0,1fr)]
	       max-lg:[grid-template-areas:'palette_position''palette_reasoning']
	       max-sm:grid-cols-[minmax(0,1fr)]
	       max-sm:gap-4 max-sm:p-3
	       max-sm:[grid-template-areas:'position''reasoning''palette']"
>
	<aside
		class="sticky top-6 self-start max-h-[calc(100vh-3rem)] min-h-0 flex overflow-hidden [grid-area:palette]
		       [&>:global(.palette)]:flex-1 [&>:global(.palette)]:min-h-0 [&>:global(.palette)]:overflow-y-auto
		       max-sm:static max-sm:max-h-none max-sm:overflow-visible"
	>
		<TilePalette />
	</aside>

	<section class="grid min-w-0 gap-3 content-start [grid-area:position]">
		<Hand />
		<SelfExposures />
		{#if store.state.phase === 'charleston'}
			<CharlestonPanel />
		{/if}
		<OpponentBand />
		<DiscardPile />
		<div class="pt-3 mt-2 border-t border-line">
			<PositionIO />
		</div>
	</section>

	<aside
		class="grid min-w-0 gap-3 content-start sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto [grid-area:reasoning]
		       max-lg:static max-lg:max-h-none max-lg:overflow-visible"
	>
		<EngineSuggestion />
		<RankedTargets />
	</aside>
</main>
