# EAGLES GON EAT

A single-page, scroll-driven cartoon story about a scruffy young eagle who
struggles alone, then flies to a river where thousands of eagles gather and
everybody eats. Seven scrubbed scenes, a milestone timeline, and the sections a
meme coin site needs — every visual hand-authored SVG.

Vanilla HTML / CSS / JS. No build step, no framework, no backend.

---

## Preview it locally

Open `index.html` straight from disk — it works without a server. For the
closest thing to production, serve the folder:

```sh
npx serve .              # or: python3 -m http.server 8000
```

- `index.html` — the site
- `design-system.html` — colours, type, buttons, the full character model sheet,
  the live rig and the milestone timeline component (not linked from the site;
  it is marked `noindex`)

## Deploy

**Netlify:** drag the whole folder onto <https://app.netlify.com/drop>. That's it.
Any static host works the same way (Vercel, Cloudflare Pages, GitHub Pages, S3).

The `tools/` folder is only used to regenerate art; it's harmless to deploy.

**Before you deploy, replace every placeholder** (next section). GSAP,
ScrollTrigger and Lenis load from cdnjs; if Lenis ever fails to load, the site
falls back to native scrolling and every animation still works.

---

## Placeholders

Every value you need to fill in is written `{{LIKE_THIS}}`. On the page, an
unreplaced placeholder shows in a dashed box so nothing ships by accident; once
you replace it, the dashed styling disappears on its own.

| Placeholder | What goes there | Where |
| --- | --- | --- |
| `{{TICKER}}` | The ticker, without the `$` (e.g. `EAGLE`) | `index.html` (title, intro badge, how-to-buy, FAQ, disclaimer), `design-system.html` |
| `{{CONTRACT_ADDRESS}}` | The token contract address | `index.html` (intro, how-to-buy step 3, footer — the text **and** each `data-contract="…"`), `design-system.html` |
| `{{CHAIN_NAME}}` | The network the token lives on, in plain words | `index.html` — how-to-buy steps 1–2 |
| `{{DEX_URL}}` | Link to the trading pair on the DEX | `index.html` — how-to-buy step 4, footer |
| `{{X_URL}}` | Official X account | `index.html` — Post Your Flight button, footer |
| `{{TELEGRAM_URL}}` | Official Telegram | `index.html` — footer |
| `{{SITE_URL}}` | The live site URL, no trailing slash (e.g. `https://example.com`) | `index.html` — `og:url` and `og:image` in `<head>` |
| `{{LAUNCH_DATE}}` | Launch date, written for humans | `index.html` — The Flock |
| `{{TOTAL_SUPPLY}}` | Total supply | `index.html` — The Flock |
| `{{LIQUIDITY_STATUS}}` | `locked` or `burned` (and until when, if locked) | `index.html` — The Flock |
| `{{LIQUIDITY_PROOF_URL}}` | Link to the lock/burn proof | `index.html` — The Flock |
| `{{MILESTONE_1_LABEL}}` … `{{MILESTONE_6_LABEL}}` | Any number for that milestone — a story number, never a price or return | `js/milestones.js` |
| `{{MILESTONE_1_DATE}}` … `{{MILESTONE_6_DATE}}` | The date each milestone was unlocked | `js/milestones.js` |

Replace one everywhere from the project folder (on macOS use `sed -i ''`):

```sh
grep -rl '{{TICKER}}' --include='*.html' --include='*.js' . | xargs sed -i 's/{{TICKER}}/EAGLE/g'
```

Then check nothing is left:

```sh
grep -rn '{{' --include='*.html' --include='*.js' .
```

(The only hit left should be the `{{MILESTONE_N_LABEL}}` example inside the
comment at the top of `js/milestones.js`.)

The Scene 5 counter ("eagles on the river") is an in-story number, set with
`data-count-to="3742"` on `.counter__n` in `index.html`. It is never a price.

---

## Add or unlock a milestone

Everything lives in **one file: `js/milestones.js`**, in the `MILESTONES` array
at the top:

```js
{
  id: 'first-branch',                 // unique, lowercase-with-dashes
  label: 'The first branch',          // the story beat, shown as the title
  caption: 'Somewhere to sit that isn’t mud. {{MILESTONE_1_LABEL}}',
  timestamp: '{{MILESTONE_1_DATE}}',  // shown once unlocked
  state: 'unlocked',                  // 'locked' | 'unlocked'
  plumageStage: 1,                    // 1–6: how white his head is here
},
```

- **To unlock one:** change its `state` to `'unlocked'` and fill in its date.
  In Scene 6 the flight path now reaches it, his head turns one stage whiter,
  and one more eagle lands on the river.
- **To add one:** add an entry to the array. The timeline re-spaces itself;
  keep `plumageStage` climbing from 1 to 6 (6 = the full white head).
- Keep them story beats — never prices, targets or returns.

The component is reusable anywhere with `EGE.Milestones.mount(element)`. On its
own it fills the path as you scroll (see the design system for an example).

---

## How it's built

| Path | What it is |
| --- | --- |
| `index.html` | The site: seven-scene story, How to Buy, The Flock, Post Your Flight, FAQ, footer |
| `design-system.html` | Tokens, type, buttons, model sheet, live rig, timeline component |
| `css/style.css` | Every design token and component; shared by the site and the design system |
| `js/eagle.js` | The mascot: every pose built from the same named SVG parts, plus the live rig |
| `js/main.js` | Shared UI: headline outlines, elastic buttons, copy contract, smooth scroll, reveals, cursor feathers, sound, the “EAT” egg |
| `js/scenes.js` | The story: one pinned stage, one scroll-scrubbed GSAP timeline |
| `js/milestones.js` | **Milestone data (edit this)** + the timeline component |
| `assets/characters/` | The 9 poses, the big sibling and plumage heads 0–6, exported from `js/eagle.js` |
| `assets/scenes/`, `assets/sprites/` | Scene layers, crowd/flock sprites, salmon, feathers, how-to-buy art |
| `assets/og-card.png` | 1200×630 share image, rendered from the site's own art |
| `tools/` | Node scripts that regenerate the SVG art (not needed to run the site) |

**The story.** One pinned stage holds all seven scenes; one GSAP timeline is
scrubbed by scroll, with Lenis smooth-scroll on top. Timeline units are screens
(1 unit = one viewport of scrolling), and each scene's block in `js/scenes.js`
says where it starts. Scenes hand over by colour and camera — a cross-fade plus a
camera move — never a hard cut. Each scene has three depth layers. Eagles,
flocks and crowds are mounted just before their scene and paused when it's off
stage.

**The mascot.** Every pose is assembled from the same layered groups:
`#eagle-body`, `#eagle-head`, `#eagle-headfeathers` (six white stages),
`#eagle-eyes`, `#eagle-pupils`, `#eagle-beak`, `#eagle-wing-l`, `#eagle-wing-r`,
`#eagle-talons`, `#eagle-tail`, `#eagle-signature-feather`. Every group carries
`data-part` and its hinge in `data-pivot`; one instance per page (Scene 6 on the
site) carries the canonical ids. Always on: a random 3–5s blink, a 2s breathing
loop, head tilt and pupils toward the cursor, feathers that lag and overshoot.

```js
const rig = EagleRig.mount(element, 'scruffy', { plumage: 0 });
rig.setPose('flying-determined'); // squash, swap, spring back
rig.setPlumage(3);                // 0–6
rig.hop();                        // EagleRig.hopAll() hops everyone on screen
```

**Editing the art.** The SVG files are generated from code, so the static files
and the live rig never drift. After editing the art:

```sh
node tools/export-characters.js   # characters, plumage heads, favicon
node tools/export-scenes.js       # scene layers, sprites, how-to-buy art
```

**Feel.**
- Cursor: four tiny feathers trail the pointer (mouse and trackpad only).
- Buttons: scale on hover, squash on press, elastic spring on release.
- COPY CONTRACT: feather burst and “COPIED. WE EATING.”
- Sound: **muted by default**, one corner toggle, never autoplays. It is
  synthesised live with Web Audio — there are no audio files: wind in scenes 1–3,
  the river and eagle calls in 4–5.
- Easter egg: type **EAT** anywhere and every eagle on screen hops.

**Accessibility and performance.**
- `prefers-reduced-motion`: no scrubbing, no pinning, no rig motion, no cursor
  trail — every scene is a still frame that simply fades in.
- Mobile-first, checked down to 320px: simpler parallax, fewer birds, a
  vertical timeline.
- Animation touches `transform` and `opacity` only, on one shared loop that
  runs only for eagles on screen.
- Headlines keep a single plain-text copy for screen readers; the FAQ works
  without JavaScript.

---

## Guardrails (kept everywhere on the site)

- Nothing states or implies that buying makes anyone money: no prices, no
  returns, no predictions. The eagle eats; the visitor is promised nothing.
- The footer disclaimer is always visible, word for word:
  *“$TICKER is a meme coin with no utility and no expectation of profit. Nothing
  on this site is financial advice. You can lose everything you put in.”*
- Original cartoon art only: no photos, real people, brands, logos, flags,
  crests or military styling. The river is generic and unnamed.
