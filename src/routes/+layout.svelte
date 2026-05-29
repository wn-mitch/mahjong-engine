<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import '../app.css';

	let { children } = $props();

	// Register the Workbox service worker once the page mounts. The manifest <link> lives in
	// app.html (the layout is `ssr = false`, so head injection here would only happen post-
	// hydration). Dynamic import keeps the registerSW glue + Workbox refs off the critical path.
	$effect(() => {
		if (typeof window === 'undefined') return;
		void import('virtual:pwa-register').then(({ registerSW }) => {
			registerSW({ immediate: true });
		});
	});

	// Delay arming the install prompt so first paint isn't covered by a sheet — the user gets a
	// moment to see the app before we ask them to install it.
	let installPromptArmed = $state(false);
	$effect(() => {
		const t = setTimeout(() => {
			installPromptArmed = true;
		}, 3000);
		return () => clearTimeout(t);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if installPromptArmed}
	<InstallPrompt />
{/if}
