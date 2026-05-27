// Reactive `matchMedia` wrapper. The app is a static SPA (ssr = false, see +layout.ts), so `window`
// exists at component init in the browser and we can read the initial match synchronously — no
// hydration mismatch, no first-paint flash where a phone briefly renders the desktop layout. The
// $effect only keeps the value live as the viewport crosses the breakpoint, and cleans up the
// listener when the consuming component unmounts.
//
// Call this during component initialization (top of a <script>), the same way you'd call a rune.

export function createMediaQuery(query: string) {
	let matches = $state(
		typeof window !== 'undefined' && typeof window.matchMedia === 'function'
			? window.matchMedia(query).matches
			: false
	);

	$effect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const mql = window.matchMedia(query);
		matches = mql.matches;
		const onChange = (e: MediaQueryListEvent) => (matches = e.matches);
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	return {
		get matches() {
			return matches;
		}
	};
}

// Matches Tailwind's `max-sm` variant (the `--breakpoint-sm: 720px` token in app.css compiles to a
// `width < 720px` query), so JS-driven layout switches flip at the exact point the CSS does.
export const PHONE_QUERY = '(max-width: 719.98px)';
