# EAGLES GON EAT

A single-page, scroll-driven cartoon story about a scruffy young eagle who can't
catch a thing on his own — until he finds the river where thousands of eagles
gather and everybody eats. Vanilla HTML/CSS/JS, no build step.

> **Status: Stage 5 of 7 — the whole story (scenes 1–7) and the milestone timeline are live, for review.**
> The full README (deploy, placeholders, adding a milestone) lands with stage 7.

## Preview

Open `index.html` (the story) or `design-system.html` straight from disk — no
server needed. Or serve the folder:

```sh
npx serve .            # or: python3 -m http.server 8000
```

## What's here so far

| Path | What it is |
| --- | --- |
| `index.html` | The site: the scroll-driven story, all seven scenes |
| `design-system.html` | Colour tokens, type scale, button states, the full model sheet |
| `css/style.css` | Every token and shared component — the site will use this file |
| `js/eagle.js` | The character: every pose built from the same named SVG parts, plus the live rig |
| `js/main.js` | Shared UI: headline outlines, elastic buttons, copy contract + toast, smooth scroll |
| `js/scenes.js` | The story: one pinned stage, one scroll-scrubbed timeline |
| `js/milestones.js` | **The milestones — edit this one file.** Data + the timeline component |
| `assets/scenes/`, `assets/sprites/` | Scene layers, flock/crowd sprites, salmon + feather confetti, from `tools/export-scenes.js` |
| `assets/characters/*.svg` | The 9 poses + the big sibling, exported from `js/eagle.js` |
| `assets/characters/plumage/` | Head icons for plumage stages 0–6 (milestone timeline) |
| `tools/export-characters.js` | Re-exports the SVG files after you edit the art |

The SVG files are generated from `js/eagle.js`, so the static art and the live rig
never drift. After editing the art, run:

```sh
node tools/export-characters.js   # characters
node tools/export-scenes.js       # scene layers + flock sprites
```

## How the story works

One pinned stage holds every scene; one GSAP timeline is scrubbed by scroll
(Lenis smooth-scroll on top). Timeline units are screens — 1 unit is one viewport
of scrolling — and each scene's block in `js/scenes.js` says where it starts.
Scenes hand over with a camera move and a cross-fade, never a hard cut. Eagles
and flocks are mounted just before their scene and paused when off stage.

The Scene 5 counter is an in-story number (eagles on the river) — change it with
`data-count-to` on `.counter__n` in `index.html`. It is never a price.

With `prefers-reduced-motion` (or if GSAP fails to load) the same markup renders
as still frames that simply fade in. If Lenis fails to load, native scrolling
takes over and everything still works.

## The live rig

```js
const rig = EagleRig.mount(element, 'scruffy', { canonicalIds: true, plumage: 0 });
rig.setPose('flying-determined'); // squash, swap, spring back
rig.setPlumage(3);                // 0–6: one white patch per milestone
rig.hop();                        // EagleRig.hopAll() hops every eagle on screen
```

Always on: random blink every 3–5s, 2s breathing loop, head tilt and pupils toward
the cursor (idle wander on touch), feathers that lag and overshoot. One shared
animation loop runs only while a rig is on screen; under `prefers-reduced-motion`
nothing moves. Only one rig per page should use `canonicalIds` (`#eagle-body`, …);
every rig carries `data-part` and `data-pivot` on each group.

## Milestones

Edit the `MILESTONES` array at the top of `js/milestones.js`. Each entry is
`{ id, label, caption, timestamp, state: 'locked' | 'unlocked', plumageStage: 1–6 }`.
Flip `state` to `'unlocked'` and the timeline in Scene 6 flies one node further,
his head turns one stage whiter and one more eagle lands on the river. The same
component can be mounted anywhere: `EGE.Milestones.mount(element)`.

## Placeholders used so far

`{{TICKER}}`, `{{CONTRACT_ADDRESS}}`, `{{MILESTONE_1_LABEL}}` … `{{MILESTONE_6_LABEL}}`,
`{{MILESTONE_1_DATE}}` … `{{MILESTONE_6_DATE}}` — the complete list ships with stage 7.
