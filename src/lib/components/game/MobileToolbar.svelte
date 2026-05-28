<script lang="ts">
	import { useGame } from '$lib/state/gameContext';

	// Below the desktop breakpoint the log and card open as bottom sheets, so the study toggles live
	// here in the thumb zone instead of the header. This bar is itself mobile-only (lg:hidden), so the
	// one-sheet-at-a-time guard for log/card is always in force — no media check needed.
	const game = useGame();

	function tapCard() {
		if (!game.cardOpen && game.logOpen) game.toggleLog();
		game.toggleCard();
	}
	function tapLog() {
		if (!game.logOpen && game.cardOpen) game.toggleCard();
		game.toggleLog();
	}

	const seg =
		'flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold uppercase ' +
		'tracking-[0.1em] transition-colors duration-150';
	const on = 'bg-bg-sunk text-ink';
	const off = 'text-ink-faint';
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-30 flex divide-x divide-line border-t border-line bg-bg-raised
	       pb-[env(safe-area-inset-bottom)] lg:hidden"
	aria-label="View options"
>
	<button type="button" class="{seg} {game.cardOpen ? on : off}" aria-pressed={game.cardOpen} onclick={tapCard}>
		Card
	</button>
	<button type="button" class="{seg} {game.hintOn ? on : off}" aria-pressed={game.hintOn} onclick={() => game.toggleHint()}>
		Hint
	</button>
	<button type="button" class="{seg} {game.logOpen ? on : off}" aria-pressed={game.logOpen} onclick={tapLog}>
		Log
	</button>
	<button type="button" class="{seg} {game.revealed ? on : off}" aria-pressed={game.revealed} onclick={() => game.toggleReveal()}>
		Reveal
	</button>
</nav>
