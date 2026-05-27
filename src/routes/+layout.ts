// Static-site page options for the whole app (adapter-static / GitHub Pages).
// `prerender` emits a static HTML file per route; `ssr = false` skips server rendering so the
// random match seed created at component init doesn't cause a hydration mismatch — each route is
// a prerendered shell the client fills in.
export const prerender = true;
export const ssr = false;
