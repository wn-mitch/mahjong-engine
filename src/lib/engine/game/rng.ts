// mulberry32 — a small, fast, well-distributed seedable PRNG. We need determinism (same
// seed -> same wall and same bot choices) so integration tests can assert exact transcripts;
// `Math.random` can't give us that. Returns a function compatible with `shuffleInPlace`.
export function makeRng(seed: number): () => number {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
