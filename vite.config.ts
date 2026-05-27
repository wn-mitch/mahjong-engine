import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		// The full-game playout suites (gameStore + game) drive thousands of NMJL pattern
		// evaluations per test under fake timers — CPU-bound work that sits near Vitest's 5s
		// default and tips over on slower CI runners. Give every test generous headroom; a
		// genuinely hung test still fails via the per-test `guard` caps, just later.
		testTimeout: 30000
	}
});
