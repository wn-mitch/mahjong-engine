<script lang="ts">
	import { discardViewStore } from '$lib/state/discardViewStore.svelte';
</script>

<button
	type="button"
	class="inline-flex items-center justify-center min-w-[40px] text-[10px] font-semibold uppercase tracking-[0.1em] leading-none text-ink-soft transition-colors duration-150 hover:text-accent"
	aria-pressed={discardViewStore.isStacked}
	aria-label={discardViewStore.isStacked
		? 'Discards stacked by count — switch to chronological river'
		: 'Discards in chronological order — switch to stacked counts'}
	title={discardViewStore.isStacked
		? 'Discards: stacked — switch to river'
		: 'Discards: river — switch to stacked'}
	onclick={() => discardViewStore.toggle()}
>
	{discardViewStore.isStacked ? 'Stacked' : 'River'}
</button>
