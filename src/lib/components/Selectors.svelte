<script lang="ts">
	import { useStore } from '$lib/state/context';
	import type { GamePhase } from '$lib/engine/gameState';
	import type { RulesetId } from '$lib/state/positionStore.svelte';

	const store = useStore();

	const rulesetOptions: { id: RulesetId; label: string }[] = [
		{ id: 'nmjl-2026', label: 'NMJL 2026' },
		{ id: 'chinese-traditional', label: 'Chinese traditional' }
	];

	const phaseOptions: { id: GamePhase; label: string }[] = [
		{ id: 'charleston', label: 'Charleston' },
		{ id: 'play', label: 'Play' },
		{ id: 'endgame', label: 'Endgame' }
	];
</script>

<header
	class="grid items-center gap-6 p-4 px-6 border-b border-line
	       grid-cols-[auto_1fr]
	       max-sm:grid-cols-[1fr]"
>
	<div class="grid">
		<span class="text-base font-semibold tracking-tight">mahjong-engine</span>
		<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
			position analyzer
		</span>
	</div>

	<div class="flex gap-6 justify-end flex-wrap max-sm:justify-start">
		<fieldset class="border-0 p-0 m-0 grid gap-[4px]">
			<legend class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint p-0">
				Ruleset
			</legend>
			<div
				class="inline-flex gap-[2px] p-[2px] bg-bg-sunk rounded-chip border border-line"
				role="radiogroup"
			>
				{#each rulesetOptions as opt (opt.id)}
					<button
						type="button"
						class="text-sm font-medium px-3 py-1 rounded-chip text-ink-soft
						       transition-colors duration-[180ms] ease-out-quart hover:text-ink
						       {store.rulesetId === opt.id
							? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
							: ''}"
						role="radio"
						aria-checked={store.rulesetId === opt.id}
						onclick={() => store.setRuleset(opt.id)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</fieldset>

		<fieldset class="border-0 p-0 m-0 grid gap-[4px]">
			<legend class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint p-0">
				Phase
			</legend>
			<div
				class="inline-flex gap-[2px] p-[2px] bg-bg-sunk rounded-chip border border-line"
				role="radiogroup"
			>
				{#each phaseOptions as opt (opt.id)}
					<button
						type="button"
						class="text-sm font-medium px-3 py-1 rounded-chip text-ink-soft
						       transition-colors duration-[180ms] ease-out-quart hover:text-ink
						       {store.state.phase === opt.id
							? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
							: ''}"
						role="radio"
						aria-checked={store.state.phase === opt.id}
						onclick={() => store.setPhase(opt.id)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</fieldset>
	</div>
</header>
