<script lang="ts">
	// Ruleset-specific "how to play" guide. v1 ships Chinese-modern-HK content for players
	// already familiar with American NMJL (which is the audience of this app today). The NMJL
	// slot shows a short placeholder until written.
	//
	// Modeled on AboutDialog's native <dialog> pattern.

	import Tile from '$lib/components/Tile.svelte';
	import type { RulesetId } from '$lib/state/gameStore.svelte';
	import type { Tile as TileT } from '$lib/engine/tiles';

	type Props = {
		open?: boolean;
		rulesetId: RulesetId;
	};
	let { open = $bindable(false), rulesetId }: Props = $props();

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

	// Small inline tile glyphs for the chow example.
	const N = (rank: number): TileT => ({ kind: 'number', suit: 'bamboo', rank: rank as 1 });
	const chowExample: TileT[] = [N(3), N(4), N(5)];
	const pungExample: TileT[] = [
		{ kind: 'dragon', dragon: 'red' },
		{ kind: 'dragon', dragon: 'red' },
		{ kind: 'dragon', dragon: 'red' }
	];
</script>

<dialog
	bind:this={dialogEl}
	onclick={onBackdropClick}
	onclose={close}
	aria-labelledby="howto-title"
	class="m-auto w-[min(38rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-y-auto
	       rounded-panel border border-line bg-bg-raised p-0 text-ink
	       backdrop:bg-[oklch(0.2_0.012_80/0.45)]"
>
	<div class="p-6">
		{#if rulesetId === 'chinese-traditional'}
			<h2 id="howto-title" class="text-base font-semibold">How to play Chinese (modern HK)</h2>
			<p class="mt-1 text-sm italic text-ink-soft">A short orientation for American NMJL players.</p>

			<section class="mt-5">
				<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
					What's gone
				</h3>
				<ul class="mt-2 grid gap-1.5 text-sm text-ink-soft">
					<li>
						<strong class="text-ink">No Charleston.</strong> Tiles are dealt and play starts at
						the dealer's first discard. There is no three-pass exchange to set up your hand.
					</li>
					<li>
						<strong class="text-ink">No jokers.</strong> The wildcard tile does not exist here.
						Every meld is built from natural tiles.
					</li>
					<li>
						<strong class="text-ink">No card to match.</strong> You are not chasing one of sixty
						named hand patterns. Any complete shape wins, scored after the fact.
					</li>
				</ul>
			</section>

			<section class="mt-5">
				<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">What's new</h3>
				<p class="mt-2 text-sm text-ink-soft">
					Sequences. When the player on your <em>left</em> discards, you can claim the tile to
					complete a chow: three consecutive numbers in one suit.
				</p>
				<div class="mt-3 flex items-center gap-2 rounded-panel border border-line bg-bg p-3">
					{#each chowExample as t, i (i)}
						<Tile tile={t} size="sm" />
					{/each}
					<span class="text-xs text-ink-soft ml-2">
						a chow: three in a row, same suit
					</span>
				</div>
				<p class="mt-3 text-sm text-ink-soft">
					Pungs and kongs work exactly as you know them, and you can still claim them from any
					seat:
				</p>
				<div class="mt-3 flex items-center gap-2 rounded-panel border border-line bg-bg p-3">
					{#each pungExample as t, i (i)}
						<Tile tile={t} size="sm" />
					{/each}
					<span class="text-xs text-ink-soft ml-2">a pung: three of a kind</span>
				</div>
				<p class="mt-3 text-xs text-ink-faint">
					Chow is the lowest-priority claim. If anyone can pung or kong the same discard, they
					win the tile first.
				</p>
			</section>

			<section class="mt-5">
				<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
					What you're aiming for
				</h3>
				<p class="mt-2 text-sm text-ink-soft">
					<strong class="text-ink">Four sets and one pair.</strong> A set is a chow, pung, or
					kong. Any mix works. Flowers sit beside the hand as bonuses; they do not count toward
					the shape but they do add points.
				</p>
				<p class="mt-2 text-sm text-ink-soft">
					There is no minimum score to declare. If your fourteenth tile completes the shape, you
					win, even if the result is the bare common-hand zero. Points are tallied after.
				</p>
			</section>

			<section class="mt-5">
				<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
					Scoring at a glance
				</h3>
				<p class="mt-2 text-sm text-ink-soft">
					Additive, not pattern-priced. Knowing the headline bonuses tells you what shapes are
					worth committing to:
				</p>
				<ul class="mt-2 grid gap-1 text-sm text-ink-soft">
					<li><strong class="text-ink">All Pungs</strong> +6</li>
					<li><strong class="text-ink">All Chows</strong> +2</li>
					<li><strong class="text-ink">Half Flush</strong> (one suit plus honors) +3</li>
					<li><strong class="text-ink">Pure Suit</strong> (one suit, no honors) +6</li>
					<li>
						<strong class="text-ink">Dragon meld</strong> 1 / 2 / 3 dragons score +2 / +6 / +8
					</li>
					<li><strong class="text-ink">Seat wind</strong> or <strong class="text-ink">round wind</strong> meld +2 each</li>
					<li><strong class="text-ink">Self-draw</strong> +1</li>
					<li><strong class="text-ink">Each flower</strong> +1</li>
				</ul>
			</section>

			<section class="mt-5">
				<h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
					Tactical contrasts
				</h3>
				<ul class="mt-2 grid gap-1.5 text-sm text-ink-soft">
					<li>
						<strong class="text-ink">Claim freely.</strong> There is no concealed-vs-exposed
						hand identity to lose. Exposures do not lock you out of any particular shape.
					</li>
					<li>
						<strong class="text-ink">Discards matter more.</strong> Every discard opens a chow
						window for the downstream player. You leak fewer free tiles by avoiding the obvious
						sequence neighbors.
					</li>
					<li>
						<strong class="text-ink">Commit to a shape early.</strong> The big point bonuses
						reward whole-hand commitments: all pungs, all chows, one suit. Drifting between them
						usually scores the bare zero.
					</li>
				</ul>
			</section>

			<section class="mt-5 rounded-panel border border-line bg-bg p-3">
				<p class="text-xs text-ink-soft">
					For more detail, the strategy notes in
					<code class="text-ink">docs/strategy/chinese-traditional.md</code> cover the full
					tile pool, kong replacements, and scoring corners not summarized here.
				</p>
			</section>
		{:else}
			<h2 id="howto-title" class="text-base font-semibold">How to play NMJL 2026</h2>
			<p class="mt-2 text-sm text-ink-soft">
				The annotated card is the canonical reference: open the Card panel during play to see
				every live target, your progress on each, and which tiles you still need. The Position
				studio (in the header) lets you reverse-engineer a hand from any tile arrangement.
			</p>
			<p class="mt-3 text-sm text-ink-soft">
				A dedicated NMJL onboarding guide is on the list.
			</p>
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
