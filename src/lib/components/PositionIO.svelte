<script lang="ts">
	import { useStore } from '$lib/state/context';

	const store = useStore();

	const open = $derived(store.jsonEditorOpen);
	let buffer = $state('');
	let error = $state<string | null>(null);

	$effect(() => {
		if (open) {
			buffer = store.exportJSON();
			error = null;
		}
	});

	function toggle() {
		store.setJsonEditorOpen(!open);
	}

	function apply() {
		const result = store.importJSON(buffer);
		if (result.ok) {
			error = null;
			store.setJsonEditorOpen(false);
		} else {
			error = result.error;
		}
	}

	function copy() {
		buffer = store.exportJSON();
		navigator.clipboard?.writeText(buffer).catch(() => {});
	}

	function reset() {
		store.reset();
		buffer = store.exportJSON();
	}
</script>

<section class="text-sm">
	<div class="flex gap-4 justify-end flex-wrap">
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
			onclick={() => store.randomPosition()}
		>
			random position
		</button>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
			onclick={toggle}
		>
			{open ? 'close' : 'position JSON'}
		</button>
		<button
			type="button"
			class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft py-[2px] hover:text-accent"
			onclick={reset}
		>
			reset
		</button>
	</div>

	{#if open}
		<div class="mt-3 grid gap-2">
			<label
				for="position-json"
				class="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint"
			>
				Edit JSON · paste to import
			</label>
			<textarea
				id="position-json"
				bind:value={buffer}
				spellcheck="false"
				rows="14"
				class="w-full font-mono text-[12px] leading-normal p-3 bg-bg-raised border border-line rounded-[6px] text-ink resize-y
				       max-sm:h-48
				       focus-visible:outline-2 focus-visible:outline-accent focus-visible:[outline-offset:-1px] focus-visible:border-transparent"
			></textarea>
			{#if error}
				<p class="text-sm text-error m-0">{error}</p>
			{/if}
			<div class="flex gap-2 justify-end">
				<button
					type="button"
					class="text-sm font-medium px-4 py-2 rounded-chip text-ink bg-bg-raised border border-line"
					onclick={copy}
				>
					copy
				</button>
				<button
					type="button"
					class="text-sm font-medium px-4 py-2 rounded-chip text-bg bg-accent hover:bg-accent-ink"
					onclick={apply}
				>
					apply
				</button>
			</div>
		</div>
	{/if}
</section>
