<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import CharlestonArrow from '$lib/components/CharlestonArrow.svelte';
	import { useGame } from '$lib/state/gameContext';
	import type { SeatId } from '$lib/engine/game';

	const game = useGame();

	let scroller = $state<HTMLDivElement | null>(null);

	// "You draw" for the human, "Right draws" for the others.
	function subject(seat: SeatId, verb: string): string {
		return seat === 0 ? `You ${verb}` : `${game.seatLabel(seat)} ${verb}s`;
	}

	// Keep the newest entry in view as the log grows.
	$effect(() => {
		game.log.length;
		if (scroller) scroller.scrollTop = scroller.scrollHeight;
	});
</script>

<section
	class="grid grid-rows-[auto_minmax(0,1fr)] gap-2 max-h-[calc(100vh-3rem)] rounded-panel border border-line bg-bg-sunk overflow-hidden max-lg:max-h-[24rem]"
>
	<header class="flex items-center gap-2 px-4 pt-3">
		<span class="w-[5px] h-[5px] rounded-full bg-ink-faint" aria-hidden="true"></span>
		<span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">Log</span>
		<span class="numeric text-xs text-ink-faint">{game.log.length}</span>
		<button
			type="button"
			class="ml-auto text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
			aria-label="Hide log"
			onclick={() => game.toggleLog()}
		>
			Hide
		</button>
	</header>

	<div bind:this={scroller} class="overflow-y-auto px-4 pb-3">
		{#if game.log.length === 0}
			<p class="text-xs italic text-ink-faint">No moves yet.</p>
		{:else}
			<ol class="grid gap-1.5">
				{#each game.log as e (e.id)}
					<li class="flex items-center gap-1.5 text-xs text-ink-soft">
						{#if e.kind === 'draw'}
							<span>{subject(e.seat, 'draw')}</span>
							<Tile tile={e.tile} size="xs" />
						{:else if e.kind === 'discard'}
							<span>{subject(e.seat, 'discard')}</span>
							<Tile tile={e.tile} size="xs" />
						{:else if e.kind === 'claim'}
							<span>{subject(e.seat, 'claim')}</span>
							<Tile tile={e.tile} size="xs" />
							<span class="text-ink-faint">({e.as})</span>
						{:else if e.kind === 'charleston'}
							<span>Charleston</span>
							<span class="flex [&>*:not(:first-child)]:-ml-[6px]">
								{#each e.tiles as t, i (i)}
									<Tile tile={t} size="xs" />
								{/each}
							</span>
							<CharlestonArrow variant="pass" direction={e.direction} />
							{#if e.received.length > 0}
								<CharlestonArrow variant="receive" />
								<span class="flex [&>*:not(:first-child)]:-ml-[6px]">
									{#each e.received as t, i (i)}
										<Tile tile={t} size="xs" />
									{/each}
								</span>
							{/if}
						{:else if e.kind === 'end'}
							{#if e.result.kind === 'mahjong'}
								<span class="font-semibold text-ink">
									{e.result.winner === 0 ? 'You win' : `${game.seatLabel(e.result.winner!)} wins`}
								</span>
								<span class="text-ink-faint"
									>({e.result.fromDiscard ? 'by discard' : 'self-draw'})</span
								>
							{:else}
								<span class="font-semibold text-ink">Wall exhausted</span>
								<span class="text-ink-faint">— no winner</span>
							{/if}
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>
