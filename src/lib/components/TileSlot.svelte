<script lang="ts">
	import type { TileSize } from './Tile.svelte';

	type Props = {
		size?: TileSize;
		focused?: boolean;
		onclick?: (e: MouseEvent) => void;
		label?: string;
	};

	let { size = 'md', focused = false, onclick, label = 'add tile' }: Props = $props();

	const SIZE_CLASSES: Record<TileSize, string> = {
		xs: 'w-[22px] h-[30px] rounded-[4px]',
		sm: 'w-[30px] h-[40px] rounded-[5px]',
		md: 'w-[42px] h-[56px] rounded-tile',
		lg: 'w-[54px] h-[72px] rounded-[7px]'
	};
</script>

<button
	type="button"
	class="inline-flex items-center justify-center bg-transparent shrink-0 cursor-pointer
	       border border-dashed border-line-strong text-ink-faint
	       transition-[border-color,color,background-color] duration-[180ms] ease-out-quart
	       hover:border-accent hover:text-accent hover:bg-accent-soft
	       focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
	       {SIZE_CLASSES[size]}
	       {focused
		? 'border-solid border-accent text-accent bg-accent-soft shadow-[0_0_0_2px_oklch(0.46_0.11_252/0.18)]'
		: ''}"
	aria-label={label}
	title={label}
	onclick={(e) => onclick?.(e)}
>
	<svg viewBox="0 0 16 16" class="w-[40%] h-[40%] opacity-70" aria-hidden="true">
		<path
			d="M8 3 L8 13 M3 8 L13 8"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
	</svg>
</button>
