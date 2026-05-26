// Ad-hoc Playwright probe for the Charleston flow. Drives the real UI:
//  (A) imports a fixed "round 2" position and inspects the `across` suggestion vs. the
//      top-2 ranked targets, then
//  (B) plays full random Charleston rounds (right/across/left/courtesy) flagging any
//      suggested tile that was a *filled* slot in a top-2 target at decision time.
// Run the dev server first, then: `node scripts/pw-charleston.mjs` (set URL=... to override).
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5173';
const ROUNDS = Number(process.env.ROUNDS || 6);

const round2 = {
	rulesetId: 'nmjl-2026',
	state: {
		phase: 'charleston',
		self: {
			hand: [
				{ kind: 'number', suit: 'crack', rank: 3 },
				{ kind: 'number', suit: 'crack', rank: 9 },
				{ kind: 'number', suit: 'crack', rank: 3 },
				{ kind: 'number', suit: 'bamboo', rank: 2 },
				{ kind: 'dragon', dragon: 'red' },
				{ kind: 'number', suit: 'bamboo', rank: 3 },
				{ kind: 'number', suit: 'bamboo', rank: 5 },
				{ kind: 'number', suit: 'crack', rank: 1 },
				{ kind: 'number', suit: 'dot', rank: 6 },
				{ kind: 'wind', wind: 'E' },
				{ kind: 'number', suit: 'dot', rank: 5 },
				{ kind: 'wind', wind: 'S' },
				{ kind: 'number', suit: 'crack', rank: 6 }
			],
			exposures: []
		},
		opponents: { left: [], across: [], right: [] },
		discards: [],
		charleston: {
			passes: [
				{
					direction: 'right',
					sentTiles: [
						{ kind: 'number', suit: 'crack', rank: 8 },
						{ kind: 'number', suit: 'crack', rank: 4 },
						{ kind: 'wind', wind: 'N' }
					],
					receivedTiles: [
						{ kind: 'number', suit: 'dot', rank: 5 },
						{ kind: 'wind', wind: 'S' },
						{ kind: 'number', suit: 'crack', rank: 6 }
					]
				}
			]
		}
	}
};

// Read the Sent buffer's tile aria-labels (excludes the empty "add tile" slot).
async function readSent(page) {
	return page.evaluate(() => {
		const lbl = [...document.querySelectorAll('button')].find((b) =>
			/^Sent\b/.test((b.textContent || '').trim())
		);
		if (!lbl) return [];
		const container = lbl.parentElement.children[1];
		return [...container.querySelectorAll('[aria-label]')]
			.map((e) => e.getAttribute('aria-label'))
			.filter((l) => l && !/^add tile/i.test(l));
	});
}

// Read top-N ranked targets: for each, the labels of slot tiles that are *filled*
// (ghost = opacity-[0.32], without a joker badge). Must be read BEFORE queueing a pass,
// because queued tiles are removed from the evaluated (effective) state.
async function readTopFilled(page, n = 2) {
	return page.evaluate((n) => {
		const ol = document.querySelector('ol');
		if (!ol) return [];
		const lis = [...ol.children].slice(0, n);
		return lis.map((li, rank) => {
			const slots = [...li.querySelectorAll('[role="img"][aria-label]')];
			const filled = slots
				.filter((s) => (s.className || '').includes('opacity-[0.32]'))
				.filter((s) => {
					const badge = [...s.querySelectorAll('span')].some(
						(x) => (x.textContent || '').trim() === 'J'
					);
					return !badge; // exclude joker-filled
				})
				.map((s) => s.getAttribute('aria-label'));
			const desc = li.querySelector('button span:nth-child(2) span')?.textContent?.trim() || '';
			const score =
				[...li.querySelectorAll('span')]
					.map((s) => (s.textContent || '').trim())
					.find((t) => /^\d\.\d\d$/.test(t)) || '?';
			return { rank: rank + 1, desc, score, filled };
		});
	}, n);
}

// Read the player's hand tile labels (the "Your hand" section).
async function readHand(page) {
	return page.evaluate(() => {
		const hdr = [...document.querySelectorAll('button')].find((b) =>
			/^\s*Your hand/.test((b.textContent || '').replace(/\s+/g, ' '))
		);
		let sec = hdr;
		while (sec && sec.tagName !== 'SECTION') sec = sec.parentElement;
		const root = sec || document;
		return [...root.querySelectorAll('button[aria-label]')]
			.map((b) => b.getAttribute('aria-label'))
			.filter((l) => l && !/^add tile/i.test(l));
	});
}

// Upper bound on tiles the engine could freely pass: singletons not filling a top-2 slot.
// (Ignores topNeeds, which only adds protection — so if this is <3 the pass is forced.)
function freeBudget(hand, top2Filled) {
	const counts = new Map();
	for (const l of hand) counts.set(l, (counts.get(l) ?? 0) + 1);
	const contrib = new Set(top2Filled);
	let n = 0;
	for (const [label, c] of counts) if (c === 1 && !contrib.has(label)) n++;
	return n;
}

async function nextDirLabel(page) {
	// The active suggest button text is "suggest pass (<dir>)".
	return page.evaluate(() => {
		const b = [...document.querySelectorAll('button')].find((b) =>
			/^suggest pass/i.test((b.textContent || '').trim())
		);
		const m = b && (b.textContent || '').match(/\(([^)]+)\)/);
		return m ? m[1] : null;
	});
}

async function clickByText(page, re) {
	const b = page.locator('button', { hasText: re }).first();
	await b.click();
}

async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	const findings = [];
	page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

	await page.goto(URL, { waitUntil: 'networkidle' });

	// ---- (A) deterministic round-2 reproduction ----
	console.log('\n========== (A) ROUND-2 REPRODUCTION ==========');
	await clickByText(page, /position JSON/i);
	await page.locator('#position-json').fill(JSON.stringify(round2));
	await clickByText(page, /^apply$/i);
	await page.waitForTimeout(150);

	const dir = await nextDirLabel(page);
	console.log('next direction:', dir);
	const top = await readTopFilled(page, 3);
	console.log('top targets (filled slots) BEFORE suggest:');
	for (const t of top) console.log(`  #${t.rank} ${t.score}  [${t.filled.join(', ')}]  ${t.desc}`);

	await clickByText(page, /^suggest pass/i);
	await page.waitForTimeout(150);
	const sent = await readSent(page);
	console.log('SUGGESTED pass:', JSON.stringify(sent));

	const top2Filled = new Set(top.slice(0, 2).flatMap((t) => t.filled));
	const collide = sent.filter((s) => top2Filled.has(s));
	console.log(
		collide.length
			? `>>> COLLISION: suggested ${JSON.stringify(collide)} that fill a top-2 slot`
			: '>>> OK: no suggested tile fills a top-2 slot'
	);

	// ---- (B) random full rounds ----
	console.log('\n========== (B) RANDOM FULL ROUNDS ==========');
	// ensure charleston phase
	await clickByText(page, /^Charleston$/);
	for (let r = 0; r < ROUNDS; r++) {
		await clickByText(page, /random position/i);
		await page.waitForTimeout(120);
		for (const _ of ['right', 'across', 'left', 'courtesy']) {
			const d = await nextDirLabel(page);
			if (!d) break;
			const tops = await readTopFilled(page, 2);
			const t2 = new Set(tops.flatMap((t) => t.filled));
			const hand = await readHand(page);
			const budget = freeBudget(hand, [...t2]);
			await clickByText(page, /^suggest pass/i);
			await page.waitForTimeout(80);
			const s = await readSent(page);
			if (s.length === 0) {
				// courtesy declined or nothing to pass
				if (d === 'courtesy') {
					await clickByText(page, /skip courtesy/i);
					await page.waitForTimeout(60);
				}
				break;
			}
			const hit = s.filter((x) => t2.has(x));
			if (hit.length) {
				const forced = budget < 3; // not enough free tiles → relaxation legitimately required
				let json = null;
				if (!forced) {
					// Capture the exact replayable state for offline analysis.
					await clickByText(page, /position JSON/i);
					json = await page.locator('#position-json').inputValue();
					await clickByText(page, /^close$/i);
				}
				findings.push({ round: r, dir: d, suggested: s, collidesTop2: hit, budget, forced, tops, hand, json });
				console.log(
					`round ${r} ${d}: ${forced ? 'forced-relax' : 'BUG?'} budget=${budget} suggested=${JSON.stringify(s)} hit=${JSON.stringify(hit)}`
				);
				if (json) console.log('   STATE:', json.replace(/\s+/g, ' '));
			}
			// receive + commit to advance
			await clickByText(page, /received random/i);
			await page.waitForTimeout(60);
			const commit = page.locator('button', { hasText: /commit pass/i }).first();
			if (await commit.isEnabled()) {
				await commit.click();
				await page.waitForTimeout(80);
			} else {
				break;
			}
		}
	}

	console.log('\n========== SUMMARY ==========');
	const bugs = findings.filter((f) => !f.forced);
	console.log(`random-round collisions: ${findings.length} (forced-relax: ${findings.length - bugs.length}, BUG?: ${bugs.length})`);
	for (const f of bugs) {
		console.log(`  BUG? round ${f.round} ${f.dir} budget=${f.budget}: ${JSON.stringify(f.collidesTop2)} in ${JSON.stringify(f.suggested)}`);
		for (const t of f.tops) console.log(`     #${t.rank} ${t.score} [${t.filled.join(', ')}] ${t.desc}`);
	}

	await browser.close();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
