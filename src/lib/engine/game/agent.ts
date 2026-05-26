import type { CharlestonDirection, GameState } from '../gameState';
import type { GameRuleset } from '../ruleset';
import type { Tile } from '../tiles';
import { multisetDiff, tileEquals } from '../tiles';
import { selectCharlestonPass } from './charleston';
import { seatView } from './seatView';
import { applyDiscard, draw, resolveClaimWindow } from './runner';
import { wallRemaining } from './deal';
import type { BehaviorProfile, ClaimResponse, ClaimResponseKind, Match, SeatId, SeatPrivate } from './types';

const HAND_WHEN_ACTING = 14;

// A seat's decision-maker. Methods receive only the seat's projected view, never the full
// match, so an agent physically cannot consult hidden tiles.
export interface Agent {
	chooseDiscard(view: GameState, profile: BehaviorProfile, rng: () => number): Tile;
	chooseClaim(
		view: GameState,
		discard: Tile,
		profile: BehaviorProfile,
		rng: () => number
	): ClaimResponseKind;
	chooseCharlestonPass(
		view: GameState,
		direction: CharlestonDirection,
		profile: BehaviorProfile,
		rng: () => number
	): Tile[];
}

function clamp01(x: number): number {
	return Math.max(0, Math.min(1, x));
}

// One bot brain, shared across seats; behaviour is differentiated entirely by the per-seat
// BehaviorProfile passed at call time.
export function botAgent(ruleset: GameRuleset): Agent {
	return {
		chooseDiscard(view, profile, rng) {
			const sugg = ruleset.suggestDiscard(view);
			const best = sugg.discard ?? view.self.hand[view.self.hand.length - 1];

			// Less skill and more randomness both widen the chance of straying from the engine
			// line. A stray discards a random tile the top target doesn't need (never a joker).
			const strayChance = clamp01(profile.discardRandomness + (1 - profile.skill) * 0.15);
			if (rng() < strayChance) {
				const needed = ruleset.evaluateTargets(view)[0]?.tilesNeeded ?? [];
				const candidates = view.self.hand.filter(
					(t) => t.kind !== 'joker' && !needed.some((n) => tileEquals(n, t))
				);
				if (candidates.length > 0) return candidates[Math.floor(rng() * candidates.length)];
			}
			return best;
		},

		chooseClaim(view, discard, profile, rng) {
			if (ruleset.isLegalMahjong(view, { fromDiscard: discard })) return 'mahjong';

			// Very weak players rarely call at all.
			if (profile.skill < 0.2 && rng() > profile.skill) return 'pass';

			const options = ruleset.canClaimForExposure(view, discard);
			if (options.length === 0) return 'pass';

			// Claim only if acquiring the tile improves the top hand by more than a threshold that
			// shrinks as call-aggression rises (aggressive bots pounce on smaller gains). Adding
			// the tile to hand is a fair proxy: the matcher scores held and exposed tiles alike.
			const before = ruleset.evaluateTargets(view)[0]?.completionScore ?? 0;
			const withTile: GameState = {
				...view,
				self: { ...view.self, hand: [...view.self.hand, discard] }
			};
			const after = ruleset.evaluateTargets(withTile)[0]?.completionScore ?? 0;
			const threshold = (1 - profile.callAggression) * 0.05;
			if (after - before <= threshold) return 'pass';

			// Prefer a kong only when it costs no jokers; otherwise a pung conserves wildcards.
			const freeKong = options.find((o) => o.kind === 'kong' && o.jokersNeeded === 0);
			return freeKong ? 'kong' : 'pung';
		},

		chooseCharlestonPass(view, direction, profile, rng) {
			const picks = selectCharlestonPass(view, direction, ruleset);
			// A less committal (low-aggression) bot occasionally holds its most valuable proposed
			// pass tile and sheds a different low-value tile instead.
			if (direction !== 'courtesy' && rng() < (1 - profile.charlestonAggression) * 0.25) {
				const { leftover } = multisetDiff(view.self.hand, picks);
				const alt = leftover.find((t) => t.kind !== 'joker' && t.kind !== 'flower');
				if (alt) return [...picks.slice(0, 2), alt];
			}
			return picks;
		}
	};
}

function controlledCount(seat: SeatPrivate): number {
	return seat.hand.length + seat.exposures.reduce((n, e) => n + e.tiles.length, 0);
}

// Advance one turn with every seat driven by `agent` and its profile: draw, declare a
// self-draw win if there is one, otherwise discard and let the other seats decide whether to
// claim. This is the all-bot driver used for simulation and tests; the interactive game (M8)
// reuses the same primitives but substitutes the human's intents at seat 0.
export function stepWithBots(match: Match, agent: Agent, ruleset: GameRuleset): Match {
	if (match.phase !== 'play') return match;
	const seat = match.turn;

	let m = match;
	if (controlledCount(m.seats[seat]) < HAND_WHEN_ACTING) {
		if (wallRemaining(m) === 0) {
			return { ...m, phase: 'ended', result: { kind: 'wall-exhausted' } };
		}
		m = draw(m, seat);
	}

	const view = seatView(m, seat);
	if (ruleset.isLegalMahjong(view)) {
		return { ...m, phase: 'ended', result: { kind: 'mahjong', winner: seat, fromDiscard: false } };
	}

	const tile = agent.chooseDiscard(view, m.profiles[seat], m.rng);
	m = applyDiscard(m, seat, tile);

	const discardTile = m.discards[m.claim!.discardIndex].tile;
	const responses: ClaimResponse[] = m.claim!.pending.map((s) => ({
		seat: s,
		kind: agent.chooseClaim(seatView(m, s), discardTile, m.profiles[s], m.rng)
	}));
	return resolveClaimWindow(m, ruleset, responses);
}

export function runWithBots(match: Match, ruleset: GameRuleset, maxTurns = 400): Match {
	const agent = botAgent(ruleset);
	let m = match;
	let turns = 0;
	while (m.phase === 'play' && turns < maxTurns) {
		m = stepWithBots(m, agent, ruleset);
		turns += 1;
	}
	return m;
}
