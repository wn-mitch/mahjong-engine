<script lang="ts">
	import { tileStyleStore, nextTileStyle, type TileStyle } from '$lib/state/tileStyleStore.svelte';

	const NAME: Record<TileStyle, string> = {
		cjk: '萬索筒 suit-marks',
		western: 'crak/bam/dot labels',
		icon: 'suit icons'
	};

	const style = $derived(tileStyleStore.style);
	const next = $derived(nextTileStyle(style));
</script>

<button
	type="button"
	class="inline-flex items-center justify-center w-[28px] h-[20px] text-[11px] font-semibold leading-none text-ink-soft transition-colors duration-150 hover:text-accent"
	aria-label="Tile style: {NAME[style]} — switch to {NAME[next]}"
	title="Tile style: {NAME[style]} — switch to {NAME[next]}"
	onclick={() => tileStyleStore.cycle()}
>
	{#if style === 'western'}
		<span class="uppercase tracking-[0.04em]">abc</span>
	{:else if style === 'icon'}
		<svg
			class="w-[13px] h-[13px]"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="7.5" />
			<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
		</svg>
	{:else}
		<span class="cjk">索</span>
	{/if}
</button>
