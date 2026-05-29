<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { createMediaQuery } from '$lib/state/media.svelte';
	import { installPromptStore } from '$lib/state/installPromptStore.svelte';

	// First-visit nudge to install the app. iOS Safari has no install API, so on iOS we show
	// Share→Add-to-Home-Screen instructions and a single "Got it" dismiss; on Chromium we wired up
	// the captured `beforeinstallprompt` event, so we show real "Install" / "Not now" buttons.
	// Mirrors MobileSheet's chrome (scrim, slide-up, scroll lock, Escape, reduce-motion) for visual
	// continuity with the rest of the bottom-sheet UI.

	const reduceMotion = createMediaQuery('(prefers-reduced-motion: reduce)');
	let sheetEl = $state<HTMLElement | null>(null);

	const sheetMotion = $derived({
		y: 360,
		opacity: 1,
		duration: reduceMotion.matches ? 0 : 300,
		easing: quintOut
	});
	const scrimMotion = $derived({ duration: reduceMotion.matches ? 0 : 200 });

	const open = $derived(installPromptStore.shouldShow);

	$effect(() => {
		if (!open || typeof document === 'undefined') return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		if (open) sheetEl?.focus();
	});

	function onWindowKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			installPromptStore.dismiss();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if open}
	<button
		type="button"
		aria-label="Dismiss install prompt"
		class="fixed inset-0 z-40 cursor-default bg-[oklch(0.2_0.012_80/0.45)]"
		onclick={() => installPromptStore.dismiss()}
		transition:fade={scrimMotion}
	></button>

	<div
		bind:this={sheetEl}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-labelledby="install-prompt-title"
		class="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-panel
		       bg-bg-raised border-t border-line pb-[env(safe-area-inset-bottom)] focus:outline-none"
		transition:fly={sheetMotion}
	>
		<div class="relative flex items-center justify-center pt-2 pb-1">
			<span class="h-1 w-10 rounded-full bg-line" aria-hidden="true"></span>
		</div>
		<div class="px-5 pt-2 pb-4">
			<h2 id="install-prompt-title" class="text-base font-semibold text-ink">
				Install for full-screen play
			</h2>
			<p class="mt-1 text-sm text-ink-soft">
				Add this app to your home screen to hide the browser bars and get the full table.
			</p>

			{#if installPromptStore.platform === 'ios'}
				<ol class="mt-4 space-y-2 text-sm text-ink">
					<li class="flex items-start gap-2">
						<span class="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center
						             rounded-full border border-line text-[10px] font-semibold text-ink-soft">
							1
						</span>
						<span>
							Tap the
							<span class="inline-flex items-center align-middle">
								<svg
									viewBox="0 0 24 24"
									class="mx-1 inline h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M12 3v12" />
									<path d="m8 7 4-4 4 4" />
									<path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
								</svg>
								<span class="font-medium">Share</span>
							</span>
							button in Safari's toolbar.
						</span>
					</li>
					<li class="flex items-start gap-2">
						<span class="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center
						             rounded-full border border-line text-[10px] font-semibold text-ink-soft">
							2
						</span>
						<span>Choose <span class="font-medium">Add to Home Screen</span>.</span>
					</li>
				</ol>

				<div class="mt-5 flex justify-end">
					<button
						type="button"
						class="rounded-panel border border-accent bg-accent px-4 py-2 text-sm font-semibold
						       text-bg-raised hover:brightness-105 focus:outline-none
						       focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
						       focus-visible:ring-offset-bg-raised"
						onclick={() => installPromptStore.dismiss()}
					>
						Got it
					</button>
				</div>
			{:else}
				<div class="mt-5 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-panel border border-line bg-bg-raised px-4 py-2 text-sm font-semibold
						       text-ink-soft hover:text-ink focus:outline-none
						       focus-visible:ring-2 focus-visible:ring-line-strong focus-visible:ring-offset-2
						       focus-visible:ring-offset-bg-raised"
						onclick={() => installPromptStore.dismiss()}
					>
						Not now
					</button>
					<button
						type="button"
						class="rounded-panel border border-accent bg-accent px-4 py-2 text-sm font-semibold
						       text-bg-raised hover:brightness-105 focus:outline-none
						       focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
						       focus-visible:ring-offset-bg-raised"
						onclick={() => installPromptStore.install()}
					>
						Install
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
