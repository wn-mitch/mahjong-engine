<script lang="ts">
	import { nmjl2026, chineseTraditional } from '$lib/rulesets';

	const rulesets = [nmjl2026, chineseTraditional];
</script>

<main>
	<h1>mahjong-engine</h1>
	<p>A stockfish-style evaluator for mahjong. Skeleton scaffold — no evaluation logic yet.</p>

	<h2>Loaded rulesets</h2>
	<ul>
		{#each rulesets as r (r.id)}
			<li>
				<code>{r.id}</code> — {r.name} <small>v{r.version}</small>
			</li>
		{/each}
	</ul>

	<h2>Docs</h2>
	<ul>
		<li><a href="https://github.com/">README</a></li>
	</ul>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: system-ui, sans-serif;
		line-height: 1.5;
	}
	h1 {
		margin-bottom: 0.25rem;
	}
	code {
		background: #f4f4f4;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}
</style>
