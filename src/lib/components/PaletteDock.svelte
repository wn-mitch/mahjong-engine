<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import TilePalette, { focusTargetLabel } from './TilePalette.svelte';
	import { useStore } from '$lib/state/context';
	import { createMediaQuery, PHONE_QUERY } from '$lib/state/media.svelte';

	// One TilePalette, two presentations. On desktop/tablet it is the sticky aside it has always
	// been. On a phone the palette (how you add tiles) would otherwise sit at the bottom of the
	// scroll, far from the hand it edits — so it becomes a thumb-zone dock: a resting bar that opens
	// a slide-up sheet over the page while the hand stays visible above.
	const store = useStore();
	const phone = createMediaQuery(PHONE_QUERY);
	const reduceMotion = createMediaQuery('(prefers-reduced-motion: reduce)');

	let open = $state(false);
	let barEl = $state<HTMLButtonElement | null>(null);
	let sheetEl = $state<HTMLElement | null>(null);

	const target = $derived(focusTargetLabel(store.focus));
	const sheetMotion = $derived({
		y: 360,
		opacity: 1,
		duration: reduceMotion.matches ? 0 : 300,
		easing: quintOut
	});
	const scrimMotion = $derived({ duration: reduceMotion.matches ? 0 : 200 });

	// Crossing back to a wider viewport should never leave an orphaned overlay mounted.
	$effect(() => {
		if (!phone.matches && open) open = false;
	});

	// Lock background scroll while the sheet is up, restore it on close/unmount.
	$effect(() => {
		if (typeof document === 'undefined' || !open) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Move focus into the sheet on open and back to the bar on close — but not on first mount, which
	// would otherwise steal focus to the dock as the page loads.
	let focusReady = false;
	$effect(() => {
		const isOpen = open;
		if (!focusReady) {
			focusReady = true;
			return;
		}
		if (isOpen) sheetEl?.focus();
		else barEl?.focus();
	});

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if phone.matches}
	<button
		bind:this={barEl}
		type="button"
		class="fixed inset-x-0 bottom-0 z-30 flex w-full min-h-[56px] items-center justify-between gap-3
		       px-4 pb-[env(safe-area-inset-bottom)] text-left bg-bg-raised border-t border-line"
		aria-expanded={open}
		aria-controls="palette-sheet"
		onclick={() => (open = true)}
	>
		<span class="flex min-w-0 items-baseline gap-2">
			<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Add tiles</span>
			<span class="truncate text-sm">
				<span class="italic text-ink-faint">adding to</span>
				<span class="font-semibold text-accent-ink">{target}</span>
			</span>
		</span>
		<svg
			class="shrink-0 text-ink-faint"
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
			<path d="m6 15 6-6 6 6" />
		</svg>
	</button>

	{#if open}
		<button
			type="button"
			aria-label="Close tile palette"
			class="fixed inset-0 z-40 cursor-default bg-[oklch(0.2_0.012_80/0.45)]"
			onclick={() => (open = false)}
			transition:fade={scrimMotion}
		></button>

		<div
			id="palette-sheet"
			bind:this={sheetEl}
			tabindex="-1"
			role="dialog"
			aria-modal="true"
			aria-label="Tile palette"
			class="fixed inset-x-0 bottom-0 z-50 flex max-h-[68vh] flex-col rounded-t-panel
			       bg-bg-raised border-t border-line pb-[env(safe-area-inset-bottom)] focus:outline-none"
			transition:fly={sheetMotion}
		>
			<div class="relative flex items-center justify-center pt-2 pb-1">
				<span class="h-1 w-10 rounded-full bg-line" aria-hidden="true"></span>
				<button
					type="button"
					class="absolute right-3 top-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em]
					       text-ink-soft hover:text-accent"
					onclick={() => (open = false)}
				>
					Done
				</button>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
				<TilePalette bare />
			</div>
		</div>
	{/if}
{:else}
	<aside
		class="sticky top-6 self-start max-h-[calc(100vh-3rem)] min-h-0 flex overflow-hidden [grid-area:palette]
		       [&>:global(.palette)]:flex-1 [&>:global(.palette)]:min-h-0 [&>:global(.palette)]:overflow-y-auto"
	>
		<TilePalette />
	</aside>
{/if}
