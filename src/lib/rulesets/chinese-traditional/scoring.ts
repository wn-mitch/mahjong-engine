import type { Tile, Wind } from '../../engine/tiles';
import type { Decomposition, DecompSet } from './decomposer';

// Point table for the Mahjong Line ruleset, with two house-rule extensions called out below.
// Points sum independently — a hand that's both all-pungs and seat-wind-pung gets both bonuses.
// Source: https://themahjongline.com/pages/how-to-play-chinese-mahjong
//
// House-rule extensions (off by default; on when the caller asks):
//   - `THREE_SUIT_BONUS_POINTS`: +2 points for using at least one set from each of the three
//     suits. Played by the user's household; opt-in flag in the scoring context.
//   - `HALF_FLUSH_POINTS`, `PURE_SUIT_POINTS`: the source doesn't list dedicated bonuses for
//     these shapes, but they're staples of Hong Kong play and the user explicitly asked the
//     advisor to be scoring-aware. Encoded as constants so an opinionated table can override.

export const ALL_PUNGS_POINTS = 6;
export const ALL_CHOWS_POINTS = 2;
export const DRAGON_MELD_POINTS = 2;
export const TWO_DRAGON_MELDS_POINTS = 6; // overrides the linear 2 × 2 sum
export const THREE_DRAGON_MELDS_POINTS = 8; // small bonus above linear; the source is silent here
export const SEAT_WIND_MELD_POINTS = 2;
export const ROUND_WIND_MELD_POINTS = 2;
export const SELF_DRAW_POINTS = 1;
export const FLOWER_POINTS = 1;
export const THREE_SUIT_BONUS_POINTS = 2;
export const HALF_FLUSH_POINTS = 3;
export const PURE_SUIT_POINTS = 6;

export interface ScoringContext {
	seatWind: Wind;
	roundWind: Wind;
	flowers: number;
	selfDraw: boolean;
	includeThreeSuitBonus: boolean;
}

export function defaultContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
	return {
		seatWind: 'E',
		roundWind: 'E',
		flowers: 0,
		selfDraw: false,
		includeThreeSuitBonus: true,
		...overrides
	};
}

export interface ScoreBreakdown {
	points: number;
	parts: Array<{ source: string; value: number }>;
}

// ---------------------------------------------------------------------------------------------
// Shape predicates over a decomposition. These ignore the pair (the source's point bonuses
// likewise look at the four sets, not the pair).

function isCompleteMeld(s: DecompSet): boolean {
	return s.needed.length === 0 && (s.kind === 'kong' ? s.filled === 4 : s.filled === 3);
}

function meldIsPungLike(s: DecompSet): boolean {
	return s.kind === 'pung' || s.kind === 'kong';
}

function allPungs(sets: DecompSet[]): boolean {
	if (sets.length !== 4) return false;
	return sets.every((s) => isCompleteMeld(s) && meldIsPungLike(s));
}

function allChows(sets: DecompSet[]): boolean {
	if (sets.length !== 4) return false;
	return sets.every((s) => isCompleteMeld(s) && s.kind === 'chow');
}

function meldAnchor(s: DecompSet): Tile | null {
	return s.tiles[0] ?? null;
}

function isDragonMeld(s: DecompSet): boolean {
	if (!meldIsPungLike(s) || !isCompleteMeld(s)) return false;
	const t = meldAnchor(s);
	return !!t && t.kind === 'dragon';
}

function isWindMeldOf(s: DecompSet, wind: Wind): boolean {
	if (!meldIsPungLike(s) || !isCompleteMeld(s)) return false;
	const t = meldAnchor(s);
	return !!t && t.kind === 'wind' && t.wind === wind;
}

function meldSuitsRepresented(sets: DecompSet[]): Set<string> {
	const out = new Set<string>();
	for (const s of sets) {
		if (!isCompleteMeld(s)) continue;
		const t = meldAnchor(s);
		if (t && t.kind === 'number') out.add(t.suit);
	}
	return out;
}

// ---------------------------------------------------------------------------------------------

export function scoreDecomposition(d: Decomposition, ctx: ScoringContext): ScoreBreakdown {
	const parts: ScoreBreakdown['parts'] = [];
	let points = 0;

	if (allPungs(d.sets)) {
		points += ALL_PUNGS_POINTS;
		parts.push({ source: 'All Pungs', value: ALL_PUNGS_POINTS });
	}
	if (allChows(d.sets)) {
		points += ALL_CHOWS_POINTS;
		parts.push({ source: 'All Chows', value: ALL_CHOWS_POINTS });
	}

	// Dragon melds — count only those that are fully formed. The 2-dragon bonus replaces
	// the linear sum; we add an explicit single line so the breakdown reflects intent.
	const dragonMelds = d.sets.filter(isDragonMeld).length;
	if (dragonMelds >= 1) {
		let dragonValue: number;
		if (dragonMelds === 1) dragonValue = DRAGON_MELD_POINTS;
		else if (dragonMelds === 2) dragonValue = TWO_DRAGON_MELDS_POINTS;
		else dragonValue = THREE_DRAGON_MELDS_POINTS;
		points += dragonValue;
		parts.push({ source: `Dragon meld${dragonMelds > 1 ? `s ×${dragonMelds}` : ''}`, value: dragonValue });
	}

	// Seat wind and round wind. If they're the same wind (e.g., East seat in East round) and
	// the seat has a pung of that wind, both bonuses apply — they're treated as independent
	// scoring rules per the source's table.
	const seatWindMelds = d.sets.filter((s) => isWindMeldOf(s, ctx.seatWind)).length;
	if (seatWindMelds > 0) {
		const v = SEAT_WIND_MELD_POINTS * seatWindMelds;
		points += v;
		parts.push({ source: `Seat wind (${ctx.seatWind}) meld`, value: v });
	}
	const roundWindMelds = d.sets.filter((s) => isWindMeldOf(s, ctx.roundWind)).length;
	if (roundWindMelds > 0) {
		const v = ROUND_WIND_MELD_POINTS * roundWindMelds;
		points += v;
		parts.push({ source: `Round wind (${ctx.roundWind}) meld`, value: v });
	}

	if (ctx.selfDraw) {
		points += SELF_DRAW_POINTS;
		parts.push({ source: 'Self-draw', value: SELF_DRAW_POINTS });
	}

	if (ctx.flowers > 0) {
		const v = FLOWER_POINTS * ctx.flowers;
		points += v;
		parts.push({ source: `Flowers/seasons ×${ctx.flowers}`, value: v });
	}

	// Single-suit shape bonuses. Both predicates inspect the four complete melds + the pair;
	// they're mutually exclusive (pure-suit forbids honors, half-flush requires one).
	const completeSets = d.sets.filter(isCompleteMeld);
	if (completeSets.length === 4) {
		const numberSuits = new Set<string>();
		let hasHonor = false;
		let hasNumber = false;
		for (const s of completeSets) {
			const t = meldAnchor(s);
			if (!t) continue;
			if (t.kind === 'number') {
				numberSuits.add(t.suit);
				hasNumber = true;
			} else hasHonor = true;
		}
		if (d.pair) {
			const t = d.pair.tile;
			if (t.kind === 'number') {
				numberSuits.add(t.suit);
				hasNumber = true;
			} else hasHonor = true;
		}

		if (hasNumber && !hasHonor && numberSuits.size === 1) {
			const suit = numberSuits.values().next().value;
			points += PURE_SUIT_POINTS;
			parts.push({ source: `Pure Suit (${suit})`, value: PURE_SUIT_POINTS });
		} else if (hasNumber && hasHonor && numberSuits.size === 1) {
			points += HALF_FLUSH_POINTS;
			parts.push({ source: 'Half Flush', value: HALF_FLUSH_POINTS });
		}
	}

	// House-rule three-suits bonus: at least one meld from each of the three suits. Honors
	// don't satisfy any suit requirement.
	if (ctx.includeThreeSuitBonus && completeSets.length === 4) {
		const suits = meldSuitsRepresented(completeSets);
		if (suits.size === 3) {
			points += THREE_SUIT_BONUS_POINTS;
			parts.push({ source: 'Three Suits (house rule)', value: THREE_SUIT_BONUS_POINTS });
		}
	}

	return { points, parts };
}
