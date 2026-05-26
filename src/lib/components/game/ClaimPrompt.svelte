<script lang="ts">
	import Tile from '$lib/components/Tile.svelte';
	import { useGame } from '$lib/state/gameContext';
	import type { ClaimResponseKind } from '$lib/engine/game';

	const game = useGame();
	const offer = $derived(game.claimOffer);

	const exposureKinds = $derived.by<('pung' | 'kong')[]>(() => {
		if (!offer) return [];
		const kinds = new Set(offer.options.map((o) => o.kind));
		return (['pung', 'kong'] as const).filter((k) => kinds.has(k));
	});

	function respond(kind: ClaimResponseKind) {
		game.respondToClaim(kind);
	}
</script>

{#if offer}
	<section class="grid gap-3 p-4 px-6 rounded-panel border border-line-strong bg-bg-raised max-sm:px-4">
		<div class="flex items-center gap-3 flex-wrap">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				{game.seatLabel(offer.discarder)} discarded
			</span>
			<Tile tile={offer.tile} size="md" />
			<span class="text-sm italic text-ink-soft">claim it?</span>
		</div>
		<div class="flex gap-3 flex-wrap">
			{#if offer.canMahjong}
				<button
					type="button"
					class="text-sm font-medium px-4 py-2 rounded-chip bg-accent text-bg transition-colors duration-150 hover:bg-accent-ink"
					onclick={() => respond('mahjong')}
				>
					Mahjong
				</button>
			{/if}
			{#each exposureKinds as kind (kind)}
				<button
					type="button"
					class="text-sm font-medium px-4 py-2 rounded-chip bg-bg-raised text-ink border border-line transition-colors duration-150 hover:border-line-strong capitalize"
					onclick={() => respond(kind)}
				>
					{kind}
				</button>
			{/each}
			<button
				type="button"
				class="text-sm font-medium px-4 py-2 rounded-chip text-ink-soft transition-colors duration-150 hover:text-ink"
				onclick={() => respond('pass')}
			>
				Pass
			</button>
		</div>
	</section>
{/if}
