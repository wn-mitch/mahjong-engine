<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { createMediaQuery } from '$lib/state/media.svelte';
	import type { Snippet } from 'svelte';

	// A dismissible bottom sheet for mobile. The desktop side panels (log, card) linearize badly on a
	// phone, so below the desktop breakpoint they slide up over the game instead of joining the scroll.
	// Mirrors PaletteDock's sheet treatment (scrim, slide-up, scroll lock, focus, Escape, reduce-motion).
	// The rendered child keeps its own header/chrome, so this shell stays a thin positioning wrapper.
	type Props = { onclose: () => void; label: string; children: Snippet };
	let { onclose, label, children }: Props = $props();

	const reduceMotion = createMediaQuery('(prefers-reduced-motion: reduce)');
	let sheetEl = $state<HTMLElement | null>(null);

	const sheetMotion = $derived({
		y: 360,
		opacity: 1,
		duration: reduceMotion.matches ? 0 : 300,
		easing: quintOut
	});
	const scrimMotion = $derived({ duration: reduceMotion.matches ? 0 : 200 });

	// Lock background scroll while the sheet is up, restore it on close/unmount.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		sheetEl?.focus();
	});

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<button
	type="button"
	aria-label="Close {label}"
	class="fixed inset-0 z-40 cursor-default bg-[oklch(0.2_0.012_80/0.45)]"
	onclick={onclose}
	transition:fade={scrimMotion}
></button>

<div
	bind:this={sheetEl}
	tabindex="-1"
	role="dialog"
	aria-modal="true"
	aria-label={label}
	class="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-panel
	       bg-bg-raised border-t border-line pb-[env(safe-area-inset-bottom)] focus:outline-none"
	transition:fly={sheetMotion}
>
	<div class="relative flex items-center justify-center pt-2 pb-1">
		<span class="h-1 w-10 rounded-full bg-line" aria-hidden="true"></span>
		<button
			type="button"
			class="absolute right-3 top-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em]
			       text-ink-soft hover:text-accent"
			onclick={onclose}
		>
			Done
		</button>
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
		{@render children()}
	</div>
</div>
