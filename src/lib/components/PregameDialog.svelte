<script lang="ts">
	// Pregame configuration modal. Shown on first run, on "New game" when the user has
	// opted into always-show, and on demand from the Settings dialog. Produces a MatchConfig
	// the parent passes to `game.newGame(config)`.
	//
	// Built on the native <dialog> + showModal() pattern (same as AboutDialog) so the browser
	// handles backdrop, focus trap, and Esc-to-close.

	import type { MatchConfig, RulesetId } from '$lib/state/gameStore.svelte';
	import { houseRulesStore } from '$lib/state/houseRulesStore.svelte';

	type Props = {
		open?: boolean;
		initial?: MatchConfig;
		onstart: (config: MatchConfig) => void;
		onhowto?: (rulesetId: RulesetId) => void;
	};

	let { open = $bindable(false), initial, onstart, onhowto }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	// Local form state. Re-seeded from `initial` each time the dialog opens so reusing a
	// single instance across "New game" presses doesn't carry stale values from a prior
	// session.
	let rulesetId = $state<RulesetId>('nmjl-2026');
	let allowConcealed = $state<boolean>(true);
	let advancedOpen = $state(false);
	let seedText = $state('');

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			rulesetId = initial?.rulesetId ?? 'nmjl-2026';
			allowConcealed = initial?.houseRules.allowConcealed ?? houseRulesStore.allowConcealed;
			advancedOpen = false;
			seedText = '';
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function close() {
		open = false;
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) close();
	}

	function start() {
		const trimmed = seedText.trim();
		const seed = trimmed === '' ? undefined : Number.parseInt(trimmed, 10);
		const validSeed = seed !== undefined && Number.isFinite(seed) ? seed : undefined;
		const config: MatchConfig = {
			rulesetId,
			seed: validSeed,
			houseRules: { allowConcealed }
		};
		onstart(config);
		close();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclick={onBackdropClick}
	onclose={close}
	aria-labelledby="pregame-title"
	class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-panel border border-line
	       bg-bg-raised p-0 text-ink backdrop:bg-[oklch(0.2_0.012_80/0.45)]"
>
	<div class="p-6">
		<h2 id="pregame-title" class="text-base font-semibold">New game</h2>
		<p class="mt-1 text-sm text-ink-soft">Pick a ruleset and set the table.</p>

		<fieldset class="mt-5">
			<legend class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
				Ruleset
			</legend>
			<div class="mt-2 grid gap-2">
				<label class="flex items-start gap-3 cursor-pointer rounded-panel border border-line p-3
				              hover:border-line-strong transition-colors duration-150
				              {rulesetId === 'nmjl-2026' ? 'border-accent bg-bg' : ''}">
					<input
						type="radio"
						name="ruleset"
						value="nmjl-2026"
						bind:group={rulesetId}
						class="mt-0.5"
					/>
					<div class="grid gap-0.5">
						<span class="text-sm font-medium">American NMJL 2026</span>
						<span class="text-xs text-ink-soft">
							Card-pattern hands, jokers, Charleston, no chow claims.
						</span>
					</div>
				</label>
				<label class="flex items-start gap-3 cursor-pointer rounded-panel border border-line p-3
				              hover:border-line-strong transition-colors duration-150
				              {rulesetId === 'chinese-traditional' ? 'border-accent bg-bg' : ''}">
					<input
						type="radio"
						name="ruleset"
						value="chinese-traditional"
						bind:group={rulesetId}
						class="mt-0.5"
					/>
					<div class="grid gap-0.5">
						<span class="text-sm font-medium">Chinese (modern HK-style)</span>
						<span class="text-xs text-ink-soft">
							4 sets + pair, chow claims from the upstream seat, no Charleston, no jokers.
						</span>
						{#if onhowto}
							<button
								type="button"
								class="mt-1 self-start text-xs text-accent underline-offset-2 hover:underline"
								onclick={(e) => {
									e.preventDefault();
									onhowto('chinese-traditional');
								}}
							>
								How to play →
							</button>
						{/if}
					</div>
				</label>
			</div>
		</fieldset>

		{#if rulesetId === 'nmjl-2026'}
			<fieldset class="mt-5">
				<legend class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
					House rules
				</legend>
				<label class="mt-2 flex items-start gap-2 text-sm cursor-pointer">
					<input type="checkbox" bind:checked={allowConcealed} class="mt-0.5" />
					<span class="text-ink-soft">
						Allow concealed-only hands even after exposure
						<span class="block text-xs text-ink-faint">
							Default for casual play; turn off for stricter tournament scoring.
						</span>
					</span>
				</label>
			</fieldset>
		{:else}
			<div class="mt-5 rounded-panel border border-line bg-bg p-3 text-xs text-ink-soft">
				Wind: East, round East. No Charleston — play starts with the dealer's first discard.
			</div>
		{/if}

		<div class="mt-5">
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint hover:text-ink"
				onclick={() => (advancedOpen = !advancedOpen)}
			>
				{advancedOpen ? '−' : '+'} Advanced
			</button>
			{#if advancedOpen}
				<label class="mt-2 flex flex-col gap-1 text-sm">
					<span class="text-xs text-ink-soft">Seed (optional — for reproducible deals)</span>
					<input
						type="number"
						inputmode="numeric"
						bind:value={seedText}
						placeholder="random"
						class="rounded-chip border border-line bg-bg-raised px-3 py-1.5 text-sm
						       focus:outline-none focus-visible:ring-2 focus-visible:ring-line-strong"
					/>
				</label>
			{/if}
		</div>

		<div class="mt-6 flex justify-end gap-2">
			<button
				type="button"
				class="rounded-panel border border-line bg-bg-raised px-4 py-1.5 text-sm font-semibold
				       text-ink-soft hover:text-ink focus:outline-none
				       focus-visible:ring-2 focus-visible:ring-line-strong"
				onclick={close}
			>
				Cancel
			</button>
			<button
				type="button"
				class="rounded-panel bg-accent px-4 py-1.5 text-sm font-semibold text-bg
				       hover:bg-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-line-strong"
				onclick={start}
			>
				Start match
			</button>
		</div>
	</div>
</dialog>
