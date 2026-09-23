# EAGLES GON EAT

A single-page, scroll-driven cartoon story about a scruffy young eagle who can't
catch a thing on his own — until he finds the river where thousands of eagles
gather and everybody eats. Vanilla HTML/CSS/JS, no build step.

> **Status: Stage 1 of 7 — design system, for review.**
> The full README (deploy, placeholders, adding a milestone) lands with stage 7.

## Preview

Open `design-system.html` straight from disk — no server needed. Or serve the
folder:

```sh
npx serve .            # or: python3 -m http.server 8000
```

## What's here so far

| Path | What it is |
| --- | --- |
| `design-system.html` | Colour tokens, type scale, button states, the full model sheet |
| `css/style.css` | Every token and shared component — the site will use this file |
| `js/eagle.js` | The character rig: every pose built from the same named SVG parts |
| `js/main.js` | Shared UI behaviour (headline outlines, squash-and-stretch buttons) |
| `assets/characters/*.svg` | The 9 poses + the big sibling, exported from `js/eagle.js` |
| `assets/characters/plumage/` | Head icons for plumage stages 0–6 (milestone timeline) |
| `tools/export-characters.js` | Re-exports the SVG files after you edit the art |

The SVG files are generated from `js/eagle.js`, so the static art and the live rig
never drift. After editing the art, run:

```sh
node tools/export-characters.js
```

## Placeholders used so far

`{{TICKER}}`, `{{CONTRACT_ADDRESS}}` — the complete list ships with stage 7.
