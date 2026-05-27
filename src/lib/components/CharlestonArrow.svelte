<script lang="ts">
	import type { CharlestonDirection } from '$lib/engine/gameState';

	type Props = {
		variant: 'pass' | 'receive';
		direction?: CharlestonDirection;
		size?: number;
	};

	let { variant, direction, size = 14 }: Props = $props();

	// `right` is the base glyph; the other directions reuse it, rotated. `courtesy` is a
	// two-way exchange and gets its own path rather than a rotation.
	const ROTATION: Record<CharlestonDirection, string> = {
		right: '',
		across: '-rotate-90',
		left: 'rotate-180',
		courtesy: ''
	};

	const PASS_LABEL: Record<CharlestonDirection, string> = {
		right: 'passed right',
		across: 'passed across',
		left: 'passed left',
		courtesy: 'courtesy exchange'
	};

	const isCourtesy = $derived(variant === 'pass' && direction === 'courtesy');
	const rotation = $derived(variant === 'pass' && direction ? ROTATION[direction] : '');
	const label = $derived(variant === 'receive' ? 'received' : PASS_LABEL[direction ?? 'right']);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	stroke="currentColor"
	stroke-width="1.4"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="shrink-0 text-ink-faint {rotation}"
	role="img"
	aria-label={label}
>
	{#if variant === 'receive'}
		<path d="M12 4 V7 a3 3 0 0 1 -3 3 H5 M7.5 7.5 L5 10 L7.5 12.5" />
	{:else if isCourtesy}
		<path d="M3 5.5 H13 M10.5 3.5 L13 5.5 L10.5 7.5 M13 10.5 H3 M5.5 8.5 L3 10.5 L5.5 12.5" />
	{:else}
		<path d="M2.5 8 H12 M8.5 4.5 L12 8 L8.5 11.5" />
	{/if}
</svg>
