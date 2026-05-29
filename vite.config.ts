import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

const base = process.env.BASE_PATH ?? '';
const scope = base === '' ? '/' : `${base}/`;
const themeColor = '#fbfaf7';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			scope,
			base: scope,
			kit: { spa: true },
			includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon-source.svg'],
			manifest: {
				id: scope,
				name: 'Mahjong Engine',
				short_name: 'Mahjong',
				description: 'NMJL 2026 position analyzer — a Reading Room interface where tiles do the talking.',
				theme_color: themeColor,
				background_color: themeColor,
				display: 'standalone',
				orientation: 'portrait',
				start_url: scope,
				scope,
				icons: [
					{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
					{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
				navigateFallback: `${scope}404.html`
			},
			devOptions: { enabled: false }
		})
	],
	test: {
		// The full-game playout suites (gameStore + game) drive thousands of NMJL pattern
		// evaluations per test under fake timers — CPU-bound work that sits near Vitest's 5s
		// default and tips over on slower CI runners. Give every test generous headroom; a
		// genuinely hung test still fails via the per-test `guard` caps, just later.
		testTimeout: 30000
	}
});
