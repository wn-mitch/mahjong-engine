import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Static output via adapter-static (served by Cloudflare Pages at the subdomain root).
		// `fallback` doubles as the SPA entry so deep links still boot the client app.
		adapter: adapter({ fallback: '404.html' }),
		// vite-plugin-pwa owns the service worker (see vite.config.ts). Disable SvelteKit's
		// auto-registration so the two don't fight over `/sw.js`.
		serviceWorker: {
			register: false
		}
	}
};

export default config;
