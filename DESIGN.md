---
name: mahjong-engine
description: A position analyzer for American NMJL — a Reading Room interface where mahjong tiles do the talking.
colors:
  paper-white: "oklch(0.985 0.005 80)"
  aged-vellum: "oklch(0.965 0.006 80)"
  bleached-paper: "oklch(0.995 0.004 80)"
  ink-black: "oklch(0.20 0.012 80)"
  pencil-gray: "oklch(0.44 0.010 80)"
  margin-gray: "oklch(0.62 0.008 80)"
  ruled-line: "oklch(0.88 0.008 80)"
  heavy-rule: "oklch(0.78 0.010 80)"
  bookmark-indigo: "oklch(0.46 0.11 252)"
  tinted-vellum-indigo: "oklch(0.93 0.04 252)"
  marginal-note-indigo: "oklch(0.32 0.10 252)"
  marginalia-green: "oklch(0.55 0.07 145)"
  tinted-vellum-green: "oklch(0.94 0.03 145)"
  crack-red: "oklch(0.50 0.16 25)"
  bamboo-green: "oklch(0.46 0.13 145)"
  dot-indigo: "oklch(0.38 0.09 245)"
  petal-pink: "oklch(0.55 0.08 30)"
  joker-violet: "oklch(0.30 0.04 305)"
typography:
  display:
    fontFamily: "'Inter Tight', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.953rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.005em"
  body:
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
  numeric:
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "'tnum'"
  cjk:
    fontFamily: "'PingFang SC', 'Hiragino Sans GB', 'Source Han Sans SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.05em"
rounded:
  hairline: "0px"
  tile: "6px"
  panel: "10px"
  chip: "999px"
spacing:
  hair: "0.25rem"
  tight: "0.5rem"
  snug: "0.75rem"
  base: "1rem"
  loose: "1.5rem"
  wide: "2rem"
  expanse: "3rem"
components:
  tile-face:
    backgroundColor: "{colors.bleached-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.tile}"
    padding: "0"
    height: "56px"
    width: "42px"
  tile-suggested:
    backgroundColor: "{colors.bleached-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.tile}"
    padding: "0"
    height: "56px"
    width: "42px"
  tile-slot:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.margin-gray}"
    rounded: "{rounded.tile}"
    padding: "0"
    height: "56px"
    width: "42px"
  tile-slot-focused:
    backgroundColor: "{colors.tinted-vellum-indigo}"
    textColor: "{colors.bookmark-indigo}"
    rounded: "{rounded.tile}"
    padding: "0"
    height: "56px"
    width: "42px"
  chip-rest:
    backgroundColor: "transparent"
    textColor: "{colors.pencil-gray}"
    rounded: "{rounded.chip}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.numeric}"
  chip-selected:
    backgroundColor: "{colors.bleached-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.chip}"
    padding: "0.25rem 0.75rem"
    typography: "{typography.numeric}"
  panel:
    backgroundColor: "{colors.bleached-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.panel}"
    padding: "1rem"
  panel-sunk:
    backgroundColor: "{colors.aged-vellum}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.panel}"
    padding: "0.75rem 1.5rem"
  button-primary:
    backgroundColor: "{colors.bookmark-indigo}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.chip}"
    padding: "0.5rem 1rem"
    typography: "{typography.numeric}"
  button-primary-hover:
    backgroundColor: "{colors.marginal-note-indigo}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.chip}"
    padding: "0.5rem 1rem"
    typography: "{typography.numeric}"
  button-secondary:
    backgroundColor: "{colors.bleached-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.chip}"
    padding: "0.5rem 1rem"
    typography: "{typography.numeric}"
  link:
    backgroundColor: "transparent"
    textColor: "{colors.pencil-gray}"
    rounded: "{rounded.hairline}"
    padding: "0.125rem 0"
    typography: "{typography.label}"
---

# Design System: mahjong-engine

## 1. Overview

**Creative North Star: "The Reading Room"**

This is the visual language of a study tool, not an app. Imagine a quiet table with a single lamp: the NMJL 2026 card spread open, a notebook beside it, and the player working through a position they want to understand. The page is the table. Mahjong tiles are the only loud elements; everything else is the table around them — paper-tinted surfaces, hairline rules, restrained type. The accent color is a single bookmark slipped between pages, used sparingly and on purpose: where the engine wants to point, not for decoration.

The system rejects three families explicitly. It rejects **casino chrome** (gambling-table green, gold trim, Vegas typography) — this is study, not play. It rejects **toy-mahjong solitaire aesthetics** (bright primaries, cartoon faces, confetti) — the user already knows the game; we don't talk down to them. And it rejects **the generic SaaS dashboard** (metric cards with up-arrows, gradient KPIs, hero-stat grids) — there are no KPIs here, only positions to read. When in doubt, the question is "what would a paper card-and-notebook setup do?" The answer is usually less.

**Key Characteristics:**

- **Paper-tinted neutrals.** Every surface is tinted toward warm yellow (hue 80) at very low chroma (0.004–0.010), giving an off-white "paper" feel without anyone consciously noticing.
- **Hairlines do structural work.** Borders are 1px. Anything thicker is state, not decoration.
- **Tile glyphs as typography (default).** Tiles are rendered as flat 2D faces. The default suit-mark is the canonical CJK character (萬 / 索 / 筒) — the same vocabulary the user sees at the table — and the mark is user-selectable between CJK glyphs (default) and Western American labels (crak / bam / dot); both are flat and tinted by suit. A third **icon** style swaps the whole face for traditional tile artwork (see "Tile" below) — the sanctioned exception to the no-pictorial rule.
- **The accent is a bookmark.** A single desaturated indigo carries every engine signal — suggested discard, pinned target, focus ring. Used on ≤10% of any screen.
- **Asymmetric rhythm.** The hand row breathes; peripheral regions (discards, opponents) cluster tighter.

## 2. Colors

The palette is built in OKLCH so that lightness reads perceptually uniform across hues — the warm-red of cracks and the green of bamboo feel the same visual *weight* even though they sit on different parts of the color wheel. All neutrals share hue 80 (a warm yellow) at chroma 0.004–0.010; this is what gives the page its paper feel. The frontmatter carries OKLCH directly (the project has an OKLCH-only doctrine — accept the Stitch linter warning rather than splitting the source of truth).

### Primary

- **Bookmark Indigo** (`oklch(0.46 0.11 252)`): the engine's voice. Suggested-discard ring, pinned-target accent segment, focus outlines. Never decorative.
- **Marginal Note Indigo** (`oklch(0.32 0.10 252)`): primary button hover; the bookmark pressed in deeper.
- **Tinted Vellum Indigo** (`oklch(0.93 0.04 252)`): the soft wash behind focused tile slots and pinned exposure groups. Always paired with Bookmark Indigo as its dampened companion.

### Secondary

- **Marginalia Green** (`oklch(0.55 0.07 145)`): rings on tiles the top target still needs. Restrained — not a primary signal, a secondary annotation in the margin.
- **Tinted Vellum Green** (`oklch(0.94 0.03 145)`): background for the engine bar when the hand is winning.

### Tertiary (tile-domain colors — never used on chrome)

These colors live *inside* tile glyphs only. They are the canonical suit/honor identities and must never bleed into UI chrome.

- **Crack Red** (`oklch(0.50 0.16 25)`): cracks suit numerals + suit-mark (萬); red dragon character (中).
- **Bamboo Green** (`oklch(0.46 0.13 145)`): bamboo suit numerals + suit-mark (索); green dragon character (發).
- **Dot Indigo** (`oklch(0.38 0.09 245)`): dots suit numerals + suit-mark (筒).
- **Petal Pink** (`oklch(0.55 0.08 30)`): flower tile glyph stroke.
- **Joker Violet** (`oklch(0.30 0.04 305)`): joker "JKR" mono-stamp.

### Neutral

- **Paper White** (`oklch(0.985 0.005 80)`): page background.
- **Bleached Paper** (`oklch(0.995 0.004 80)`): cards, palette, the tile face. Slightly lighter than the page so tiles read as objects laid on the surface.
- **Aged Vellum** (`oklch(0.965 0.006 80)`): the opponent band — peripheral, slightly sunk, deliberately demoted.
- **Ink Black** (`oklch(0.20 0.012 80)`): primary text. Not pure black — tinted to belong to the paper.
- **Pencil Gray** (`oklch(0.44 0.010 80)`): secondary text, chip rest state.
- **Margin Gray** (`oklch(0.62 0.008 80)`): labels, captions, count metadata.
- **Ruled Line** (`oklch(0.88 0.008 80)`): every hairline border in the system.
- **Heavy Rule** (`oklch(0.78 0.010 80)`): hairline on hover, dashed slot border.

### Named Rules

**The One Voice Rule.** Bookmark Indigo is signal, never decoration. It appears in exactly four places: (1) the engine's suggested-discard ring, (2) the pinned target's left-edge segment, (3) keyboard focus outlines, (4) the primary button. If you find yourself reaching for it elsewhere, you're doing decoration — stop and use neutral.

**The Tile-Domain Rule.** Suit colors (Crack Red, Bamboo Green, Dot Indigo) and dragon colors live *only* inside tile glyphs. They never appear in chrome — no green panels, no red labels, no indigo backgrounds. Breaking this collapses the visual hierarchy that makes tiles read as the punctuation of the page.

**The Tinted-Warm Rule.** Every neutral is tinted toward hue 80 at chroma 0.004–0.010. Never `#fff`, never `#000`, never an untinted gray. The paper feel comes from this consistency.

## 3. Typography

**Display / UI Font:** Inter Tight (with Inter, system-ui as fallback). Restrained sans-serif at modest weights (400/500/600); never display weights, never italics for emphasis (italics are reserved for hints and rationale text — the "soft voice" of the page).

**Numeric Font:** Inter Tight with `font-variant-numeric: tabular-nums`. Used for scores, counts, rank numbers — anywhere columns of digits need to line up.

**CJK Font:** PingFang SC and the regional CJK stack. Used exclusively for tile suit-marks (萬 / 索 / 筒) and dragons (中 / 發). The font-family is scoped via the `.cjk` class so the rest of the page stays on Inter Tight regardless of locale.

**Mono Font:** JetBrains Mono with system fallbacks. Used for the joker "JKR" stamp and the position JSON textarea.

**Character:** the pairing is austere on purpose. Inter Tight at small sizes provides clean hierarchy without personality competing with the tiles; the CJK characters and tile glyphs *are* the personality.

### Hierarchy

- **Display** (600, 1.953rem, 1.2 line-height, -0.015em tracking): the engine's winning-hand verdict — used once, only when `isWinningHand` returns true.
- **Headline** (600, 1.25rem, 1.3): engine suggestion text in the sticky bar.
- **Title** (600, 1rem, 1.4): region labels ("Your hand", "Ranked targets", panel headings).
- **Body** (400, 1rem, 1.5): general prose, target descriptions in the ranked list.
- **Label** (600, 0.6875rem, uppercase, 0.1em tracking): every uppercase caption ("RULESET", "PHASE", "NEEDS", "WORKING TOWARD"). Letter-spacing carries the structural cue.
- **Numeric** (500, 0.8125rem, tabular-nums): rank digits, hand counts, completion scores.

Type scale ratio is 1.25 between adjacent steps. Body line length caps at 65–75ch — but body prose is rare in this UI; almost everything is labels, numerals, and tile glyphs.

### Named Rules

**The Italic-Is-Whisper Rule.** Italics are used only for the soft voice of the page: hints ("click a tile to remove · click the dashed slot to keep adding"), empty-state messages ("No exposures yet."), and the engine's prose rationale. Never use italics for emphasis — emphasis goes to weight contrast instead.

**The Numerals-Align Rule.** Anywhere numerals stack (scores in the ranked list, counts beside region labels, the rank column), use `tabular-nums`. The columns are doing work; misaligned digits look like rounding errors.

## 4. Elevation

The system is **flat by default**. There is no ambient shadow vocabulary. Depth is conveyed through three coordinated mechanisms:

1. **Tonal layering.** Three paper tones — Aged Vellum (sunk), Paper White (page), Bleached Paper (raised) — communicate which regions sit forward and which recede. The opponent band is sunk; tiles and panels are raised.
2. **Hairlines.** A 1px Ruled Line border is the default surface boundary. On hover, it shifts to Heavy Rule. The hairline tells you something is a surface; thickness tells you it's responding.
3. **Rings, not shadows.** State elevation (suggested discard, focused slot, pinned target) renders as a colored ring outside the element — `box-shadow: 0 0 0 2px <color>` — never as a drop shadow. The one exception is the suggested-discard tile, which additionally lifts 3px and adds a soft Bookmark Indigo glow at 55% opacity to read as "the engine is pointing here."

### Shadow Vocabulary

- **Suggested-tile glow** (`box-shadow: 0 0 0 2px oklch(0.46 0.11 252), 0 8px 18px -10px oklch(0.46 0.11 252 / 0.55)`): the only "shadow" in the system. Reserved for the engine's suggested discard tile and nothing else.
- **Focused-slot inner ring** (`box-shadow: 0 0 0 2px oklch(0.46 0.11 252 / 0.18)`): on `TileSlot` when it has focus, paired with the solid border swap.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. No drop shadows, no inset shadows, no gradient overlays. If you reach for a shadow, the answer is almost always a tone change or a hairline.

**The Ring-Not-Lift Rule.** State (selected, focused, suggested) renders as a ring outside the element. The element's own face — its background, its border, its content — never changes. This keeps tiles especially readable: a "suggested" tile is still the same tile, just pointed at.

## 5. Components

Components are described by their character and exact treatment. Every component below is in `src/lib/components/`.

### Tile (the signature component)

- **Character:** information, not button. A tile is the typographic unit of the page; it never animates its face, never changes its color, never decorates itself. State is always external.
- **Shape:** rounded rectangle, radius `6px` at `md` / `lg` sizes, `4–5px` at smaller sizes. Aspect ratio approximately 3:4.
- **Sizes:** `xs` (22×30px, palette mini), `sm` (30×40px, discards/opponent exposures), `md` (42×56px, self exposures), `lg` (54×72px, concealed hand).
- **Face composition:**
  - Number tiles (CJK / Western styles): large numeral on top half (colored by suit), small suit-mark on bottom half — CJK glyph (萬 / 索 / 筒, default) or Western label (crak / bam / dot), both inheriting the suit color via `currentColor`.
  - **Icon style** (the third tile style): the whole face becomes a traditional tile illustration — craks as a Chinese numeral over 萬, bamboo as N sticks (1-bamboo is the bird), dots as N circles — plus winds and dragons. These are vendored CC0 riichi faces (`src/lib/assets/tiles/riichi/`, from FluffyStuff) recolored **two-tone** at runtime (`tileGlyph.ts`): the figure → the suit token via `currentColor`, white areas → `--color-bg-raised` so background-white reads as the paper face and foreground-white reads as a paper highlight over the colored figure. The Arabic numeral is dropped; the glyph *is* the rank. Flowers and jokers have no riichi equivalent and keep their flat rendering. Detail is intentionally denser here and reads best at `md`/`lg`.
  - Winds: a single bold letter (N/E/S/W) at -0.04em tracking.
  - Dragons: CJK character (中 / 發) at the suit's color; white dragon as a thin-bordered blank box.
  - Flowers: a 4-petal SVG stroke in Petal Pink, on a tinted-warm background.
  - Joker: "JKR" stamp in JetBrains Mono, Joker Violet, on a tinted-violet background.
- **Background:** Bleached Paper for most; tinted backgrounds for flowers and jokers as a soft identity cue.
- **Border:** 1px Ruled Line at rest; Heavy Rule on hover (clickable variants only).
- **Hover:** background shifts to a barely-brighter Bleached Paper, border darkens to Heavy Rule. Active state: `translateY(0.5px)`.
- **States:**
  - `suggested`: Bookmark Indigo ring + soft glow + 3px lift. Reserved for the engine's discard pick.
  - `needed`: Marginalia Green ring at 1.5px. Used on tiles the top target still needs (appears in the palette and discard pile annotations).
  - `ghost`: opacity 0.32. Used for unavailable / inactive tiles.

### TileSlot (the inline-add affordance)

- **Character:** a dashed footprint that says "a tile could go here." Not a button visually — a placeholder waiting for input.
- **Shape:** identical dimensions to Tile at each size; dashed Heavy Rule border at rest.
- **Focused:** border goes solid Bookmark Indigo, background fills with Tinted Vellum Indigo, inner ring at 18% opacity. The slot becomes the visual target of every palette click.
- **Hover:** border shifts to Bookmark Indigo, background to Tinted Vellum Indigo (lighter than focused).

### Chips (Selectors)

- **Style:** segmented control inside a pill-shaped Aged Vellum track with 2px internal padding. Each chip is `padding: 0.25rem 0.75rem` at `0.8125rem` numeric type.
- **Rest:** transparent background, Pencil Gray text.
- **Hover:** text shifts to Ink Black.
- **Selected:** Bleached Paper background, Ink Black text, hairline shadow at 4% opacity. The pop comes from the tonal layer change, not from color.

### Panels

- **Cards / containers:** Bleached Paper background, 1px Ruled Line border, `10px` radius. Internal padding `1rem` (panel) or `0.75rem × 1.5rem` (sunk panel).
- **Sunk panels** (Opponents' band): Aged Vellum background, no border — it's already demoted by tone. Used to push peripheral regions back.
- **No nesting.** A panel may contain tiles, labels, or rows — never another panel. Nested cards are always wrong.

### Buttons

- **Primary:** Bookmark Indigo background, Paper White text, pill radius (`999px`), `0.5rem × 1rem` padding. Used only for the "apply" action in the JSON editor. Hover swaps to Marginal Note Indigo.
- **Secondary:** Bleached Paper background, Ink Black text, 1px Ruled Line border, same pill shape and padding. Used for "copy" and other neutral actions.
- **Link buttons:** transparent background, Pencil Gray text, label-style typography (uppercase 0.1em tracking). Used for "load sample / position JSON / reset" — they read as marginalia, not actions.

### Region Headers

A signature pattern: a small dot (Margin Gray, 6px circle) + region title + a numeric count. The dot is the structural cue. When the region is focused (the user clicked into it via its label), the dot turns Bookmark Indigo and the panel grows a 1px Tinted Vellum Indigo border. The region itself doesn't tint, only the marker.

### Ranked-Target Rows (signature: reasoning panel)

- **Shape:** row, not card. No nested container. Each row separated only by a 1px Ruled Line bottom border (except the last).
- **Composition:** rank numeral · target description (truncated with ellipsis if needed) · hairline completion bar + numeric score · row of mini "needed" tiles.
- **Hairline completion bar:** 1px Ruled Line track, 3px filled segment in Ink Black (or Bookmark Indigo when this is the top/pinned target). Never a thick progress bar — the hairline is the point.
- **Pinned state:** a 3px Bookmark Indigo segment in the top-left corner (per the absolute ban on side-stripes, this is a *corner* mark, not a stripe). Rank numeral, score, and bar fill all shift to Bookmark Indigo / Marginal Note Indigo.

### Engine Suggestion Bar

- **Style:** Bleached Paper background, 1px Ruled Line border, panel radius, sticky to `bottom: 1rem`. Two-column grid: action line on left, target readout on right.
- **Winning state:** background swaps to Tinted Vellum Green, border to Marginalia Green. The bar tells you the hand is complete by changing tone, not by adding decoration.

## 6. Do's and Don'ts

### Do:

- **Do** keep every neutral tinted toward hue 80 at chroma 0.004–0.010. The paper feel depends on consistency.
- **Do** use Bookmark Indigo only as engine signal: suggested discard, pinned target, focus ring, primary button. ≤10% of any screen.
- **Do** render tiles as flat 2D faces by default. The CJK suit-marks (萬 / 索 / 筒) are the default and the cultural artifact; that's why they're loud. Western labels are an alternate flat, suit-tinted mark. The traditional-artwork **icon** style is the deliberate exception: real tile faces, but recolored two-tone into the suit palette so they still belong to the page rather than importing a foreign full-color look.
- **Do** let hairlines (1px Ruled Line) do structural work. Thicker means state, never decoration.
- **Do** render state (selected, focused, suggested) as a ring outside the element. The element's face never changes.
- **Do** layer with tone (Aged Vellum / Paper White / Bleached Paper) before reaching for any shadow.
- **Do** use `tabular-nums` anywhere numerals stack. Scores, counts, ranks must align column-wise.
- **Do** reserve italics for the soft voice — hints, empty states, the engine's prose rationale. Never italics for emphasis.

### Don't:

- **Don't** use `#fff` or `#000`. Every neutral is tinted-warm OKLCH.
- **Don't** use suit colors (Crack Red, Bamboo Green, Dot Indigo) on chrome. They live inside tile glyphs only.
- **Don't** add drop shadows for ambient elevation. Use tone change or hairline. The only "shadow" in the system is the suggested-tile glow.
- **Don't** wrap regions in cards. Most things don't need a container; a region label and some space is usually enough.
- **Don't** nest panels. A panel inside a panel is always wrong.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent. Pinned targets get a 3px *corner segment*, not a side stripe.
- **Don't** use gradient text (`background-clip: text` with a gradient background). Emphasis through weight or size, never gradients.
- **Don't** reach for SaaS-dashboard metric cards (big number + label + up-arrow delta). Completion scores are hairline bars, not KPI tiles.
- **Don't** style this like a casino app: no felt-green tables, no gold trim, no Vegas typography. This is a Reading Room, not a gambling table.
- **Don't** style this like a toy mahjong solitaire app: no bright primaries, no confetti on win, no full-color cartoon tile faces. The user is studying, not playing. (The optional **icon** tile style is the one sanctioned exception — traditional tile artwork, but recolored two-tone into the suit palette, never the original loud multi-color art.)
- **Don't** style this like Stockfish chess analyzers: the framing is inspirational, the aesthetic isn't. No arrow overlays, no board-geometry visualizations. Mahjong has no spatial structure to lean on.
- **Don't** decorate with Asian-pastiche flourishes (bamboo backgrounds, dragon frames, calligraphic display fonts). The tiles already are the cultural artifact; surrounding them in cosplay cheapens them. (The icon-style tile artwork lives *as* the tile face, recolored to the suit palette — it is the tile, not chrome decoration around it.)
