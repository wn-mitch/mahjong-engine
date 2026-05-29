<script lang="ts">
	// Small "about / colophon" modal. Uses the native <dialog> element with showModal() so the
	// browser handles backdrop, Esc-to-close, and focus trap for us — no need to replicate the
	// MobileSheet bottom-sheet machinery for a one-shot info card. Parents drive open/close via a
	// `$bindable` prop: `let aboutOpen = $state(false); <AboutDialog bind:open={aboutOpen} />`.

	type Props = { open?: boolean };
	let { open = $bindable(false) }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	function close() {
		open = false;
	}

	// Native <dialog> backdrops swallow clicks; reflect them as a close so the modal feels modal.
	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) close();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclick={onBackdropClick}
	onclose={close}
	aria-labelledby="about-title"
	class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line
	       bg-bg-raised p-0 text-ink backdrop:bg-[oklch(0.2_0.012_80/0.45)]"
>
	<div class="p-6">
		<h2 id="about-title" class="text-base font-semibold">About</h2>
		<p class="mt-2 text-sm text-ink-soft">
			A position analyzer and study partner for American NMJL 2026 — a Reading Room interface
			where the tiles do the talking.
		</p>
		<p class="mt-3 text-sm text-ink-soft">
			Built by
			<a
				href="https://alpacasoft.dev/"
				target="_blank"
				rel="noopener noreferrer"
				class="text-accent underline-offset-2 hover:underline focus-visible:underline"
			>
				alpacasoft.dev
			</a>.
		</p>
		<div class="mt-5 flex justify-end">
			<button
				type="button"
				class="rounded-panel border border-line bg-bg-raised px-4 py-1.5 text-sm font-semibold
				       text-ink-soft hover:text-ink focus:outline-none
				       focus-visible:ring-2 focus-visible:ring-line-strong focus-visible:ring-offset-2
				       focus-visible:ring-offset-bg-raised"
				onclick={close}
			>
				Close
			</button>
		</div>
	</div>
</dialog>
