<script lang="ts">
	import { base } from '$app/paths';
	import AboutDialog from '$lib/components/AboutDialog.svelte';
	import HowToPlayDialog from '$lib/components/HowToPlayDialog.svelte';
	import PregameDialog from '$lib/components/PregameDialog.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import GameTable from '$lib/components/game/GameTable.svelte';
	import MobileToolbar from '$lib/components/game/MobileToolbar.svelte';
	import { createGameStore, type MatchConfig, type RulesetId } from '$lib/state/gameStore.svelte';
	import { provideGame } from '$lib/state/gameContext';
	import { houseRulesStore } from '$lib/state/houseRulesStore.svelte';
	import { preferencesStore } from '$lib/state/preferences.svelte';

	// Construct the initial match config from persisted prefs. A returning visitor lands in
	// their last ruleset with a fresh deal; a first-run visitor still gets a default match
	// behind the pregame dialog so the table renders immediately and isn't a void.
	const initialConfig: MatchConfig = {
		rulesetId: preferencesStore.lastRulesetId ?? 'nmjl-2026',
		houseRules: { allowConcealed: houseRulesStore.allowConcealed }
	};

	const game = createGameStore(initialConfig);
	provideGame(game);

	// Show the pregame on first run (no last ruleset persisted) or whenever the user has
	// opted into always-show. Otherwise the existing fresh deal stands.
	let pregameOpen = $state(
		preferencesStore.lastRulesetId === null || preferencesStore.alwaysShowPregame
	);
	let settingsOpen = $state(false);
	let aboutOpen = $state(false);
	let howtoOpen = $state(false);
	let howtoRulesetId = $state<RulesetId>(initialConfig.rulesetId);

	function startMatch(config: MatchConfig) {
		preferencesStore.setLastRulesetId(config.rulesetId);
		game.newGame(config);
	}

	function openHowto(id: RulesetId) {
		howtoRulesetId = id;
		howtoOpen = true;
	}

	function clickNewGame() {
		if (preferencesStore.alwaysShowPregame || preferencesStore.lastRulesetId === null) {
			pregameOpen = true;
			return;
		}
		game.newGame({});
	}
</script>

<svelte:head>
	<title>mahjong-engine — play</title>
</svelte:head>

<div class="lg:flex lg:flex-col lg:h-dvh lg:overflow-hidden">
<header
	class="grid items-center gap-6 p-4 px-6 border-b border-line grid-cols-[auto_1fr] max-sm:px-4 lg:shrink-0"
>
	<div class="grid">
		<span class="text-base font-semibold tracking-tight whitespace-nowrap">mahjong-engine</span>
		<span class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint max-sm:hidden">
			{game.rulesetName} · you vs three
		</span>
	</div>
	<nav class="flex flex-wrap items-center gap-x-4 gap-y-2 justify-self-end">
		<div
			class="inline-flex gap-[2px] p-[2px] bg-bg-sunk rounded-chip border border-line max-lg:hidden"
			role="group"
			aria-label="View options"
		>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.logOpen
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.logOpen}
				onclick={() => game.toggleLog()}
			>
				Log
			</button>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.cardOpen
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.cardOpen}
				onclick={() => game.toggleCard()}
			>
				Card
			</button>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.hintOn
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.hintOn}
				onclick={() => game.toggleHint()}
			>
				Hint
			</button>
			<button
				type="button"
				class="text-xs font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-chip transition-colors duration-150
				       {game.revealed
					? 'bg-bg-raised text-ink shadow-[0_1px_2px_oklch(0_0_0/0.04)]'
					: 'text-ink-faint hover:text-ink-soft'}"
				aria-pressed={game.revealed}
				onclick={() => game.toggleReveal()}
			>
				Reveal
			</button>
		</div>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-ink transition-colors duration-150"
			onclick={clickNewGame}
		>
			New game
		</button>
		<a
			href="{base}/studio"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft hover:text-accent"
		>
			Position studio →
		</a>
		<button
			type="button"
			class="inline-flex items-center justify-center text-ink-soft hover:text-accent transition-colors duration-150"
			aria-label="Settings"
			title="Settings"
			onclick={() => (settingsOpen = true)}
		>
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
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
			</svg>
		</button>
	</nav>
</header>

<GameTable />

<MobileToolbar />
</div>

<PregameDialog
	bind:open={pregameOpen}
	initial={{
		rulesetId: game.rulesetId,
		houseRules: { allowConcealed: houseRulesStore.allowConcealed }
	}}
	onstart={startMatch}
	onhowto={openHowto}
/>
<SettingsDialog
	bind:open={settingsOpen}
	onhowto={() => openHowto(game.rulesetId)}
	onabout={() => (aboutOpen = true)}
/>
<HowToPlayDialog bind:open={howtoOpen} rulesetId={howtoRulesetId} />
<AboutDialog bind:open={aboutOpen} />
