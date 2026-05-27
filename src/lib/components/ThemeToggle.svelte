<script lang="ts">
	import { themeStore } from '$lib/state/themeStore.svelte';
</script>

<button
	type="button"
	class="inline-flex items-center justify-center text-ink-soft transition-colors duration-150 hover:text-accent"
	aria-pressed={themeStore.isDark}
	aria-label={themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={() => themeStore.toggle()}
>
	{#if themeStore.isDark}
		<!-- sun: currently dark, click returns to light -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		</svg>
	{:else}
		<!-- moon: currently light, click switches to dark -->
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{/if}
</button>
