# Riichi tile faces — third-party asset provenance

The `*.svg` files in this directory are the **Regular** tile faces from:

- **Source:** https://github.com/FluffyStuff/riichi-mahjong-tiles
- **License:** CC0 1.0 (public domain) — https://creativecommons.org/publicdomain/zero/1.0/
- **Retrieved:** 2026-05-27

They are vendored unmodified. At runtime, `src/lib/components/tileGlyph.ts`
recolors them two-tone (figure → `currentColor`, white → `--color-bg-raised`) so
they render as suit-tinted faces inside the flat "Reading Room" tile box for the
`icon` tile style. CC0 imposes no attribution requirement; this notice is kept for
provenance only.

Files used: number suits `Man1-9` (crack), `Sou1-9` (bamboo), `Pin1-9` (dot);
winds `Ton`/`Nan`/`Shaa`/`Pei` (E/S/W/N); dragons `Chun`/`Hatsu`/`Haku`
(red/green/white).
