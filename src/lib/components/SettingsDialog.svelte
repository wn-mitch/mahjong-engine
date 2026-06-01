<script lang="ts">
	// App-level settings modal. Absorbs the header's Theme and Tile-style toggles plus the
	// About link, and adds defaults for the pregame flow (last ruleset, hint-on default,
	// always-show-pregame). Modeled on AboutDialog's native <dialog> pattern.

	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import TileStyleToggle from '$lib/components/TileStyleToggle.svelte';
	import { preferencesStore } from '$lib/state/preferences.svelte';
	import { themeStore } from '$lib/state/themeStore.svelte';
	import { tileStyleStore } from '$lib/state/tileStyleStore.svelte';
	import type { RulesetId } from '$lib/state/gameStore.svelte';

	type Props = {
		open?: boolean;
		onhowto?: () => void;
		onabout?: () => void;
	};
	let { open = $bindable(false), onhowto, onabout }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	function close() {
		open = false;
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) close();
	}

	const TILE_STYLE_LABEL = {
		icon: 'Suit icons',
		cjk: '萬索筒 suit-marks',
		western: 'crak / bam / dot'
	} as const;

	function pickDefaultRuleset(id: RulesetId) {
		preferencesStore.setLastRulesetId(id);
	}
</script>

<dialog
	bind:this={dialogEl}
	onclick={onBackdropClick}
	onclose={close}
	aria-labelledby="settings-title"
	class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-panel border border-line
	       bg-bg-raised p-0 text-ink backdrop:bg-[oklch(0.2_0.012_80/0.45)]"
>
	<div class="p-6">
		<h2 id="settings-title" class="text-base font-semibold">Settings</h2>

		<section class="mt-5">
			<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Appearance</h3>
			<div class="mt-2 grid gap-3">
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm">Theme</span>
					<div class="flex items-center gap-2 text-xs text-ink-soft">
						<span>{themeStore.isDark ? 'Dark' : 'Light'}</span>
						<ThemeToggle />
					</div>
				</div>
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm">Tile style</span>
					<div class="flex items-center gap-2 text-xs text-ink-soft">
						<span>{TILE_STYLE_LABEL[tileStyleStore.style]}</span>
						<TileStyleToggle />
					</div>
				</div>
			</div>
		</section>

		<section class="mt-5">
			<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Defaults</h3>
			<fieldset class="mt-2 grid gap-1.5">
				<legend class="text-xs text-ink-soft">Default ruleset for new games</legend>
				<label class="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="radio"
						name="default-ruleset"
						value="nmjl-2026"
						checked={preferencesStore.lastRulesetId === 'nmjl-2026'}
						onchange={() => pickDefaultRuleset('nmjl-2026')}
					/>
					American NMJL 2026
				</label>
				<label class="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="radio"
						name="default-ruleset"
						value="chinese-traditional"
						checked={preferencesStore.lastRulesetId === 'chinese-traditional'}
						onchange={() => pickDefaultRuleset('chinese-traditional')}
					/>
					Chinese (modern HK-style)
				</label>
			</fieldset>
			<label class="mt-3 flex items-start gap-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={preferencesStore.defaultHintOn}
					onchange={(e) => preferencesStore.setDefaultHintOn(e.currentTarget.checked)}
					class="mt-0.5"
				/>
				<span class="text-ink-soft">
					Turn the hint indicator on by default
					<span class="block text-xs text-ink-faint">
						You can still toggle it in the header.
					</span>
				</span>
			</label>
			<label class="mt-3 flex items-start gap-2 text-sm cursor-pointer">
				<input
					type="checkbox"
					checked={preferencesStore.alwaysShowPregame}
					onchange={(e) => preferencesStore.setAlwaysShowPregame(e.currentTarget.checked)}
					class="mt-0.5"
				/>
				<span class="text-ink-soft">
					Always show pregame on "New game"
					<span class="block text-xs text-ink-faint">
						When off, "New game" deals a fresh hand in the same ruleset without prompting.
					</span>
				</span>
			</label>
		</section>

		{#if onhowto || onabout}
			<section class="mt-5 flex flex-wrap gap-3">
				{#if onhowto}
					<button
						type="button"
						class="text-sm text-accent underline-offset-2 hover:underline"
						onclick={() => {
							close();
							onhowto?.();
						}}
					>
						How to play
					</button>
				{/if}
				{#if onabout}
					<button
						type="button"
						class="text-sm text-accent underline-offset-2 hover:underline"
						onclick={() => {
							close();
							onabout?.();
						}}
					>
						About
					</button>
				{/if}
			</section>
		{/if}

		<div class="mt-6 flex justify-end">
			<button
				type="button"
				class="rounded-panel border border-line bg-bg-raised px-4 py-1.5 text-sm font-semibold
				       text-ink-soft hover:text-ink focus:outline-none
				       focus-visible:ring-2 focus-visible:ring-line-strong"
				onclick={close}
			>
				Close
			</button>
		</div>
	</div>
</dialog>
