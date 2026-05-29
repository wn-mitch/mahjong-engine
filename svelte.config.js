import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Static output for GitHub Pages. `fallback` doubles as the SPA entry so deep links
		// (and unknown paths) still boot the client app once Pages serves it.
		adapter: adapter({ fallback: '404.html' }),
		// Project pages live under a subpath (e.g. /mahjong-engine). CI sets BASE_PATH; locally
		// it's unset so dev/build/preview keep working at the root.
		paths: {
			base: process.env.BASE_PATH ?? ''
		},
		// vite-plugin-pwa owns the service worker (see vite.config.ts). Disable SvelteKit's
		// auto-registration so the two don't fight over `/sw.js`.
		serviceWorker: {
			register: false
		}
	}
};

export default config;
