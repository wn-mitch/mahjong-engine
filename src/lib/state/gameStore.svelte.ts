import type { Tile } from '$lib/engine/tiles';
import type { CharlestonDirection, GameState } from '$lib/engine/gameState';
import type { ClaimOption, GameRuleset, TargetEvaluation } from '$lib/engine/ruleset';
import { nmjl2026 } from '$lib/rulesets';
import {
	createMatch,
	beginCharleston,
	charlestonPass,
	courtesyPass,
	botCharlestonPass,
	selectCharlestonPass,
	seatView,
	draw,
	applyDiscard,
	resolveClaimWindow,
	botAgent,
	wallRemaining,
	relativePosition
} from '$lib/engine/game';
import type {
	ClaimResponse,
	ClaimResponseKind,
	Match,
	SeatId,
	SeatPrivate
} from '$lib/engine/game';

export type RulesetId = 'nmjl-2026';

// The interaction sub-state layered over `match.phase`. `match.phase` says where the rules
// are; this says what the *human* is being asked for right now.
export type Interaction =
	| { kind: 'charleston-pass' } // pick 3 tiles for the current directional pass
	| { kind: 'charleston-vote' } // agree/decline the optional second charleston
	| { kind: 'charleston-courtesy-count' } // declare how many to pass across (0–3)
	| { kind: 'charleston-courtesy-pass' } // pick the negotiated courtesy count
	| { kind: 'human-turn' } // auto-drawn; awaiting a discard (or a self-draw mahjong)
	| { kind: 'bot-thinking' } // a delayed bot tick is scheduled
	| { kind: 'claim' } // a discard is on offer and the human can claim it
	| { kind: 'idle' }; // between transitions / ended

export interface ClaimOffer {
	tile: Tile;
	discarder: SeatId;
	options: ClaimOption[];
	canMahjong: boolean;
}

const RULESETS: Record<RulesetId, GameRuleset> = { 'nmjl-2026': nmjl2026 };
const BOT_DELAY_MS = 700;
const HAND_WHEN_ACTING = 14;

const SEAT_LABELS = ['You', 'Right', 'Across', 'Left'] as const;

function controlledCount(seat: SeatPrivate): number {
	return seat.hand.length + seat.exposures.reduce((n, e) => n + e.tiles.length, 0);
}

function randomSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}

export function createGameStore(rulesetId: RulesetId = 'nmjl-2026', initialSeed?: number) {
	const ruleset = RULESETS[rulesetId];
	const agent = botAgent(ruleset);

	let match = $state<Match>(freshMatch(initialSeed ?? randomSeed()));
	let interaction = $state<Interaction>({ kind: 'idle' });
	let planCursor = $state(0);
	let votedSecond = $state(false);
	let passIndices = $state<number[]>([]); // indices into the human's concealed hand
	let courtesyCount = $state(0); // negotiated count the human will pass across
	let claimOffer = $state<ClaimOffer | null>(null);
	let revealed = $state(false);
	let hintOn = $state(false);
	let cardOpen = $state(false);

	// Cancels stale `setTimeout` bot ticks across a `newGame`: a tick captures the generation
	// it was scheduled under and bails if it no longer matches.
	let generation = 0;

	function freshMatch(seed: number): Match {
		return beginCharleston(createMatch({ rulesetId, seed, dealer: 0 }));
	}

	const plan = ruleset.charlestonPlan();

	// ---- charleston ------------------------------------------------------------------------

	function currentStepDirection(): CharlestonDirection | null {
		return plan[planCursor]?.direction ?? null;
	}

	function enterCharlestonStep() {
		passIndices = [];
		if (planCursor >= plan.length) {
			enterPlay();
			return;
		}
		const step = plan[planCursor];
		if (step.direction === 'courtesy') {
			courtesyCount = 0;
			interaction = { kind: 'charleston-courtesy-count' };
			return;
		}
		if (step.optional && !votedSecond) {
			interaction = { kind: 'charleston-vote' };
			return;
		}
		interaction = { kind: 'charleston-pass' };
	}

	function botPicksFor(direction: CharlestonDirection): [Tile[], Tile[], Tile[], Tile[]] {
		const human = passIndices.map((i) => $state.snapshot(match.seats[0].hand[i]));
		return [
			human,
			botCharlestonPass(match, 1, direction, ruleset),
			botCharlestonPass(match, 2, direction, ruleset),
			botCharlestonPass(match, 3, direction, ruleset)
		];
	}

	function commitCharlestonPass() {
		if (interaction.kind !== 'charleston-pass') return;
		if (passIndices.length !== 3) return;
		const direction = plan[planCursor].direction;
		match = charlestonPass(match, direction, botPicksFor(direction));
		planCursor += 1;
		enterCharlestonStep();
	}

	// A bot agrees to a second charleston when its hand is still weak, or at random scaled by
	// its charleston aggression. Early hands score low, so bots usually agree if the human does.
	function botAgreesSecond(seat: SeatId): boolean {
		const score = ruleset.evaluateTargets(seatView(match, seat))[0]?.completionScore ?? 0;
		return score < 0.5 || match.rng() < match.profiles[seat].charlestonAggression;
	}

	function voteSecondCharleston(yes: boolean) {
		if (interaction.kind !== 'charleston-vote') return;
		votedSecond = true;
		const accepted = yes && [1, 2, 3].every((s) => botAgreesSecond(s as SeatId));
		if (!accepted) planCursor = plan.length - 1; // skip optional passes, jump to courtesy
		enterCharlestonStep();
	}

	// How many tiles a bot wants to pass in the courtesy, keyed off its charleston aggression.
	function botCourtesyWant(seat: SeatId): number {
		return Math.max(0, Math.min(3, Math.round(match.profiles[seat].charlestonAggression * 3)));
	}

	function setCourtesyCount(n: number) {
		if (interaction.kind !== 'charleston-courtesy-count') return;
		const want = Math.max(0, Math.min(3, n));
		// The across pair exchanges the minimum of the two desired counts.
		courtesyCount = Math.min(want, botCourtesyWant(2));
		if (courtesyCount === 0) {
			commitCourtesy();
			return;
		}
		passIndices = [];
		interaction = { kind: 'charleston-courtesy-pass' };
	}

	function commitCourtesy() {
		const eff02 = courtesyCount;
		const human = passIndices.slice(0, eff02).map((i) => $state.snapshot(match.seats[0].hand[i]));
		const eff13 = Math.min(botCourtesyWant(1), botCourtesyWant(3));
		const pick2 = selectCharlestonPass(seatView(match, 2), 'courtesy', ruleset).slice(0, eff02);
		const pick1 = selectCharlestonPass(seatView(match, 1), 'courtesy', ruleset).slice(0, eff13);
		const pick3 = selectCharlestonPass(seatView(match, 3), 'courtesy', ruleset).slice(0, eff13);
		match = courtesyPass(match, [human, pick1, pick2, pick3]);
		planCursor += 1;
		enterCharlestonStep();
	}

	// ---- play ------------------------------------------------------------------------------

	function enterPlay() {
		match = { ...match, phase: 'play', turn: match.dealer };
		advance();
	}

	function endWall() {
		match = { ...match, phase: 'ended', claim: undefined, result: { kind: 'wall-exhausted' } };
		interaction = { kind: 'idle' };
	}

	function endSelfDraw(seat: SeatId) {
		match = {
			...match,
			phase: 'ended',
			claim: undefined,
			result: { kind: 'mahjong', winner: seat, fromDiscard: false }
		};
		interaction = { kind: 'idle' };
	}

	// Move the game to whoever is to play. The human is asked for an intent; bots tick on a
	// cosmetic delay. Determinism is unaffected — the rng lives in the match, not the timer.
	function advance() {
		if (match.phase === 'ended') {
			interaction = { kind: 'idle' };
			return;
		}
		if (match.phase !== 'play') return;
		const seat = match.turn;
		if (seat === 0) {
			if (controlledCount(match.seats[0]) < HAND_WHEN_ACTING) {
				if (wallRemaining(match) === 0) return endWall();
				match = draw(match, 0);
			}
			interaction = { kind: 'human-turn' };
		} else {
			interaction = { kind: 'bot-thinking' };
			scheduleBotTick(seat);
		}
	}

	function scheduleBotTick(seat: SeatId) {
		const gen = generation;
		setTimeout(() => {
			if (gen !== generation) return; // a newGame cancelled this tick
			if (match.phase !== 'play' || match.turn !== seat) return; // a claim moved the turn
			botTurn(seat);
		}, BOT_DELAY_MS);
	}

	function botTurn(seat: SeatId) {
		if (controlledCount(match.seats[seat]) < HAND_WHEN_ACTING) {
			if (wallRemaining(match) === 0) return endWall();
			match = draw(match, seat);
		}
		const view = seatView(match, seat);
		if (ruleset.isLegalMahjong(view)) return endSelfDraw(seat);
		const tile = agent.chooseDiscard(view, match.profiles[seat], match.rng);
		match = applyDiscard(match, seat, tile);
		openClaim(tile, seat);
	}

	function selectDiscard(tile: Tile) {
		if (match.turn !== 0 || interaction.kind !== 'human-turn') return;
		match = applyDiscard(match, 0, $state.snapshot(tile));
		openClaim($state.snapshot(tile), 0);
	}

	function declareMahjong() {
		if (match.turn !== 0 || interaction.kind !== 'human-turn') return;
		if (!ruleset.isLegalMahjong(seatView(match, 0))) return;
		endSelfDraw(0);
	}

	// A discard has been made and a claim window is open. Prompt the human only when they have a
	// legal claim; otherwise auto-pass on their behalf and resolve immediately.
	function openClaim(tile: Tile, discarder: SeatId) {
		let options: ClaimOption[] = [];
		let canMahjong = false;
		if (discarder !== 0) {
			const v0 = seatView(match, 0);
			options = ruleset.canClaimForExposure(v0, tile);
			canMahjong = ruleset.isLegalMahjong(v0, { fromDiscard: tile });
		}
		if (options.length > 0 || canMahjong) {
			claimOffer = { tile, discarder, options, canMahjong };
			interaction = { kind: 'claim' };
		} else {
			resolveClaim('pass');
		}
	}

	function respondToClaim(kind: ClaimResponseKind) {
		if (interaction.kind !== 'claim') return;
		resolveClaim(kind);
	}

	function resolveClaim(humanKind: ClaimResponseKind) {
		const claim = match.claim;
		if (!claim) return;
		const entry = match.discards[claim.discardIndex];
		const responses: ClaimResponse[] = [];
		if (humanKind !== 'pass') responses.push({ seat: 0, kind: humanKind });
		for (const s of claim.pending) {
			if (s === 0) continue; // the human's response is supplied above
			responses.push({
				seat: s,
				kind: agent.chooseClaim(seatView(match, s), entry.tile, match.profiles[s], match.rng)
			});
		}
		match = resolveClaimWindow(match, ruleset, responses);
		claimOffer = null;
		if (match.phase === 'ended') {
			interaction = { kind: 'idle' };
			return;
		}
		advance();
	}

	// ---- top-level controls ----------------------------------------------------------------

	function newGame(seed?: number) {
		generation += 1; // cancel any pending bot tick
		match = freshMatch(seed ?? randomSeed());
		planCursor = 0;
		votedSecond = false;
		passIndices = [];
		courtesyCount = 0;
		claimOffer = null;
		revealed = false;
		enterCharlestonStep();
	}

	function toggleCharlestonTile(srcIndex: number) {
		if (interaction.kind !== 'charleston-pass' && interaction.kind !== 'charleston-courtesy-pass')
			return;
		const target = interaction.kind === 'charleston-pass' ? 3 : courtesyCount;
		const at = passIndices.indexOf(srcIndex);
		if (at >= 0) {
			passIndices = passIndices.filter((i) => i !== srcIndex);
			return;
		}
		// Jokers may never be passed in the charleston.
		if (match.seats[0].hand[srcIndex]?.kind === 'joker') return;
		if (passIndices.length < target) passIndices = [...passIndices, srcIndex];
	}

	function toggleReveal() {
		revealed = !revealed;
	}

	function toggleHint() {
		hintOn = !hintOn;
	}

	function toggleCard() {
		cardOpen = !cardOpen;
	}

	// Kick off the opening charleston step for the initial match.
	enterCharlestonStep();

	// ---- derived views ---------------------------------------------------------------------

	const humanView = $derived<GameState>(seatView(match, 0));
	const queued = $derived(new Set(passIndices));
	const passTarget = $derived(
		interaction.kind === 'charleston-pass'
			? 3
			: interaction.kind === 'charleston-courtesy-pass'
				? courtesyCount
				: 0
	);
	const engineSuggestion = $derived.by<Tile | null>(() => {
		if (!hintOn || interaction.kind !== 'human-turn') return null;
		try {
			return ruleset.suggestDiscard(humanView).discard;
		} catch {
			return null;
		}
	});
	// Tiles the engine would act on right now, used to ring the human's hand: the discard pick
	// on the human's turn, or the recommended pass tiles during a charleston step. Empty unless
	// the hint is on and there's actually a human decision pending — so the toggle always has a
	// visible effect when it could.
	const suggestedTiles = $derived.by<Tile[]>(() => {
		if (!hintOn) return [];
		try {
			if (interaction.kind === 'human-turn') {
				const d = ruleset.suggestDiscard(humanView).discard;
				return d ? [d] : [];
			}
			if (interaction.kind === 'charleston-pass') {
				const dir = currentStepDirection();
				return dir ? ruleset.suggestCharlestonPass(humanView, dir).tiles.slice(0, 3) : [];
			}
			if (interaction.kind === 'charleston-courtesy-pass') {
				return ruleset.suggestCharlestonPass(humanView, 'courtesy').tiles.slice(0, courtesyCount);
			}
		} catch {
			/* fall through to no suggestion */
		}
		return [];
	});
	const topTarget = $derived.by<TargetEvaluation | null>(() => {
		if (!hintOn) return null;
		try {
			return ruleset.evaluateTargets(humanView)[0] ?? null;
		} catch {
			return null;
		}
	});
	// The engine's read of the human's hand — the annotated "card", computed only while open.
	const targets = $derived.by<TargetEvaluation[]>(() => {
		if (!cardOpen) return [];
		try {
			return ruleset.evaluateTargets(humanView);
		} catch {
			return [];
		}
	});

	return {
		get phase() {
			return match.phase;
		},
		get interaction() {
			return interaction;
		},
		get humanView() {
			return humanView;
		},
		get seats() {
			return match.seats;
		},
		get turn() {
			return match.turn;
		},
		get dealer() {
			return match.dealer;
		},
		get isHumanTurn() {
			return match.turn === 0 && interaction.kind === 'human-turn';
		},
		get wallRemaining() {
			return wallRemaining(match);
		},
		get discards() {
			return match.discards;
		},
		get charlestonDirection() {
			return currentStepDirection();
		},
		get isOptionalStep() {
			return plan[planCursor]?.optional ?? false;
		},
		get passTarget() {
			return passTarget;
		},
		get queuedIndices() {
			return queued;
		},
		get courtesyCount() {
			return courtesyCount;
		},
		get claimOffer() {
			return claimOffer;
		},
		get result() {
			return match.result ?? null;
		},
		get canDeclareMahjong() {
			return (
				match.turn === 0 &&
				interaction.kind === 'human-turn' &&
				ruleset.isLegalMahjong(humanView)
			);
		},
		get revealed() {
			return revealed;
		},
		get hintOn() {
			return hintOn;
		},
		get cardOpen() {
			return cardOpen;
		},
		get engineSuggestion() {
			return engineSuggestion;
		},
		get suggestedTiles() {
			return suggestedTiles;
		},
		get topTarget() {
			return topTarget;
		},
		get targets() {
			return targets;
		},
		seatLabel(seat: SeatId) {
			return SEAT_LABELS[seat];
		},
		relativeLabel(seat: SeatId) {
			return relativePosition(0, seat);
		},
		newGame,
		toggleCharlestonTile,
		commitCharlestonPass,
		voteSecondCharleston,
		setCourtesyCount,
		commitCourtesy,
		selectDiscard,
		declareMahjong,
		respondToClaim,
		toggleReveal,
		toggleHint,
		toggleCard
	};
}

export type GameStore = ReturnType<typeof createGameStore>;
