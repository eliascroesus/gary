#!/usr/bin/env node
/*
 * EAGLES GON EAT — brand kit renderer.
 *
 *   node brand/kit.js                 # renders every image into brand/out/
 *   node brand/kit.js --ticker EAGLE  # also prints $EAGLE where a design has a ticker slot
 *   node brand/kit.js --only logo     # one set: x-header | promo | telegram | dexscreener | fomo | logo
 *
 * Needs Playwright (npm i -D playwright && npx playwright install chromium).
 * Every image is built from the site's own art in /assets and the two fonts in
 * brand/fonts, so the kit and the site always match. Rendered at 2× for crisp
 * edges; each file name says its intended size.
 *
 * Words on these images follow the site's rules: the eagles eat; nobody is
 * promised anything. No prices, no targets, no returns.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const EagleRig = require('../js/eagle.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const argVal = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const TICKER = argVal('--ticker');
const ONLY = argVal('--only');

/* ------------------------------------------------------------------ tokens */
const K = {
  ink: '#17110D', bone: '#FFFDF6', cream: '#FFF6E4', gold: '#FFC83A', gold200: '#FFE28A', amber: '#F2991E',
  teal: '#16968E', teal700: '#0D5C5A', teal300: '#5CC8BA', salmon: '#FF7F6E', salmon300: '#FFB2A4',
  deep900: '#0A1734', deep700: '#14295C', deep500: '#23448F', storm900: '#131A25', fog: '#D9DFE4', brown: '#7B4A2A',
};
const SKY = {
  storm: 'linear-gradient(180deg, #131A25 0%, #2E3A4B 55%, #4A5A6E 100%)',
  fog: 'linear-gradient(180deg, #4A5A6E 0%, #7D8A9A 55%, #B3BCC5 100%)',
  dusk: 'linear-gradient(180deg, #2E3A4B 0%, #6C7282 55%, #B59A7C 100%)',
  sunset: 'linear-gradient(180deg, #E98A1A 0%, #FFB547 50%, #FFE28A 100%)',
  feast: 'linear-gradient(180deg, #FF7F6E 0%, #FFB547 52%, #FFE28A 100%)',
  night: 'linear-gradient(180deg, #0A1734 0%, #23448F 58%, #FBE2B6 100%)',
  dawn: 'linear-gradient(180deg, #0A1734 0%, #14295C 42%, #FBE2B6 84%, #FFF6E4 100%)',
  midnight: 'linear-gradient(180deg, #050B1C 0%, #0A1734 55%, #14295C 100%)',
};

/* ------------------------------------------------------------------ helpers */
const A = (p) => '../assets/' + p; // pages are written into brand/, assets live one level up
const px = (n) => (typeof n === 'number' ? n + 'px' : n);
const box = (o) => ['left', 'top', 'right', 'bottom', 'width', 'height'].filter((k) => o[k] != null).map((k) => k + ':' + px(o[k])).join(';');

function img(src, o) {
  o = o || {};
  const tf = [o.flip ? 'scaleX(-1)' : '', o.rot ? 'rotate(' + o.rot + 'deg)' : ''].join(' ');
  return '<img src="' + src + '" style="position:absolute;' + box(o) + ';' + (tf.trim() ? 'transform:' + tf + ';' : '') + (o.op != null ? 'opacity:' + o.op + ';' : '') + (o.z != null ? 'z-index:' + o.z + ';' : '') + (o.css || '') + '">';
}
const char = (pose, o) => img(A('characters/' + pose + '.svg'), o);
const sprite = (name, o) => img(A('sprites/' + name + '.svg'), o);
const scene = (name, o) => img(A('scenes/' + name + '.svg'), Object.assign({ css: 'object-fit:cover;object-position:50% 100%;' }, o));
// Place a 1600×1000 scene so its horizon (a fraction of the art's height) lands on
// canvas y = horizon, covering the full width and everything below.
function art(name, W, H, frac, horizon, o) {
  let h = Math.max(W / 1.6, (H - horizon) / (1 - frac) + 4);
  const w = h * 1.6;
  return img(A('scenes/' + name + '.svg'), Object.assign({ left: (W - w) / 2, top: horizon - frac * h, width: w, height: h }, o || {}));
}
const layer = (css) => '<div style="position:absolute;inset:0;' + css + '"></div>';

// A side-view flyer (body + wing).
function flyer(x, y, w, o) {
  o = o || {};
  const k = o.white ? 'white' : 'brown';
  const tf = (o.flip ? 'scaleX(-1) ' : '') + (o.rot ? 'rotate(' + o.rot + 'deg)' : '');
  const wing = o.down ? 'transform:scaleY(-0.55);transform-origin:44% 56%;' : '';
  return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;aspect-ratio:160/110;transform:' + (tf || 'none') + ';' + (o.op != null ? 'opacity:' + o.op : '') + '">' +
    '<img src="' + A('sprites/fly-' + k + '-body.svg') + '" style="position:absolute;inset:0;width:100%">' +
    '<img src="' + A('sprites/fly-' + k + '-wing.svg') + '" style="position:absolute;inset:0;width:100%;' + wing + '"></div>';
}

// Top-down eagle (drone shot), body + wings.
function topdown(x, y, w, o) {
  o = o || {};
  const k = o.white ? 'white' : 'brown';
  return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;aspect-ratio:424/280;transform:rotate(' + (o.rot || 0) + 'deg);' + (o.op != null ? 'opacity:' + o.op : '') + '">' +
    '<img src="' + A('sprites/topdown-wings-' + k + '.svg') + '" style="position:absolute;inset:0;width:100%;' + (o.flap ? 'transform:scale(0.72,1.05);transform-origin:50% 37%;' : '') + '">' +
    '<img src="' + A('sprites/topdown-body-' + k + '.svg') + '" style="position:absolute;inset:0;width:100%"></div>';
}

// A perched crowd eagle standing on y (its feet on the line).
const perch = (cx, y, w, o) => sprite('crowd-' + ((o && o.white) ? 'white' : 'brown') + ((o && o.eat) ? '-eat' : ''), { left: cx - w / 2, top: y - w * (136 / 130), width: w, flip: o && o.flip, rot: o && o.rot });

// A head (logo mark) as inline SVG, straight from the rig.
let headN = 0;
function head(stage, o) {
  o = o || {};
  const svg = EagleRig.renderHead(stage, { uid: 'bh' + ++headN, expr: o.expr, beak: o.beak, title: '' });
  return '<div style="position:absolute;' + box(o) + ';' + (o.flip ? 'transform:scaleX(-1)' + (o.rot ? ' rotate(' + o.rot + 'deg)' : '') + ';' : o.rot ? 'transform:rotate(' + o.rot + 'deg);' : '') + (o.op != null ? 'opacity:' + o.op + ';' : '') + (o.css || '') + '">' + svg.replace('<svg ', '<svg style="width:100%;height:auto;display:block;overflow:visible" ') + '</div>';
}

// Branch: ink under-stroke + bark over-stroke, with a highlight.
function branch(d, w) {
  w = w || 26;
  return '<svg style="position:absolute;inset:0;width:100%;height:100%;overflow:visible" viewBox="0 0 {W} {H}">' +
    '<path d="' + d + '" fill="none" stroke="' + K.ink + '" stroke-width="' + (w + 13) + '" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="none" stroke="#4A3423" stroke-width="' + w + '" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="none" stroke="#6B4B33" stroke-width="' + Math.round(w / 5) + '" stroke-linecap="round" transform="translate(0 -' + Math.round(w / 4) + ')"/></svg>';
}

// Headline in the site's style: bone fill, thick ink outline, drop shadow, jaunty words.
function hl(text, o) {
  o = o || {};
  const size = o.size || 80;
  const lines = text.split('\n').map((line) => line.split(' ').map((w, i) => '<span class="w w' + (i % 3) + '" data-text="' + w + '">' + w + '</span>').join(' ')).join('<br>');
  return '<div class="hl" style="position:absolute;' + box(o) + ';font-size:' + size + 'px;--fill:' + (o.fill || K.bone) + ';text-align:' + (o.align || 'left') + ';' + (o.rot ? 'transform:rotate(' + o.rot + 'deg);' : '') + (o.lh ? 'line-height:' + o.lh + ';' : '') + (o.css || '') + '">' + lines + '</div>';
}

// A chunky pill/badge with the display font.
function pill(text, o) {
  o = o || {};
  return '<div class="pill" style="position:absolute;' + box(o) + ';font-size:' + (o.size || 28) + 'px;background:' + (o.bg || K.ink) + ';color:' + (o.fg || K.gold) + ';' + (o.rot != null ? 'transform:rotate(' + o.rot + 'deg);' : '') + (o.shadow ? 'box-shadow:0 ' + Math.round((o.size || 28) * 0.22) + 'px 0 ' + o.shadow + ';' : '') + (o.css || '') + '">' + text + '</div>';
}

const tickerBadge = (o) => (TICKER ? pill('$' + TICKER, Object.assign({ bg: K.gold, fg: K.ink, shadow: K.ink }, o)) : '');

// Sunburst: turning rays + disc.
function sunrise(cx, cy, r, o) {
  o = o || {};
  const rays = img(A('scenes/s7-rays.svg'), { left: cx - r * 4, top: cy - r * 4, width: r * 8, height: r * 8, op: o.rayOp != null ? o.rayOp : 1, rot: o.rot || 0 });
  const sun = o.noSun ? '' : img(A('scenes/s7-sun.svg'), { left: cx - r, top: cy - r, width: r * 2, height: r * 2 });
  return rays + sun;
}

// Rain overlay (thin streak tile).
const rain = (op) => layer('background:url(' + A('scenes/s1-rain.svg') + ') 0 0/200px 200px repeat;opacity:' + (op || 0.3));

// Scatter feather confetti.
function confetti(W, H, n, seed, o) {
  o = o || {};
  let s = seed || 7, out = '';
  const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cols = ['white', 'brown', 'gold'];
  for (let i = 0; i < n; i++) {
    const w = (o.min || 22) + R() * (o.span || 22);
    out += sprite('feather-' + cols[i % 3], { left: R() * W, top: R() * H * (o.band || 1), width: w, rot: R() * 360, op: o.op });
  }
  return out;
}

// Seeded RNG for layouts.
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

const CSS = `
@font-face { font-family: 'Luckiest Guy'; src: url('fonts/luckiest-guy.woff2') format('woff2'); font-weight: 400; }
@font-face { font-family: 'Inter'; src: url('fonts/inter.woff2') format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; }
html, body { margin: 0; background: transparent; }
.stage { position: relative; overflow: hidden; font-family: 'Inter', sans-serif; }
.stage img { max-width: none; display: block; }
.hl { font-family: 'Luckiest Guy', sans-serif; text-transform: uppercase; line-height: 0.92; letter-spacing: 0.02em; word-spacing: 0.12em; color: var(--fill); margin: 0; z-index: 5; }
.hl .w { position: relative; z-index: 0; display: inline-block; white-space: nowrap; }
.hl .w::before { content: attr(data-text); position: absolute; inset: 0; z-index: -1; color: ${K.ink}; -webkit-text-stroke: 0.19em ${K.ink}; text-shadow: 0.06em 0.08em 0 ${K.ink}; }
.hl .w0 { transform: rotate(-1.6deg); } .hl .w1 { transform: rotate(1.1deg) translateY(0.03em); } .hl .w2 { transform: rotate(-0.6deg); }
.pill { font-family: 'Luckiest Guy', sans-serif; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; padding: 0.5em 0.9em 0.36em; border: 0.16em solid ${K.ink}; border-radius: 999px; white-space: nowrap; z-index: 6; }
.tag { position: absolute; font-family: 'Inter', sans-serif; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; z-index: 6; }
.panel { position: absolute; overflow: hidden; border: 7px solid ${K.ink}; border-radius: 26px 34px 22px 36px / 32px 22px 36px 26px; }
`;

/* ================================================================== DESIGNS
   Each design: { set, id, name, w, h, html(W, H) }. Sizes are the upload size;
   the renderer doubles them for crispness.                                  */
const D = [];
const add = (set, w, h, id, name, html, extra) => D.push(Object.assign({ set, w, h, id, name, html }, extra || {}));

/* ---------- reusable scenes, sized to any canvas ---------- */

// King: the rock at sunrise with the crowd below. hx = where he stands.
function kingScene(W, H, o) {
  o = o || {};
  const hx = o.hx != null ? o.hx : W * 0.7;
  const rockW = o.rockW || H * 0.95;
  const rockTop = o.rockTop != null ? o.rockTop : H * 0.58;
  const heroW = rockW * 0.46;
  let s = layer('background:' + SKY.dawn);
  s += sunrise(hx + heroW * 0.08, (o.horizon != null ? o.horizon : rockTop) - (o.sunR || H * 0.24) * 0.35, o.sunR || H * 0.24, { rayOp: 0.95 });
  s += art('s7-panorama', W, H, 0.47, o.horizon != null ? o.horizon : rockTop - rockW * 0.02);
  // rock: nest ledge sits at 34% of the rock art's height
  s += img(A('scenes/s7-rock.svg'), { left: hx - rockW * 0.38, top: rockTop - rockW * 1.25 * 0.33, width: rockW });
  s += img(A('scenes/s1-nest-back.svg'), { left: hx - rockW * 0.36, top: rockTop - rockW * 0.2, width: rockW * 0.72 });
  s += char('adult-white-head', { left: hx - heroW * 0.35, top: rockTop - heroW * 1.12, width: heroW });
  s += perch(hx - rockW * 0.25, rockTop + rockW * 0.02, rockW * 0.13, {}) + perch(hx - rockW * 0.12, rockTop + rockW * 0.03, rockW * 0.12, { flip: false });
  s += img(A('scenes/s1-nest-front.svg'), { left: hx - rockW * 0.37, top: rockTop - rockW * 0.12, width: rockW * 0.74 });
  if (o.flyers !== false) {
    const R = rng(o.seed || 3);
    for (let i = 0; i < (o.nFly || 5); i++) s += flyer(R() * W * 0.95, H * (0.08 + R() * 0.35), H * (0.06 + R() * 0.05), { white: R() < 0.5, flip: R() < 0.3, down: R() < 0.5, op: 0.95 });
  }
  return s;
}

// Branch: one long branch full of eagles; hero in the middle.
function branchScene(W, H, o) {
  o = o || {};
  const y = o.y || H * 0.8;
  const bw = o.bird || H * 0.24;
  let s = layer('background:' + SKY.sunset);
  if (o.sun === true) s += '<div style="position:absolute;left:' + (o.sunX || W * 0.82) + 'px;top:' + ((o.horizon || y - H * 0.12) - H * 0.42) + 'px;width:' + H * 0.62 + 'px;height:' + H * 0.62 + 'px;border-radius:50%;background:#FBE08A;border:6px solid ' + K.ink + ';margin-left:-' + H * 0.31 + 'px"></div>';
  s += art('s4-back', W, H, 0.56, o.horizon || y - H * 0.12);
  const d = 'M -40 ' + (y + 16) + ' C ' + W * 0.3 + ' ' + (y - 12) + ' ' + W * 0.6 + ' ' + (y + 22) + ' ' + (W + 40) + ' ' + (y + 2);
  s += branch(d, o.thick || Math.max(18, H * 0.05)).replace('{W}', W).replace('{H}', H);
  const R = rng(o.seed || 11);
  const n = o.n || Math.floor(W / (bw * 0.78));
  const mid = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * (W / n) + (R() - 0.5) * bw * 0.1;
    const yy = y + 4 + Math.sin((cx / W) * Math.PI * 2) * 6;
    if (i === mid && o.hero !== false) continue;
    s += perch(cx, yy, bw * (0.92 + R() * 0.14), { white: R() < 0.42, flip: cx > W / 2, eat: o.eat && R() < 0.4 });
  }
  if (o.hero !== false) {
    const hw = bw * 1.7, cx = (mid + 0.5) * (W / n);
    s += char(o.heroPose || 'landed', { left: cx - hw / 2, top: y - hw * 1.02 + hw * 0.08, width: hw, z: 3 });
  }
  return s;
}

// Feast: the river with eaters, salmon, confetti; hero eating.
function feastScene(W, H, o) {
  o = o || {};
  let s = layer('background:' + SKY.feast);
  s += scene('s5-back', { left: 0, top: 0, width: W, height: H });
  s += scene('s5-water', { left: 0, top: H * 0.2, width: W, height: H * 0.8 });
  const R = rng(o.seed || 5);
  const hx = o.hx != null ? o.hx : W * 0.7;
  const hw = o.heroW || H * 0.62;
  const spots = o.spots || [[0.08, 0.95, 0.2], [0.22, 0.86, 0.17], [0.36, 0.97, 0.22], [0.9, 0.95, 0.21], [0.52, 0.82, 0.13], [0.97, 0.8, 0.14]];
  spots.forEach((p, i) => {
    const w = H * p[2];
    s += sprite('crowd-' + (i % 2 ? 'white' : 'brown') + (i % 3 ? '-eat' : ''), { left: W * p[0] - w / 2, top: H * p[1] - w * 1.05, width: w, flip: p[0] > 0.5 });
  });
  for (let i = 0; i < (o.nSalmon || 3); i++) s += sprite('salmon', { left: W * (0.1 + R() * 0.8), top: H * (0.45 + R() * 0.2), width: H * 0.16, rot: -30 + R() * 60 });
  s += char('eating', { left: hx - hw / 2, top: H - hw * 1.02, width: hw, z: 3 });
  if (o.confetti !== false) s += confetti(W, H, o.nConf || 22, o.seed || 5, { min: H * 0.04, span: H * 0.04, band: 0.9 });
  return s;
}

// Drone: river from above, the flock below the hero.
function droneScene(W, H, o) {
  o = o || {};
  let s = layer('background:#6E7257 url(' + A('scenes/s3-ground.svg') + ') ' + (o.pos || '50% 30%') + '/' + (o.tile || Math.max(W * 1.05, H * 2.4)) + 'px auto repeat');
  s += layer('background:url(' + A('scenes/s3-wisps.svg') + ') 30% 60%/' + Math.max(W * 1.05, H * 2.4) + 'px auto repeat;opacity:0.55');
  const R = rng(o.seed || 9);
  (o.flock || []).forEach((f) => { s += topdown(f[0] - f[2] / 2, f[1] - f[2] * 0.33, f[2], { white: f[3], rot: (R() - 0.5) * 16, flap: R() < 0.5 }); });
  if (o.hero) s += '<img src="' + A('characters/flying-topdown.svg') + '" style="position:absolute;left:' + (o.hero[0] - o.hero[2] / 2) + 'px;top:' + (o.hero[1] - o.hero[2] * 0.33) + 'px;width:' + o.hero[2] + 'px;z-index:3">';
  s += layer('background:linear-gradient(0deg, rgba(242,153,30,0) 55%, rgba(242,153,30,0.35) 85%, rgba(255,226,138,0.55) 100%)');
  return s;
}

// Storm: the nest in the rain with the runt.
function stormScene(W, H, o) {
  o = o || {};
  let s = layer('background:' + SKY.storm);
  s += scene('s1-back', { left: 0, top: 0, width: W, height: H });
  s += img(A('scenes/s1-bolt.svg'), { left: o.boltX != null ? o.boltX : W * 0.42, top: -H * 0.05, width: H * 0.34, op: 0.9 });
  const nx = o.nx != null ? o.nx : W * 0.72, nw = o.nestW || H * 1.25;
  const ny = o.ny != null ? o.ny : H * 0.58;
  s += img(A('scenes/s1-nest-back.svg'), { left: nx - nw / 2, top: ny, width: nw });
  s += char('sibling', { left: nx - nw * 0.45, top: ny - nw * 0.36, width: nw * 0.5 });
  s += char('runt', { left: nx + nw * 0.03, top: ny - nw * 0.2, width: nw * 0.34 });
  s += img(A('scenes/s1-nest-front.svg'), { left: nx - nw / 2, top: ny + nw * 0.02, width: nw });
  s += rain(o.rain || 0.28);
  return s;
}

// Flock: a V of flyers at dusk, the hero leading.
function flockScene(W, H, o) {
  o = o || {};
  let s = layer('background:' + (o.sky || SKY.night));
  s += scene('s6-back', { left: 0, top: H * 0.35, width: W, height: H * 0.9, css: 'object-fit:cover;object-position:50% 10%;' });
  const lx = o.lx != null ? o.lx : W * 0.78, ly = o.ly != null ? o.ly : H * 0.36;
  const R = rng(o.seed || 4);
  const n = o.n || 14;
  for (let i = 1; i <= n; i++) {
    const side = i % 2 ? -1 : 1, k = Math.ceil(i / 2);
    const x = lx - k * (o.dx || H * 0.2), y = ly + side * k * (o.dy || H * 0.085) + (R() - 0.5) * 8;
    const w = (o.fw || H * 0.2) * (1 - k * 0.045);
    s += flyer(x - w / 2, y - w * 0.3, w, { white: R() < 0.45, down: R() < 0.5 });
  }
  const hw = o.heroW || H * 0.5;
  s += char('flying-determined', { left: lx - hw * 0.3, top: ly - hw * 0.45, width: hw, z: 3 });
  return s;
}

// Mud: grey flat, the scruffy one and the scraps.
function mudScene(W, H, o) {
  o = o || {};
  let s = layer('background:' + SKY.fog);
  s += scene('s2-back', { left: 0, top: 0, width: W, height: H });
  s += img(A('scenes/s2-mud.svg'), { left: 0, top: H * 0.62, width: W, height: H * 0.4, css: 'object-fit:cover;object-position:50% 0' });
  const hx = o.hx != null ? o.hx : W * 0.7, hw = o.heroW || H * 0.66;
  s += char('scruffy', { left: hx - hw / 2, top: H - hw * 1.08, width: hw });
  s += img(A('scenes/s2-scraps.svg'), { left: hx + hw * 0.18, top: H - hw * 0.3, width: hw * 0.62 });
  s += scene('s2-front', { left: 0, top: 0, width: W, height: H, op: 0.9 });
  return s;
}

// Gold pattern of heads.
function headPattern(W, H, o) {
  o = o || {};
  let s = layer('background:' + (o.bg || K.gold));
  const step = o.step || 150, R = rng(o.seed || 2);
  for (let y = -step / 2, r = 0; y < H + step; y += step * 0.86, r++) {
    for (let x = (r % 2) * step / 2 - step / 2; x < W + step; x += step) {
      s += img(A('characters/plumage/stage-' + (R() < 0.5 ? 0 : 6) + '.svg'), { left: x, top: y, width: step * 0.62, op: o.op || 0.14, rot: (R() - 0.5) * 30, flip: R() < 0.5 });
    }
  }
  return s;
}

// Marquee tape.
function tape(W, y, rot, text, bg, fg, size) {
  const t = (text + ' <span style="color:' + (fg === K.ink ? K.salmon : K.gold) + '">★</span> ').repeat(10);
  return '<div style="position:absolute;left:-10%;width:120%;top:' + y + 'px;transform:rotate(' + rot + 'deg);background:' + bg + ';color:' + fg + ';border-block:7px solid ' + K.ink + ';font-family:Luckiest Guy;font-size:' + size + 'px;line-height:1;padding:0.32em 0 0.18em;white-space:nowrap;overflow:hidden;z-index:4;letter-spacing:0.04em">' + t + '</div>';
}

// A comic panel with a scene inside.
function panel(x, y, w, h, inner, rot) {
  return '<div class="panel" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform:rotate(' + (rot || 0) + 'deg)">' + inner + '</div>';
}

// Crowd grid: rows of eagles filling a canvas (a crowd "photo").
function crowdGrid(W, H, o) {
  o = o || {};
  let s = '';
  const R = rng(o.seed || 8);
  const rows = o.rows || 4;
  for (let r = 0; r < rows; r++) {
    const bw = (o.bird || 150) * (0.72 + (r / (rows - 1 || 1)) * 0.5);
    const y = (o.top || H * 0.45) + r * (o.rowGap || bw * 0.42);
    const n = Math.ceil(W / (bw * 0.62)) + 1;
    for (let i = 0; i < n; i++) {
      const cx = i * bw * 0.62 + (r % 2 ? bw * 0.31 : 0) + (R() - 0.5) * 10 - bw * 0.2;
      if (o.gap && r === o.gap[0] && Math.abs(cx - o.gap[1]) < bw * 0.45) continue;
      s += perch(cx, y + bw, bw, { white: R() < 0.42, flip: R() < 0.5 });
    }
  }
  return s;
}

/* ---------- X headers (1500×500). The profile photo covers the bottom-left
   corner on desktop, and phones crop the top and bottom, so the words sit in
   the upper middle and nothing important lives bottom-left. ---------- */
const XW = 1500, XH = 500;
add('x-header', XW, XH, '01', 'king-of-the-sky', (W, H) =>
  kingScene(W, H, { hx: 1110, rockW: 520, rockTop: 350, horizon: 300, sunR: 130, nFly: 4 }) +
  hl('Eagles\ngon eat', { left: 330, top: 60, size: 118, fill: K.gold }) +
  pill('King of the sky', { left: 360, top: 330, size: 30, rot: -2, shadow: K.gold }) + tickerBadge({ left: 720, top: 330, size: 30, rot: 3 }));

add('x-header', XW, XH, '02', 'we-eat-together', (W, H) =>
  branchScene(W, H, { y: 440, bird: 116, seed: 12, sunX: 1260, horizon: 300 }) +
  hl('We eat together.', { left: 0, right: 0, top: 44, size: 96, align: 'center' }) +
  pill('Nobody sits alone', { left: 610, top: 160, size: 26, rot: -2 }));

add('x-header', XW, XH, '03', 'eagles-gon-eat-feast', (W, H) =>
  feastScene(W, H, { hx: 1150, heroW: 330, spots: [[0.33, 0.98, 0.2], [0.5, 0.9, 0.15], [0.63, 0.99, 0.22], [0.93, 0.97, 0.24], [0.73, 0.82, 0.13]] }) +
  hl('Eagles\ngon eat.', { left: 300, top: 50, size: 124, fill: K.gold }) +
  pill('We ain’t eaten yet', { left: 330, top: 330, size: 28, rot: 2, shadow: K.salmon }));

add('x-header', XW, XH, '04', 'same-river-same-way', (W, H) =>
  droneScene(W, H, { hero: [1080, 250, 470], flock: [[760, 380, 130, 0], [1380, 380, 140, 1], [860, 110, 100, 1], [1330, 110, 110, 0], [640, 200, 90, 0], [1450, 250, 90, 1], [980, 440, 100, 1], [1210, 450, 95, 0]], pos: '38% 20%' }) +
  hl('Same river.\nSame way.', { left: 90, top: 70, size: 104, fill: K.fog }) +
  pill('All of us hungry', { left: 120, top: 330, size: 28, rot: -2, shadow: K.gold }));

add('x-header', XW, XH, '05', 'most-of-us-dont-make-it-out', (W, H) =>
  stormScene(W, H, { nx: 1180, ny: 230, nestW: 520, boltX: 1380 }) +
  hl('Most of us don’t\nmake it out.', { left: 300, top: 70, size: 86, fill: K.fog }) +
  pill('We did.', { left: 640, top: 290, size: 44, bg: K.gold, fg: K.ink, rot: -6, shadow: K.ink }));

add('x-header', XW, XH, '06', 'wordmark-gold', (W, H) =>
  headPattern(W, H, { step: 140 }) +
  head(0, { left: 60, top: 70, width: 360, flip: true, expr: 'hungry' }) +
  head(6, { left: 1080, top: 60, width: 370, expr: 'proud', beak: 'grin' }) +
  hl('Eagles gon eat', { left: 0, right: 0, top: 150, size: 150, align: 'center' }) +
  pill('We eat together', { left: 590, top: 350, size: 28, rot: -1.5 }));

add('x-header', XW, XH, '07', 'nobody-finds-the-run-alone', (W, H) =>
  flockScene(W, H, { lx: 1240, ly: 200, n: 14, dx: 78, dy: 30, fw: 104, heroW: 290 }) +
  hl('Nobody finds\nthe run alone.', { left: 300, top: 60, size: 92 }) +
  pill('Eagles gon eat', { left: 330, top: 300, size: 28, rot: -2, bg: K.gold, fg: K.ink, shadow: K.ink }));

add('x-header', XW, XH, '08', 'the-whole-story', (W, H) => {
  let s = layer('background:' + K.ink);
  const pw = 330, ph = 380, y0 = 50;
  const P = [
    [layer('background:' + SKY.storm) + img(A('scenes/s1-nest-back.svg'), { left: 10, top: 230, width: 310 }) + char('runt', { left: 150, top: 125, width: 150 }) + img(A('scenes/s1-nest-front.svg'), { left: 5, top: 245, width: 320 }) + rain(0.25), 'The nest'],
    [layer('background:' + SKY.fog) + img(A('scenes/s2-mud.svg'), { left: 0, top: 250, width: 340, height: 140, css: 'object-fit:cover' }) + char('scruffy', { left: 60, top: 70, width: 230 }), 'The mud'],
    [layer('background:' + SKY.sunset) + branch('M -20 330 C 120 320 220 340 360 322', 18).replace('{W}', 330).replace('{H}', 380) + char('landed', { left: 70, top: 110, width: 220 }) + perch(40, 334, 80, {}) + perch(300, 330, 80, { white: true, flip: true }), 'The branch'],
    [layer('background:' + SKY.feast) + img(A('scenes/s5-water.svg'), { left: 0, top: 160, width: 340, height: 230, css: 'object-fit:cover;object-position:50% 100%' }) + char('eating', { left: 50, top: 90, width: 250 }) + confetti(330, 380, 10, 3, { min: 18, span: 14, band: 0.6 }), 'The feast'],
  ];
  const x0 = (W - (4 * pw + 3 * 32)) / 2;
  P.forEach((p, i) => { s += panel(x0 + i * (pw + 32), y0, pw, ph, p[0], [-1.5, 1, -0.8, 1.4][i]) + pill(p[1], { left: x0 + 20 + i * (pw + 32), top: y0 - 18, size: 24, bg: i === 3 ? K.gold : K.bone, fg: K.ink, rot: [-3, 2, -2, 3][i] }); });
  return s;
});

add('x-header', XW, XH, '09', 'tape', (W, H) =>
  layer('background:' + K.teal) + sunrise(W / 2, H * 0.5, 110, { noSun: true, rayOp: 0.25 }) +
  tape(W, 90, -5, 'Eagles gon eat', K.gold, K.ink, 58) + tape(W, 300, 4, 'We eat together', K.salmon, K.ink, 50) +
  char('diving', { left: 540, top: -20, width: 440, z: 5 }) + confetti(W, H, 14, 9, { min: 24, span: 20 }));

add('x-header', XW, XH, '10', 'premium-dark', (W, H) =>
  layer('background:radial-gradient(ellipse at 76% 46%, #14295C 0%, #0A1734 45%, #050B1C 100%)') +
  sunrise(1150, 240, 150, { noSun: true, rayOp: 0.22 }) +
  head(6, { left: 960, top: 30, width: 420, expr: 'proud', beak: 'grin' }) +
  hl('Eagles gon eat', { left: 300, top: 130, size: 104, fill: K.gold }) +
  '<div class="tag" style="left:306px;top:268px;font-size:22px;color:' + K.gold200 + '">King of the sky · We eat together</div>');

/* ---------- Promo posts (1200×675, for X and Telegram posts) ---------- */
const PW = 1200, PH = 675;
add('promo', PW, PH, '01', 'eagles-gon-eat', (W, H) =>
  feastScene(W, H, { hx: 860, heroW: 470, spots: [[0.08, 0.98, 0.22], [0.26, 0.9, 0.16], [0.44, 0.99, 0.2], [0.97, 0.94, 0.2]] }) +
  hl('Eagles\ngon eat.', { left: 60, top: 60, size: 150, fill: K.gold }) +
  pill('The whole river eats together', { left: 70, top: 400, size: 26, rot: -2, shadow: K.salmon }));

add('promo', PW, PH, '02', 'we-eat-together', (W, H) => {
  let s = branchScene(W, H, { y: 620, bird: 150, seed: 21, sunX: 980, horizon: 470 });
  s += branch('M -40 380 C 300 360 600 390 1240 368', 24).replace('{W}', W).replace('{H}', H);
  const R = rng(22);
  for (let i = 0; i < 8; i++) s += perch(80 + i * 150 + R() * 20, 376, 118, { white: R() < 0.45, flip: i > 3 });
  return s + hl('We eat together.', { left: 0, right: 0, top: 40, size: 110, align: 'center' }) + pill('Nobody sits alone. Nobody gets left in the nest.', { left: 260, top: 170, size: 24, rot: -1.5 });
});

add('promo', PW, PH, '03', 'king-of-the-sky', (W, H) =>
  kingScene(W, H, { hx: 590, rockW: 600, rockTop: 470, horizon: 420, sunR: 160, nFly: 6 }) +
  hl('King of the sky.', { left: 0, right: 0, top: 40, size: 112, align: 'center', fill: K.gold }) +
  pill('And he came back for the rest of us', { left: 330, top: 170, size: 24, rot: -1.5 }));

add('promo', PW, PH, '04', 'your-turn', (W, H) =>
  layer('background:' + SKY.night) + sunrise(860, 700, 170, { noSun: true, rayOp: 0.3 }) +
  scene('s6-back', { left: 0, top: 200, width: W, height: 560, css: 'object-fit:cover;object-position:50% 20%' }) +
  img(A('scenes/s1-nest-back.svg'), { left: 560, top: 470, width: 560 }) + char('scruffy', { left: 670, top: 170, width: 380 }) + img(A('scenes/s1-nest-front.svg'), { left: 540, top: 520, width: 600 }) +
  hl('Your turn.', { left: 60, top: 80, size: 140, fill: K.gold }) + hl('Get out of\nthe nest.', { left: 60, top: 240, size: 96 }) +
  pill('Become the eagle you were meant to be', { left: 60, top: 480, size: 22, rot: -2 }));

add('promo', PW, PH, '05', 'most-of-us-dont-make-it-out', (W, H) =>
  stormScene(W, H, { nx: 860, ny: 360, nestW: 600, boltX: 520 }) +
  hl('Most of us\ndon’t make\nit out.', { left: 60, top: 60, size: 106, fill: K.fog }) +
  pill('We did.', { left: 80, top: 450, size: 60, bg: K.gold, fg: K.ink, rot: -6, shadow: K.ink }));

add('promo', PW, PH, '06', 'nobody-finds-the-run-alone', (W, H) =>
  flockScene(W, H, { lx: 960, ly: 330, n: 16, dx: 70, dy: 34, fw: 110, heroW: 330 }) +
  hl('Nobody finds\nthe run alone.', { left: 0, right: 0, top: 50, size: 104, align: 'center' }));

add('promo', PW, PH, '07', 'we-aint-eaten-yet', (W, H) =>
  mudScene(W, H, { hx: 840, heroW: 470 }) +
  hl('We ain’t\neaten yet.', { left: 60, top: 70, size: 130, fill: K.fog }) +
  pill('Most of us started right here', { left: 70, top: 370, size: 26, rot: -2 }));

add('promo', PW, PH, '08', 'same-river-same-way', (W, H) =>
  droneScene(W, H, { hero: [600, 400, 560], flock: [[200, 560, 150, 0], [1000, 580, 160, 1], [130, 300, 120, 1], [1080, 300, 120, 0], [380, 640, 110, 1], [830, 660, 110, 0]], pos: '50% 10%' }) +
  hl('Same river. Same way.', { left: 0, right: 0, top: 40, size: 88, align: 'center', fill: K.fog }) +
  pill('All of us hungry', { left: 470, top: 150, size: 26, rot: -1.5, shadow: K.gold }));

add('promo', PW, PH, '09', 'join-the-flock', (W, H) => {
  let s = layer('background:' + SKY.sunset) + sunrise(600, 700, 200, { noSun: true, rayOp: 0.35 });
  s += crowdGrid(W, H, { rows: 4, bird: 140, top: 200, seed: 31, gap: [3, 610] });
  // the empty spot waiting for you
  s += '<div style="position:absolute;left:532px;top:430px;width:156px;height:165px;z-index:10;border:6px dashed ' + K.ink + ';border-radius:50% 50% 40% 40%;background:rgba(255,253,246,0.55)"></div>';
  s += pill('You?', { left: 548, top: 492, css: 'z-index:11;', size: 34, bg: K.ink, fg: K.gold, rot: -4 });
  return s + hl('Join the flock.', { left: 0, right: 0, top: 50, size: 120, align: 'center' }) + pill('There’s always room on the branch', { left: 380, top: 190, size: 24, rot: -1.5 });
});

add('promo', PW, PH, '10', 'gm-eagles', (W, H) =>
  layer('background:' + SKY.dawn) + sunrise(860, 400, 190, { rayOp: 0.9 }) +
  art('s7-panorama', W, H, 0.47, 440) +
  img(A('scenes/s7-rock.svg'), { left: 700, top: 390, width: 440 }) +
  char('adult-white-head', { left: 700, top: 200, width: 330, z: 3 }) +
  hl('GM,\neagles.', { left: 60, top: 70, size: 170, fill: K.gold }) +
  pill('Up early. Flying together.', { left: 70, top: 420, size: 28, rot: -2 }));

/* ---------- Promo posts, round two (1200×675): the eagles at work and play ---------- */
// Props drawn in the same ink style as the art: thick outline, flat fill.
const svgAt = (x, y, w, h, vb, inner, z) => '<svg style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;overflow:visible;' + (z != null ? 'z-index:' + z + ';' : '') + '" viewBox="' + vb + '">' + inner + '</svg>';
const P = (d, fill, sw) => '<path d="' + d + '" fill="' + fill + '" stroke="' + K.ink + '" stroke-width="' + (sw || 6) + '" stroke-linejoin="round" stroke-linecap="round"/>';
const Rr = (x, y, w, h, r, fill, sw) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + fill + '" stroke="' + K.ink + '" stroke-width="' + (sw == null ? 6 : sw) + '"/>';
const T = (x, y, text, size, fill, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-family="' + (o.font || 'Luckiest Guy') + '" font-size="' + size + '" font-weight="' + (o.weight || 400) + '" fill="' + fill + '" text-anchor="' + (o.anchor || 'start') + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + o.sw + '" paint-order="stroke" stroke-linejoin="round"' : '') + '>' + text + '</text>'; };

// Candles: a wandering chart, teal up / salmon down. Shape only — no numbers, no promises.
function candles(w, h, n, seed, o) {
  o = o || {};
  const R = rng(seed);
  let v = h * (o.start || 0.6), s = '';
  const cw = (w / n) * 0.56;
  for (let i = 0; i < n; i++) {
    const drift = o.drift != null ? o.drift : 0;
    const nv = Math.max(h * 0.12, Math.min(h * 0.88, v + (R() - 0.5 - drift) * h * 0.22));
    const up = nv < v, top = Math.min(v, nv), bot = Math.max(v, nv);
    const cx = (i + 0.5) * (w / n);
    const col = up ? K.teal300 : K.salmon;
    s += '<line x1="' + cx + '" x2="' + cx + '" y1="' + (top - h * 0.05 - R() * h * 0.05) + '" y2="' + (bot + h * 0.05 + R() * h * 0.05) + '" stroke="' + col + '" stroke-width="' + Math.max(2, cw * 0.18) + '"/>';
    s += '<rect x="' + (cx - cw / 2) + '" y="' + top + '" width="' + cw + '" height="' + Math.max(4, bot - top) + '" fill="' + col + '" rx="2"/>';
    v = nv;
  }
  return s;
}
function monitor(x, y, w, h, seed, o) {
  o = o || {};
  const inner = Rr(4, 4, w - 8, h - 8, 16, K.ink, 8) + Rr(18, 18, w - 36, h - 36, 8, '#0E1A2B', 0) +
    '<g opacity="0.25">' + [1, 2, 3].map((k) => '<line x1="18" x2="' + (w - 18) + '" y1="' + (18 + ((h - 36) * k) / 4) + '" y2="' + (18 + ((h - 36) * k) / 4) + '" stroke="#5CC8BA" stroke-width="2"/>').join('') + '</g>' +
    '<g transform="translate(28 26)">' + candles(w - 56, h - 52, o.n || 16, seed, o) + '</g>' +
    (o.stand === false ? '' : P('M ' + (w / 2 - 16) + ' ' + (h - 2) + ' L ' + (w / 2 - 22) + ' ' + (h + 34) + ' L ' + (w / 2 + 22) + ' ' + (h + 34) + ' L ' + (w / 2 + 16) + ' ' + (h - 2) + ' Z', '#3A3F4A', 5) + P('M ' + (w / 2 - 60) + ' ' + (h + 34) + ' L ' + (w / 2 + 60) + ' ' + (h + 34) + ' L ' + (w / 2 + 64) + ' ' + (h + 46) + ' L ' + (w / 2 - 64) + ' ' + (h + 46) + ' Z', '#3A3F4A', 5));
  return svgAt(x, y, w, h + 46, '0 0 ' + w + ' ' + (h + 46), inner, o.z);
}
const desk = (x, y, w, h, z) => svgAt(x, y, w, h, '0 0 ' + w + ' ' + h, Rr(-10, 0, w + 20, 34, 10, '#8A5A36') + '<rect x="0" y="34" width="' + w + '" height="' + (h - 34) + '" fill="#5E3A20"/><line x1="0" x2="' + w + '" y1="34" y2="34" stroke="' + K.ink + '" stroke-width="6"/>' + '<path d="M 10 12 L ' + (w - 10) + ' 12" stroke="#A8744A" stroke-width="5" stroke-linecap="round"/>', z == null ? 4 : z);
const mug = (x, y, s, z) => svgAt(x, y, 90 * s, 100 * s, '0 0 90 100', P('M 62 38 C 88 36 90 70 62 72', 'none', 8) + P('M 8 22 L 66 22 L 60 92 L 14 92 Z', K.cream) + P('M 26 44 C 34 38 42 50 50 44 L 46 66 C 40 72 30 72 24 64 Z', K.gold, 3.5) + '<path d="M 24 14 q 6 -8 0 -14 M 40 14 q 6 -8 0 -14" fill="none" stroke="' + K.cream + '" stroke-width="4" stroke-linecap="round" opacity="0.8"/>', z == null ? 5 : z);
function laptop(x, y, w, o) {
  o = o || {};
  const h = w * 0.62;
  const inner = P('M 8 0 L ' + (w - 8) + ' 0 L ' + (w - 8) + ' ' + (h * 0.8) + ' L 8 ' + (h * 0.8) + ' Z', '#3A3F4A', 5) +
    '<rect x="18" y="10" width="' + (w - 36) + '" height="' + (h * 0.8 - 20) + '" fill="#0E1A2B"/>' + (o.chart ? '<g transform="translate(24 16)">' + candles(w - 48, h * 0.8 - 32, 10, o.seed || 3) + '</g>' : '') +
    (o.glow ? '' : '') + P('M -6 ' + h * 0.8 + ' L ' + (w + 6) + ' ' + h * 0.8 + ' L ' + (w - 4) + ' ' + h + ' L 4 ' + h + ' Z', '#5B616D', 5);
  return svgAt(x, y, w, h, '0 0 ' + w + ' ' + h, inner, o.z == null ? 5 : o.z);
}
const glowCone = (x, y, w, h, op) => svgAt(x, y, w, h, '0 0 100 100', '<path d="M 40 100 L 60 100 L 100 0 L 0 0 Z" fill="#9CE0FF" opacity="' + (op || 0.12) + '"/>', 2);
const salmonAt = (x, y, w, rot, z) => sprite('salmon', { left: x, top: y, width: w, rot: rot, z: z });

const PR = (id, name, html) => add('promo', PW, PH, id, name, html);

PR('11', 'eagle-eyes-on-the-chart', (W, H) =>
  layer('background:linear-gradient(180deg,#0A1734 0%,#14295C 100%)') +
  svgAt(0, 0, W, H, '0 0 1200 675', '<g opacity="0.18" stroke="#5CC8BA" stroke-width="2">' + Array.from({ length: 12 }, (_, i) => '<line x1="' + i * 110 + '" y1="0" x2="' + i * 110 + '" y2="675"/>').join('') + '</g>') +
  monitor(70, 250, 360, 230, 11, { n: 14 }) + monitor(770, 250, 360, 230, 12, { n: 14 }) +
  char('adult-white-head', { left: 420, top: 150, width: 360, z: 3 }) +
  desk(0, 520, W, 155) + mug(930, 440, 1) + laptop(470, 440, 260, { chart: true, seed: 9, z: 6 }) +
  hl('Eagle eyes on the chart.', { left: 0, right: 0, top: 36, size: 82, align: 'center', fill: K.gold }) +
  pill('Talons on the keyboard', { left: 460, top: 140, size: 24, rot: -2, css: 'z-index:7' }));

PR('12', '3am-still-watching', (W, H) => {
  let s = layer('background:#070D1C');
  s += svgAt(900, 70, 170, 170, '0 0 170 170', '<circle cx="85" cy="85" r="76" fill="' + K.cream + '" stroke="' + K.ink + '" stroke-width="8"/><path d="M 85 85 L 85 30 M 85 85 L 118 85" stroke="' + K.ink + '" stroke-width="9" stroke-linecap="round"/>' + [0, 1, 2, 3].map((k) => '<circle cx="' + (85 + 58 * Math.cos(k * Math.PI / 2)) + '" cy="' + (85 + 58 * Math.sin(k * Math.PI / 2)) + '" r="6" fill="' + K.ink + '"/>').join(''));
  s += glowCone(650, 180, 380, 330, 0.16);
  s += head(0, { left: 690, top: 120, width: 300, expr: 'tired' });
  s += desk(0, 520, W, 155) + laptop(700, 400, 280, { chart: true, seed: 33, z: 6 }) + mug(1040, 440, 0.95);
  return s + hl('3 AM.', { left: 60, top: 70, size: 170, fill: K.gold }) + hl('Still watching\nthe river.', { left: 60, top: 250, size: 84 }) + pill('Eagles don’t sleep. They blink slowly.', { left: 64, top: 450, size: 24, rot: -2, css: 'z-index:7' });
});

PR('13', 'every-chart-is-a-river', (W, H) =>
  layer('background:' + SKY.feast) + scene('s5-water', { left: 0, top: 260, width: W, height: 415 }) +
  svgAt(80, 230, 1040, 330, '0 0 1040 330', candles(1040, 330, 26, 77, { start: 0.55 })) +
  salmonAt(560, 250, 170, -35, 5) + char('diving', { left: 820, top: 30, width: 330, z: 6 }) +
  hl('Every chart is\njust a river.', { left: 60, top: 40, size: 96 }) +
  pill('And eagles know rivers', { left: 70, top: 250, size: 26, rot: -2, bg: K.gold, fg: K.ink, shadow: K.ink }));

PR('14', 'target-acquired', (W, H) =>
  droneScene(W, H, { hero: [860, 330, 520], flock: [[1100, 560, 120, 1], [620, 580, 110, 0], [1120, 120, 90, 0]], pos: '20% 40%' }) +
  svgAt(250, 330, 220, 220, '0 0 220 220', '<circle cx="110" cy="110" r="88" fill="none" stroke="' + K.gold + '" stroke-width="8" stroke-dasharray="26 14"/><circle cx="110" cy="110" r="10" fill="' + K.gold + '"/><path d="M 110 0 L 110 50 M 110 170 L 110 220 M 0 110 L 50 110 M 170 110 L 220 110" stroke="' + K.gold + '" stroke-width="8" stroke-linecap="round"/>', 5) +
  salmonAt(300, 400, 120, -60, 4) +
  hl('Eagle vision:', { left: 60, top: 40, size: 90, fill: K.fog }) + hl('target acquired.', { left: 60, top: 140, size: 90, fill: K.gold }));

PR('15', 'the-plan', (W, H) => {
  let s = layer('background:#E8DCC6') + layer('background:repeating-linear-gradient(0deg,rgba(23,17,13,0.04) 0 2px,transparent 2px 40px)');
  s += svgAt(60, 150, 720, 480, '0 0 720 480', Rr(4, 4, 712, 440, 18, '#FFFDF6', 10) + '<rect x="4" y="440" width="712" height="24" fill="#B7BCC4" stroke="' + K.ink + '" stroke-width="8"/>' +
    T(50, 100, 'THE PLAN', 70, K.ink) +
    T(50, 190, '1. LEAVE THE NEST', 46, '#2E3A4B') + T(50, 270, '2. FIND THE FLOCK', 46, '#2E3A4B') + T(50, 350, '3. EAT', 58, '#DE5A4B') +
    '<path d="M 560 160 l 22 22 l 44 -52 M 560 240 l 22 22 l 44 -52" fill="none" stroke="' + K.teal + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<ellipse cx="136" cy="336" rx="110" ry="46" fill="none" stroke="#DE5A4B" stroke-width="7" transform="rotate(-4 136 336)"/>');
  s += char('landed', { left: 770, top: 150, width: 420 });
  return s + hl('We have a plan.', { left: 60, top: 26, size: 100, fill: K.gold });
});

PR('16', 'flock-meeting', (W, H) => {
  let s = layer('background:' + SKY.night) + sunrise(600, 720, 200, { noSun: true, rayOp: 0.25 });
  s += branch('M -40 560 C 300 540 800 580 1240 548', 30).replace('{W}', W).replace('{H}', H);
  const R = rng(161);
  [150, 370, 600, 830, 1050].forEach((cx, i) => {
    s += perch(cx, 560, 200, { white: i % 2 === 1, flip: cx > 600 });
    s += laptop(cx - 70, 470, 140, { chart: i % 2 === 0, seed: 20 + i, z: 5 });
  });
  return s + hl('Flock meeting.', { left: 0, right: 0, top: 50, size: 110, align: 'center' }) + pill('Tonight. Bring snacks. Mostly salmon.', { left: 360, top: 190, size: 26, rot: -1.5, bg: K.gold, fg: K.ink, shadow: K.ink });
});

PR('17', 'breaking-news', (W, H) => {
  let s = layer('background:linear-gradient(180deg,#14295C,#23448F)') + layer('background:repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0 60px,transparent 60px 120px)');
  s += sunrise(600, 300, 140, { noSun: true, rayOp: 0.22 });
  s += char('adult-white-head', { left: 430, top: 105, width: 340, z: 3 });
  s += svgAt(200, 400, 800, 120, '0 0 800 120', Rr(4, 4, 792, 112, 16, K.salmon, 8) + T(400, 80, 'EAGLE NEWS 24', 52, K.bone, { anchor: 'middle', stroke: K.ink, sw: 10 }), 4);
  s += '<div style="position:absolute;left:0;right:0;top:535px;height:140px;z-index:6">' +
    '<div style="position:absolute;left:0;top:0;padding:12px 26px 6px;background:' + K.gold + ';border:6px solid ' + K.ink + ';font:400 38px/1 Luckiest Guy;color:' + K.ink + '">BREAKING</div>' +
    '<div style="position:absolute;left:0;right:0;top:56px;height:84px;background:' + K.ink + ';color:' + K.bone + ';font:400 46px/84px Luckiest Guy;padding-left:30px;white-space:nowrap">EAGLES STILL HUNGRY. MORE AT 11.</div></div>';
  return s;
});

PR('18', 'forecast-100-percent-eating', (W, H) => {
  let s = layer('background:' + SKY.sunset);
  s += svgAt(60, 150, 560, 420, '0 0 560 420', Rr(4, 4, 552, 412, 26, '#16968E', 8) +
    '<path d="M 120 60 C 200 140 120 220 220 300 C 290 356 260 400 300 420" fill="none" stroke="' + K.teal300 + '" stroke-width="40" stroke-linecap="round"/>' +
    T(280, 250, '100%', 150, K.gold, { anchor: 'middle', stroke: K.ink, sw: 16 }) + T(280, 320, 'CHANCE OF EATING', 40, K.bone, { anchor: 'middle', stroke: K.ink, sw: 10 }));
  s += svgAt(690, 120, 300, 180, '0 0 300 180', P(cloudPath(), K.cream, 7));
  for (let i = 0; i < 5; i++) s += salmonAt(710 + i * 55, 280 + (i % 2) * 40, 80, 70, 3);
  s += char('landed', { left: 820, top: 230, width: 380, z: 4 });
  return s + hl('Today’s forecast:', { left: 60, top: 36, size: 84 });
});
function cloudPath() { return 'M 40 150 C 0 150 0 100 40 96 C 36 50 90 36 110 64 C 124 20 196 20 204 70 C 250 56 290 90 268 128 C 300 150 280 172 250 170 Z'; }

PR('19', 'wanted', (W, H) => {
  let s = layer('background:#5E3A20') + layer('background:repeating-linear-gradient(90deg,rgba(0,0,0,0.12) 0 4px,transparent 4px 90px)');
  s += svgAt(330, 20, 540, 640, '0 0 540 640', P('M 10 14 L 530 6 L 524 120 L 534 250 L 522 400 L 532 632 L 14 626 L 22 470 L 8 320 L 18 180 Z', '#EBD6A8', 8) +
    T(270, 110, 'WANTED', 104, '#5E3A20', { anchor: 'middle' }) + Rr(120, 140, 300, 280, 8, '#D7BE88', 6) +
    T(270, 480, 'FOR EATING ALL', 44, '#5E3A20', { anchor: 'middle' }) + T(270, 530, 'THE SALMON', 44, '#5E3A20', { anchor: 'middle' }) + T(270, 596, 'REWARD: ONE (1) FISH', 32, '#DE5A4B', { anchor: 'middle' }), 2);
  s += head(0, { left: 470, top: 175, width: 270, expr: 'smug', beak: 'grin', css: 'z-index:3' });
  s += '<div style="position:absolute;left:585px;top:12px;width:30px;height:30px;border-radius:50%;background:#9AA5B1;border:5px solid ' + K.ink + ';z-index:4"></div>';
  return s + salmonAt(60, 440, 220, -20) + salmonAt(930, 90, 200, 25);
});

PR('20', 'eagle-monthly', (W, H) => {
  let s = layer('background:' + K.teal700);
  s += '<div style="position:absolute;left:330px;top:18px;width:540px;height:640px;border:8px solid ' + K.ink + ';border-radius:10px;overflow:hidden;background:' + SKY.dawn + ';transform:rotate(-2deg);box-shadow:16px 16px 0 rgba(0,0,0,.35)">' +
    sunrise(270, 420, 120, { rayOp: 0.9 }) + char('adult-white-head', { left: 130, top: 240, width: 300 }) +
    '<div style="position:absolute;left:0;right:0;top:18px;text-align:center;font:400 88px/1 Luckiest Guy;color:' + K.gold + ';-webkit-text-stroke:3px ' + K.ink + ';text-shadow:4px 5px 0 ' + K.ink + '">EAGLE</div>' +
    '<div style="position:absolute;left:0;right:0;top:106px;text-align:center;font:800 18px/1 Inter;letter-spacing:.5em;color:' + K.cream + '">MONTHLY</div>' +
    '<div style="position:absolute;left:22px;top:160px;width:190px;font:400 26px/1.05 Luckiest Guy;color:' + K.bone + ';text-shadow:2px 3px 0 ' + K.ink + '">KING OF THE SKY ISSUE</div>' +
    '<div style="position:absolute;right:22px;top:170px;width:170px;text-align:right;font:800 15px/1.3 Inter;color:' + K.cream + '">Five years of brown: a memoir</div>' +
    '<div style="position:absolute;left:22px;bottom:84px;width:200px;font:800 15px/1.3 Inter;color:' + K.ink + ';background:' + K.gold + ';padding:6px 10px;border:3px solid ' + K.ink + ';border-radius:8px">Six to a branch: too many?</div>' +
    '<div style="position:absolute;right:22px;bottom:22px;width:110px;height:56px;background:repeating-linear-gradient(90deg,#17110D 0 3px,#fff 3px 5px,#17110D 5px 6px,#fff 6px 10px);border:4px solid #fff"></div></div>';
  return s + confetti(W, H, 16, 20, { min: 24, span: 18 });
});

PR('21', 'wing-day', (W, H) => {
  let s = layer('background:#2E3A4B') + layer('background:repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0 3px,transparent 3px 60px)');
  s += svgAt(0, 560, W, 115, '0 0 1200 115', '<rect x="0" y="0" width="1200" height="115" fill="#1B2330"/><line x1="0" x2="1200" y1="4" y2="4" stroke="' + K.ink + '" stroke-width="8"/>');
  s += char('landed', { left: 620, top: 150, width: 440, z: 3 });
  s += svgAt(560, 330, 560, 140, '0 0 560 140', '<rect x="20" y="62" width="520" height="16" rx="8" fill="#9AA5B1" stroke="' + K.ink + '" stroke-width="5"/>' +
    [30, 80, 480, 430].map((x, i) => '<rect x="' + (x - (i % 2 ? 0 : 0)) + '" y="' + (i % 2 ? 22 : 6) + '" width="44" height="' + (i % 2 ? 96 : 128) + '" rx="12" fill="' + (i % 2 ? K.salmon300 : K.salmon) + '" stroke="' + K.ink + '" stroke-width="6"/>').join(''), 4);
  return s + hl('Wing day.', { left: 60, top: 60, size: 150, fill: K.gold }) + pill('Never skip wing day', { left: 70, top: 250, size: 30, rot: -2 }) + pill('Reps: until we eat', { left: 70, top: 330, size: 30, rot: 2, bg: K.bone, fg: K.ink });
});

PR('22', 'player-2-has-joined', (W, H) => {
  let s = layer('background:#07091A') + layer('background:repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0 2px,transparent 2px 6px)');
  s += '<div style="position:absolute;inset:24px;border:8px solid ' + K.gold + ';border-radius:22px;box-shadow:inset 0 0 0 6px #07091A,inset 0 0 0 12px ' + K.salmon + '"></div>';
  s += svgAt(60, 50, 1080, 60, '0 0 1080 60', T(0, 44, '1UP 00', 40, K.bone) + T(540, 44, 'FLOCK 3742', 40, K.gold, { anchor: 'middle' }) + T(1080, 44, '2UP 00', 40, K.bone, { anchor: 'end' }));
  s += flyer(220, 330, 300, {}) + flyer(680, 300, 300, { white: true, flip: true, down: true });
  s += svgAt(560, 350, 80, 80, '0 0 80 80', '<path d="M 40 10 L 48 32 L 70 32 L 52 46 L 60 70 L 40 56 L 20 70 L 28 46 L 10 32 L 32 32 Z" fill="' + K.gold + '" stroke="' + K.ink + '" stroke-width="5"/>');
  return s + hl('Player 2 has\njoined the flock.', { left: 0, right: 0, top: 120, size: 88, align: 'center', fill: K.teal300 }) + pill('Press start', { left: 480, top: 560, size: 36, bg: K.gold, fg: K.ink, shadow: K.salmon });
});

PR('23', 'todays-menu', (W, H) => {
  let s = layer('background:#5E3A20');
  const items = [['Salmon', 'yes'], ['More salmon', 'yes'], ['Salmon (again)', 'obviously'], ['Dessert', 'salmon']];
  s += svgAt(40, 40, 700, 595, '0 0 700 595', Rr(6, 6, 688, 583, 22, '#8A5A36', 12) + Rr(34, 34, 632, 527, 10, '#1F2A24', 6) +
    T(350, 130, 'TODAY’S MENU', 66, K.cream, { anchor: 'middle' }) + '<path d="M 150 158 L 550 158" stroke="' + K.cream + '" stroke-width="4" stroke-dasharray="14 10"/>' +
    items.map((it, i) => T(80, 240 + i * 80, it[0].toUpperCase(), 38, K.bone) + '<path d="M ' + (90 + it[0].length * 22) + ' ' + (230 + i * 80) + ' L ' + (600 - it[1].length * 19) + ' ' + (230 + i * 80) + '" stroke="' + K.cream + '" stroke-width="4" stroke-dasharray="4 10" stroke-linecap="round"/>' + T(620, 240 + i * 80, it[1].toUpperCase(), 38, K.gold, { anchor: 'end' })).join(''), 2);
  s += char('eating', { left: 760, top: 170, width: 420, z: 3 });
  return s + pill('Eagles gon eat', { left: 800, top: 70, size: 40, bg: K.gold, fg: K.ink, rot: 4, shadow: K.ink });
});

PR('24', 'loading-the-flock', (W, H) => {
  let s = layer('background:' + SKY.midnight);
  const R = rng(241);
  for (let i = 0; i < 9; i++) s += flyer(40 + i * 122 + R() * 20, 160 + R() * 150, 130 + R() * 50, { white: R() < 0.45, down: R() < 0.5, op: 0.95 });
  s += svgAt(150, 430, 900, 90, '0 0 900 90', Rr(5, 5, 890, 80, 40, '#0E1A2B', 8) + '<rect x="18" y="18" width="' + (864 * 0.87) + '" height="54" rx="27" fill="' + K.gold + '"/>' + '<g opacity="0.35">' + Array.from({ length: 22 }, (_, i) => '<path d="M ' + (30 + i * 36) + ' 72 L ' + (52 + i * 36) + ' 18" stroke="' + K.ink + '" stroke-width="10"/>').join('') + '</g>');
  return s + hl('Loading the flock…', { left: 0, right: 0, top: 40, size: 92, align: 'center' }) +
    '<div class="tag" style="left:0;right:0;top:545px;text-align:center;font-size:28px;color:' + K.gold200 + '">87% · 3,742 eagles on the river</div>';
});

PR('25', 'flock-card', (W, H) => {
  let s = layer('background:' + K.teal) + sunrise(600, 340, 150, { noSun: true, rayOp: 0.25 });
  s += '<div style="position:absolute;left:220px;top:130px;width:760px;height:460px;border-radius:34px;background:linear-gradient(135deg,#FFE28A,#FFC83A 55%,#F2991E);border:8px solid ' + K.ink + ';box-shadow:0 18px 0 rgba(23,17,13,.35);transform:rotate(-3deg);overflow:hidden">' +
    '<div style="position:absolute;left:34px;top:30px;font:400 46px/1 Luckiest Guy;color:' + K.ink + '">EAGLES GON EAT</div>' +
    '<div style="position:absolute;right:34px;top:36px;font:800 16px/1 Inter;letter-spacing:.3em;color:' + K.ink + '">FLOCK CARD</div>' +
    '<div style="position:absolute;left:34px;top:110px;width:250px;height:290px;border-radius:18px;background:' + K.teal300 + ';border:6px solid ' + K.ink + ';overflow:hidden"></div>' +
    '<div style="position:absolute;left:320px;top:120px;display:grid;gap:18px;font:800 15px/1.1 Inter;letter-spacing:.14em;color:#5E3A20">' +
    ['NAME|Another hungry eagle', 'RANK|Flock', 'MEMBER SINCE|The nest', 'VALID UNTIL|Forever'].map((r) => { const [a, b] = r.split('|'); return '<div>' + a + '<div style="font:400 32px/1.05 Luckiest Guy;letter-spacing:.02em;text-transform:uppercase;color:' + K.ink + ';margin-top:4px">' + b + '</div></div>'; }).join('') + '</div>' +
    '<div style="position:absolute;right:40px;bottom:36px;width:80px;height:80px;border-radius:50%;background:conic-gradient(#5CC8BA,#FFB2A4,#FFE28A,#5CC8BA);border:5px solid ' + K.ink + ';opacity:.9"></div></div>';
  s += head(0, { left: 250, top: 270, width: 250, expr: 'happy', beak: 'grin', css: 'z-index:3;transform:rotate(-3deg)' });
  return s + hl('Card-carrying eagle.', { left: 0, right: 0, top: 30, size: 76, align: 'center' });
});

PR('26', 'eagle-crossing', (W, H) => {
  let s = layer('background:' + SKY.sunset);
  s += art('s4-back', W, H, 0.56, 430);
  s += svgAt(0, 520, W, 155, '0 0 1200 155', '<rect x="0" y="0" width="1200" height="155" fill="#4A4F5A"/><line x1="0" x2="1200" y1="4" y2="4" stroke="' + K.ink + '" stroke-width="8"/>' + Array.from({ length: 8 }, (_, i) => '<rect x="' + (20 + i * 160) + '" y="72" width="90" height="14" rx="4" fill="' + K.cream + '"/>').join(''));
  s += svgAt(760, 60, 360, 560, '0 0 360 560', '<rect x="164" y="300" width="32" height="260" fill="#9AA5B1" stroke="' + K.ink + '" stroke-width="7"/>' + P('M 180 14 L 346 180 L 180 346 L 14 180 Z', K.gold, 10) + P('M 180 40 L 320 180 L 180 320 L 40 180 Z', 'none', 5));
  s += flyer(830, 190, 200, { rot: -8 });
  s += perch(250, 580, 150, {}) + perch(400, 590, 160, { white: true }) + perch(550, 585, 150, {});
  return s + hl('Eagles\ncrossing.', { left: 60, top: 50, size: 140 }) + pill('Slow down. They’re heading to eat.', { left: 64, top: 330, size: 26, rot: -2 });
});

PR('27', 'day-1-day-1825', (W, H) => {
  let s = '<div style="position:absolute;left:0;top:0;width:600px;height:675px;background:' + SKY.fog + ';overflow:hidden">' + img(A('scenes/s2-mud.svg'), { left: 0, top: 500, width: 600, height: 175, css: 'object-fit:cover' }) + char('scruffy', { left: 120, top: 190, width: 360 }) + '</div>';
  s += '<div style="position:absolute;left:600px;top:0;width:600px;height:675px;background:' + SKY.dawn + ';overflow:hidden">' + sunrise(300, 420, 150, { rayOp: 0.9 }) + img(A('scenes/s7-rock.svg'), { left: 110, top: 420, width: 380 }) + char('adult-white-head', { left: 150, top: 200, width: 330 }) + '</div>';
  s += '<div style="position:absolute;left:592px;top:0;width:16px;height:675px;background:' + K.ink + '"></div>';
  s += pill('Day 1', { left: 60, top: 60, size: 56, bg: K.bone, fg: K.ink, rot: -3, shadow: K.ink }) + pill('Day 1,825', { left: 760, top: 60, size: 56, bg: K.gold, fg: K.ink, rot: 3, shadow: K.ink });
  s += '<div style="position:absolute;left:0;right:0;top:548px;height:127px;background:' + K.ink + ';z-index:4"></div>';
  return s + hl('Five years of brown.', { left: 0, right: 0, top: 572, size: 70, align: 'center', fill: K.gold });
});

PR('28', 'flock-selfie', (W, H) => {
  let s = layer('background:' + SKY.feast) + sunrise(600, 360, 140, { noSun: true, rayOp: 0.3 });
  const heads = [[0, 'happy', 'grin', 90, 260, 300, false], [6, 'proud', 'grin', 330, 170, 330, false], [0, 'amazed', null, 620, 190, 300, true], [6, 'happy', 'grin', 860, 250, 300, true], [0, 'smug', null, 480, 340, 280, false], [0, 'hungry', 'open', 220, 380, 250, false], [6, 'determined', null, 760, 390, 250, true]];
  heads.forEach((h) => { s += head(h[0], { left: h[3], top: h[4], width: h[5], expr: h[1], beak: h[2] || undefined, flip: h[6] }); });
  s += '<div style="position:absolute;inset:18px;border:10px solid ' + K.ink + ';border-radius:44px;box-shadow:inset 0 0 0 6px ' + K.bone + '"></div>';
  s += svgAt(560, 590, 80, 80, '0 0 80 80', '<circle cx="40" cy="40" r="34" fill="' + K.bone + '" stroke="' + K.ink + '" stroke-width="7"/><circle cx="40" cy="40" r="22" fill="none" stroke="' + K.ink + '" stroke-width="4"/>', 7);
  return s + hl('Flock selfie.', { left: 0, right: 0, top: 40, size: 110, align: 'center' });
});

PR('29', 'x-marks-the-river', (W, H) => {
  let s = layer('background:#3A2A1C');
  s += svgAt(40, 30, 1120, 615, '0 0 1120 615', P('M 16 20 L 1100 8 L 1108 300 L 1096 600 L 20 606 L 8 320 Z', '#EBD6A8', 10) +
    '<path d="M 60 520 C 200 420 180 300 360 300 C 540 300 520 460 700 420 C 860 384 820 220 980 170" fill="none" stroke="#16968E" stroke-width="54" stroke-linecap="round" opacity="0.85"/>' +
    '<path d="M 150 470 C 260 380 300 330 420 360 C 560 400 620 360 760 330 C 820 316 840 270 870 250" fill="none" stroke="#DE5A4B" stroke-width="8" stroke-dasharray="4 22" stroke-linecap="round"/>' +
    '<path d="M 850 220 l 50 50 M 900 220 l -50 50" stroke="#DE5A4B" stroke-width="16" stroke-linecap="round"/>' +
    [[560, 110], [480, 520], [680, 200], [940, 440], [180, 330], [1000, 330]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="26" fill="#6F7D4A" stroke="' + K.ink + '" stroke-width="5"/>').join('') +
    '<g transform="translate(1010 520)"><circle r="54" fill="none" stroke="' + K.ink + '" stroke-width="5"/><path d="M 0 -64 L 12 0 L 0 64 L -12 0 Z" fill="' + K.ink + '"/>' + T(0, -72, 'N', 30, K.ink, { anchor: 'middle' }) + '</g>' +
    T(120, 580, 'YOU ARE HERE', 26, '#5E3A20'), 1);
  s += img(A('scenes/s1-nest-front.svg'), { left: 90, top: 460, width: 150, z: 2 }) + salmonAt(880, 290, 110, -20, 3);
  return s + hl('X marks\nthe river.', { left: 90, top: 70, size: 110, fill: K.gold });
});

PR('30', 'gone-fishing', (W, H) => {
  let s = layer('background:' + K.teal) + sunrise(900, 340, 160, { noSun: true, rayOp: 0.22 });
  s += '<div style="position:absolute;left:80px;top:110px;width:640px;height:460px;background:' + K.bone + ';border:8px solid ' + K.ink + ';border-radius:24px;box-shadow:14px 16px 0 rgba(23,17,13,.35);font-family:Inter;color:' + K.ink + ';overflow:hidden">' +
    '<div style="background:' + K.ink + ';color:' + K.gold + ';font:400 30px/1 Luckiest Guy;padding:18px 26px 12px">AUTO-REPLY</div>' +
    '<div style="padding:24px 30px;display:grid;gap:10px;font-size:20px;line-height:1.45">' +
    '<div style="font-weight:800;color:#7A6A5A;font-size:15px;letter-spacing:.14em">FROM: EVERY EAGLE · SUBJECT: OUT OF OFFICE</div>' +
    '<div style="font:400 58px/1 Luckiest Guy;margin-block:6px;text-transform:uppercase">Gone fishing.</div>' +
    '<div>We’re at the river with the whole flock. We’ll reply when we’ve eaten.</div>' +
    '<div style="font-weight:800">Probably not soon.</div></div></div>';
  s += char('diving', { left: 720, top: 90, width: 440, z: 3 }) + sprite('splash', { left: 820, top: 480, width: 300, z: 2 });
  return s + pill('Eagles gon eat', { left: 90, top: 40, size: 34, bg: K.gold, fg: K.ink, rot: -2, shadow: K.ink });
});

/* ---------- Telegram (1080×1080 posts, stickers, welcome card) ---------- */
const TW = 1080, TH = 1080;
add('telegram', TW, TH, '01', 'welcome-to-the-flock', (W, H) =>
  layer('background:' + SKY.sunset) + sunrise(540, 1080, 300, { noSun: true, rayOp: 0.35 }) +
  crowdGrid(W, H, { rows: 5, bird: 170, top: 400, seed: 41 }) +
  hl('Welcome\nto the flock.', { left: 0, right: 0, top: 80, size: 130, align: 'center' }) +
  pill('Grab a branch. We eat together.', { left: 250, top: 360, size: 30, rot: -2 }));

add('telegram', TW, TH, '02', 'gm', (W, H) =>
  layer('background:' + SKY.dawn) + sunrise(540, 660, 250, { rayOp: 0.9 }) +
  art('s7-panorama', W, H, 0.47, 720) +
  img(A('scenes/s7-rock.svg'), { left: 250, top: 900 - 0.34 * 750, width: 600 }) +
  char('adult-white-head', { left: 350, top: 470, width: 360, z: 3 }) +
  hl('GM', { left: 0, right: 0, top: 70, size: 300, align: 'center', fill: K.gold }) +
  pill('Eagles up. Let’s eat.', { left: 330, top: 380, size: 34, rot: -2 }));

add('telegram', TW, TH, '03', 'gn', (W, H) => {
  let s = layer('background:' + SKY.midnight);
  const R = rng(51);
  for (let i = 0; i < 70; i++) s += '<div style="position:absolute;left:' + R() * W + 'px;top:' + R() * H * 0.6 + 'px;width:' + (3 + R() * 5) + 'px;height:' + (3 + R() * 5) + 'px;border-radius:50%;background:' + K.cream + ';opacity:' + (0.4 + R() * 0.6) + '"></div>';
  s += '<div style="position:absolute;left:720px;top:110px;width:220px;height:220px;border-radius:50%;background:' + K.gold200 + ';border:8px solid ' + K.ink + ';box-shadow:inset -40px -10px 0 #E9C766"></div>';
  s += img(A('scenes/s7-rock.svg'), { left: 180, top: 640, width: 720 });
  s += img(A('scenes/s1-nest-back.svg'), { left: 210, top: 640, width: 540 }) + char('sibling', { left: 250, top: 500, width: 300 }) + char('runt', { left: 500, top: 590, width: 210 }) + img(A('scenes/s1-nest-front.svg'), { left: 190, top: 670, width: 580 });
  return s + hl('GN,\neagles.', { left: 70, top: 110, size: 170 }) + pill('Rest up. Big flight tomorrow.', { left: 80, top: 480, size: 30, rot: -2, bg: K.gold, fg: K.ink });
});

add('telegram', TW, TH, '04', 'eagles-gon-eat', (W, H) =>
  feastScene(W, H, { hx: 540, heroW: 680, spots: [[0.1, 0.9, 0.16], [0.9, 0.9, 0.17], [0.25, 0.76, 0.11], [0.77, 0.75, 0.11]], nConf: 30 }) +
  hl('Eagles\ngon eat.', { left: 0, right: 0, top: 60, size: 170, align: 'center', fill: K.gold }));

add('telegram', TW, TH, '05', 'we-eat-together', (W, H) => {
  let s = branchScene(W, H, { y: 1000, bird: 170, seed: 61, sunX: 820, n: 6 });
  s += branch('M -40 690 C 300 660 700 700 1120 670', 26).replace('{W}', W).replace('{H}', H);
  const R = rng(62);
  for (let i = 0; i < 6; i++) s += perch(90 + i * 180, 690, 150, { white: R() < 0.45, flip: i > 2 });
  return s + hl('We eat\ntogether.', { left: 0, right: 0, top: 70, size: 150, align: 'center' });
});

add('telegram', TW, TH, '06', 'missed-dive-again', (W, H) =>
  layer('background:' + SKY.feast) + scene('s5-water', { left: 0, top: 380, width: W, height: 700 }) +
  sprite('splash', { left: 620, top: 830, width: 360 }) + sprite('splash-ring', { left: 560, top: 960, width: 480 }) +
  sprite('salmon', { left: 690, top: 700, width: 200, rot: -30 }) +
  char('missing', { left: 150, top: 440, width: 560, z: 3 }) +
  hl('Missed?', { left: 0, right: 0, top: 70, size: 170, align: 'center', fill: K.bone }) +
  hl('Dive again.', { left: 0, right: 0, top: 250, size: 130, align: 'center', fill: K.gold }));

add('telegram', TW, TH, '07', 'king-of-the-sky', (W, H) =>
  kingScene(W, H, { hx: 530, rockW: 820, rockTop: 800, horizon: 720, sunR: 230, nFly: 6 }) +
  hl('King of\nthe sky.', { left: 0, right: 0, top: 70, size: 150, align: 'center', fill: K.gold }));

add('telegram', TW, TH, '08', 'nobody-sits-alone', (W, H) => {
  let s = layer('background:' + SKY.sunset) + scene('s4-back', { left: 0, top: 380, width: W, height: 700 });
  s += '<div style="position:absolute;left:640px;top:330px;width:380px;height:380px;border-radius:50%;background:#FBE08A;border:7px solid ' + K.ink + '"></div>';
  s += branch('M -40 860 C 300 830 700 880 1120 840', 34).replace('{W}', W).replace('{H}', H);
  s += perch(250, 856, 260, { white: true, flip: false }) + char('landed', { left: 380, top: 470, width: 380, z: 3 }) + perch(840, 850, 250, { flip: true });
  return s + hl('Nobody\nsits alone.', { left: 0, right: 0, top: 70, size: 150, align: 'center' });
});

add('telegram', TW, TH, '09', 'flock-up', (W, H) =>
  flockScene(W, H, { lx: 780, ly: 620, n: 16, dx: 70, dy: 46, fw: 140, heroW: 420 }) +
  hl('Flock up.', { left: 0, right: 0, top: 80, size: 190, align: 'center', fill: K.gold }) +
  pill('Everybody flies the same way', { left: 270, top: 290, size: 32, rot: -2 }));

add('telegram', TW, TH, '10', 'your-turn', (W, H) =>
  layer('background:' + SKY.night) + sunrise(540, 1100, 300, { noSun: true, rayOp: 0.3 }) +
  img(A('scenes/s1-nest-back.svg'), { left: 140, top: 760, width: 800 }) + char('scruffy', { left: 300, top: 360, width: 500 }) + img(A('scenes/s1-nest-front.svg'), { left: 110, top: 820, width: 860 }) +
  hl('Your turn.', { left: 0, right: 0, top: 70, size: 170, align: 'center', fill: K.gold }) +
  pill('Get out of the nest', { left: 330, top: 260, size: 40, rot: -2 }));

/* ---------- DexScreener headers (3:1, 1500×500). Wordmark up front, centred,
   no small print — they're shown small on phones. ---------- */
add('dexscreener', XW, XH, '01', 'king-center', (W, H) =>
  kingScene(W, H, { hx: 740, rockW: 520, rockTop: 370, horizon: 320, sunR: 140, nFly: 6 }) +
  hl('Eagles', { left: 60, top: 150, size: 150, fill: K.gold }) + hl('gon eat', { right: 60, top: 150, size: 150, fill: K.gold, align: 'right' }));

add('dexscreener', XW, XH, '02', 'wordmark-gold', (W, H) =>
  headPattern(W, H, { step: 130, seed: 5 }) +
  head(6, { left: 590, top: 10, width: 320, expr: 'proud', beak: 'grin' }) +
  hl('Eagles gon eat', { left: 0, right: 0, top: 300, size: 150, align: 'center' }));

add('dexscreener', XW, XH, '03', 'feast-wide', (W, H) =>
  feastScene(W, H, { hx: 750, heroW: 400, spots: [[0.06, 0.98, 0.24], [0.2, 0.9, 0.18], [0.33, 0.99, 0.2], [0.68, 0.99, 0.2], [0.82, 0.9, 0.18], [0.95, 0.98, 0.24]], nConf: 26 }) +
  hl('Eagles', { left: 60, top: 70, size: 140, fill: K.gold }) + hl('gon eat.', { right: 60, top: 70, size: 140, fill: K.gold, align: 'right' }));

add('dexscreener', XW, XH, '04', 'drone', (W, H) =>
  droneScene(W, H, { hero: [750, 270, 480], flock: [[330, 370, 140, 0], [1170, 370, 150, 1], [180, 140, 110, 1], [1320, 140, 110, 0], [520, 450, 100, 1], [990, 460, 100, 0], [60, 330, 90, 0], [1440, 330, 90, 1]], pos: '50% 40%' }) +
  hl('Eagles gon eat', { left: 0, right: 0, top: 26, size: 90, align: 'center' }));

add('dexscreener', XW, XH, '05', 'flock', (W, H) =>
  flockScene(W, H, { lx: 1000, ly: 290, n: 18, dx: 60, dy: 22, fw: 96, heroW: 280 }) +
  hl('Eagles gon eat', { left: 0, right: 0, top: 36, size: 110, align: 'center', fill: K.gold }));

add('dexscreener', XW, XH, '06', 'premium-dark', (W, H) =>
  layer('background:radial-gradient(ellipse at 50% 60%, #14295C 0%, #0A1734 50%, #050B1C 100%)') +
  sunrise(750, 330, 160, { noSun: true, rayOp: 0.24 }) +
  head(0, { left: 30, top: 110, width: 330, expr: 'hungry' }) + head(6, { left: 1140, top: 100, width: 340, expr: 'proud', beak: 'grin', flip: true }) +
  hl('Eagles\ngon eat', { left: 0, right: 0, top: 80, size: 160, align: 'center', fill: K.gold }));

add('dexscreener', XW, XH, '07', 'branch', (W, H) =>
  branchScene(W, H, { y: 460, bird: 124, seed: 71, sunX: 750, horizon: 330 }) +
  hl('Eagles gon eat', { left: 0, right: 0, top: 40, size: 120, align: 'center' }));

add('dexscreener', XW, XH, '08', 'sunrise-wordmark', (W, H) =>
  layer('background:' + SKY.dawn) + sunrise(750, 410, 170, { rayOp: 1 }) +
  art('s7-panorama', W, H, 0.47, 400) +
  hl('Eagles gon eat', { left: 0, right: 0, top: 70, size: 150, align: 'center', fill: K.gold }) + flyer(120, 60, 130, { white: true }) + flyer(1260, 90, 120, { flip: true, down: true }));

add('dexscreener', XW, XH, '09', 'tape', (W, H) =>
  layer('background:' + K.teal700) + sunrise(W / 2, H * 0.5, 120, { noSun: true, rayOp: 0.2 }) +
  tape(W, 60, -4, 'Eagles gon eat', K.gold, K.ink, 70) + tape(W, 300, 3, 'Eagles gon eat', K.salmon, K.ink, 70) +
  char('eating', { left: 590, top: 110, width: 330, z: 5 }));

add('dexscreener', XW, XH, '10', 'the-story', (W, H) => {
  let s = layer('background:' + K.ink);
  const poses = ['runt', 'scruffy', 'flying-determined', 'landed', 'eating', 'adult-white-head'];
  const skies = [SKY.storm, SKY.fog, SKY.dusk, SKY.sunset, SKY.feast, SKY.dawn];
  poses.forEach((p, i) => { s += panel(28 + i * 245, 120, 225, 350, layer('background:' + skies[i]) + char(p, { left: p === 'flying-determined' ? -10 : 10, top: p === 'flying-determined' ? 110 : 130, width: p === 'flying-determined' ? 250 : 200 }), [-1.5, 1, -1, 1.5, -1.2, 1][i]); });
  return s + hl('Eagles gon eat', { left: 0, right: 0, top: 14, size: 96, align: 'center', fill: K.gold });
});

/* ---------- Fomo banners (3:1, 1500×500). Louder: giant type, art bursting
   through. (Fomo doesn't publish a banner size; 3:1 is the common one.) ---------- */
add('fomo', XW, XH, '01', 'giant-type-feast', (W, H) =>
  layer('background:' + K.salmon) + sunrise(750, 250, 120, { noSun: true, rayOp: 0.35 }) +
  hl('Eagles\ngon eat.', { left: 80, top: 50, size: 190, fill: K.gold }) +
  char('eating', { left: 1000, top: 70, width: 420, z: 6 }) + confetti(W, H, 18, 13, { min: 26, span: 20 }));

add('fomo', XW, XH, '02', 'we-eat-together-bold', (W, H) =>
  layer('background:' + K.gold) + crowdGrid(W, H, { rows: 2, bird: 170, top: 250, seed: 81 }) +
  hl('We eat together.', { left: 0, right: 0, top: 50, size: 150, align: 'center' }));

add('fomo', XW, XH, '03', 'king-bold', (W, H) =>
  layer('background:' + K.deep900) + sunrise(1150, 300, 170, { rayOp: 0.75 }) +
  img(A('scenes/s7-rock.svg'), { left: 1150 - 0.3 * 520, top: 390 - 0.34 * 650, width: 520 }) +
  char('adult-white-head', { left: 1020, top: 110, width: 280, z: 3 }) +
  hl('King of\nthe sky.', { left: 70, top: 60, size: 176, fill: K.gold }));

add('fomo', XW, XH, '04', 'dive', (W, H) =>
  layer('background:' + K.teal) + scene('s5-water', { left: 0, top: 150, width: W, height: 350 }) +
  char('diving', { left: 980, top: -40, width: 460, z: 4 }) + sprite('splash', { left: 1060, top: 330, width: 300 }) +
  hl('Eagles\ngon eat.', { left: 70, top: 50, size: 180, fill: K.gold }));

add('fomo', XW, XH, '05', 'nobody-alone', (W, H) =>
  flockScene(W, H, { sky: 'linear-gradient(180deg,#FF7F6E 0%,#FFB547 60%,#FFE28A 100%)', lx: 1300, ly: 230, n: 20, dx: 64, dy: 20, fw: 100, heroW: 250 }) +
  hl('Nobody finds\nthe run alone.', { left: 70, top: 60, size: 128 }));

add('fomo', XW, XH, '06', 'head-burst', (W, H) =>
  layer('background:' + K.gold) + sunrise(260, 250, 120, { noSun: true, rayOp: 0.5 }) +
  head(6, { left: 70, top: 40, width: 380, expr: 'proud', beak: 'grin' }) +
  hl('Eagles\ngon eat.', { left: 520, top: 60, size: 186 }));

add('fomo', XW, XH, '07', 'we-aint-eaten-yet', (W, H) =>
  mudScene(W, H, { hx: 1130, heroW: 400 }) + hl('We ain’t\neaten yet.', { left: 70, top: 60, size: 170, fill: K.bone }));

add('fomo', XW, XH, '08', 'your-turn', (W, H) =>
  layer('background:' + SKY.night) + sunrise(1150, 560, 200, { noSun: true, rayOp: 0.3 }) +
  img(A('scenes/s1-nest-back.svg'), { left: 930, top: 390, width: 460 }) + char('scruffy', { left: 1010, top: 80, width: 330 }) + img(A('scenes/s1-nest-front.svg'), { left: 910, top: 410, width: 490 }) +
  hl('Your turn.', { left: 70, top: 50, size: 170, fill: K.gold }) + hl('Get out of the nest.', { left: 76, top: 250, size: 84 }));

add('fomo', XW, XH, '09', 'drone-bold', (W, H) =>
  droneScene(W, H, { hero: [1160, 260, 500], flock: [[900, 420, 120, 1], [1420, 430, 120, 0], [880, 110, 90, 0], [1430, 90, 90, 1]], pos: '70% 30%' }) +
  hl('Same river.\nSame way.', { left: 70, top: 60, size: 150, fill: K.fog }));

add('fomo', XW, XH, '10', 'sticker-wall', (W, H) => {
  let s = layer('background:' + K.teal700);
  const R = rng(91);
  const words = ['Eagles gon eat', 'We eat together', 'King of the sky', 'Flock up', 'Nobody sits alone', 'We ain’t eaten yet'];
  const cols = [[K.gold, K.ink], [K.salmon, K.ink], [K.bone, K.ink], [K.ink, K.gold], [K.teal300, K.ink], [K.gold200, K.ink]];
  const spots = [[50, 40], [60, 360], [1000, 40], [1010, 360], [40, 200], [990, 200]];
  spots.forEach((p, i) => { const c = cols[i % cols.length]; s += pill(words[i % words.length], { left: p[0], top: p[1], size: 34 + R() * 14, bg: c[0], fg: c[1], rot: (R() - 0.5) * 14, shadow: K.ink }); });
  s += sunrise(750, 250, 110, { noSun: true, rayOp: 0.25 }) + head(6, { left: 590, top: 60, width: 340, expr: 'proud', beak: 'grin', css: 'z-index:7' });
  return s;
});

/* ---------- Logos (1000×1000; transparent where it makes sense) ---------- */
const LW = 1000;
const ring = (bg, inner, o) => { o = o || {}; return '<div style="position:absolute;left:' + (o.pad || 40) + 'px;top:' + (o.pad || 40) + 'px;right:' + (o.pad || 40) + 'px;bottom:' + (o.pad || 40) + 'px;border-radius:50%;background:' + bg + ';border:' + (o.border || 34) + 'px solid ' + K.ink + ';overflow:hidden;box-shadow:0 22px 0 ' + (o.drop || 'rgba(23,17,13,0.35)') + '">' + inner + '</div>'; };

add('logo', LW, LW, '01', 'king-badge', () =>
  ring(K.gold, sunrise(460, 520, 120, { noSun: true, rayOp: 0.55 }) + head(6, { left: 90, top: 150, width: 640, expr: 'proud', beak: 'grin' })), { transparent: true });

add('logo', LW, LW, '02', 'scruffy-badge', () =>
  ring(K.teal, sunrise(460, 520, 120, { noSun: true, rayOp: 0.3 }) + head(0, { left: 90, top: 150, width: 640, expr: 'hungry' })), { transparent: true });

add('logo', LW, LW, '03', 'stacked-lockup', () =>
  head(6, { left: 250, top: 20, width: 500, expr: 'proud', beak: 'grin' }) +
  hl('Eagles\ngon eat', { left: 0, right: 0, top: 560, size: 190, align: 'center', fill: K.gold, lh: 0.9 }), { transparent: true });

add('logo', LW, LW, '04', 'sticker', () =>
  '<div style="position:absolute;inset:0;filter:drop-shadow(0 0 0 #fff) drop-shadow(14px 0 0 #fff) drop-shadow(-14px 0 0 #fff) drop-shadow(0 14px 0 #fff) drop-shadow(0 -14px 0 #fff) drop-shadow(0 18px 0 rgba(23,17,13,.35));transform:rotate(-6deg)">' +
  head(0, { left: 110, top: 130, width: 760, expr: 'hungry', beak: 'grin' }) + '</div>', { transparent: true });

add('logo', LW, LW, '05', 'sunrise-badge', () =>
  ring(SKY.dawn, sunrise(500, 700, 160, { rayOp: 0.95 }) + img(A('scenes/s7-panorama.svg'), { left: -200, top: 560, width: 1300, height: 400, css: 'object-fit:cover;object-position:50% 100%' }) + char('adult-white-head', { left: 330, top: 280, width: 330 })), { transparent: true });

add('logo', LW, LW, '06', 'wordmark-horizontal', () =>
  head(6, { left: 20, top: 250, width: 380, expr: 'proud', beak: 'grin' }) +
  hl('Eagles\ngon eat', { left: 400, top: 330, size: 124, fill: K.gold, lh: 0.9, css: 'white-space:nowrap' }), { transparent: true });

add('logo', LW, LW, '07', 'round-seal', () => {
  const text = 'EAGLES GON EAT ★ WE EAT TOGETHER ★ ';
  let s = '<svg style="position:absolute;inset:0" viewBox="0 0 1000 1000"><defs><path id="c" d="M 500 500 m -370 0 a 370 370 0 1 1 740 0 a 370 370 0 1 1 -740 0"/></defs>' +
    '<circle cx="500" cy="500" r="470" fill="' + K.ink + '"/><circle cx="500" cy="500" r="455" fill="' + K.gold + '"/><circle cx="500" cy="500" r="300" fill="' + K.ink + '"/>' +
    '<text font-family="Luckiest Guy" font-size="92" fill="' + K.ink + '" letter-spacing="6"><textPath href="#c" textLength="2300">' + text + '</textPath></text></svg>';
  s += '<div style="position:absolute;left:210px;top:210px;width:580px;height:580px;border-radius:50%;overflow:hidden;background:' + K.salmon + '">' + sunrise(290, 330, 90, { noSun: true, rayOp: 0.4 }) + head(6, { left: 70, top: 80, width: 440, expr: 'proud', beak: 'grin' }) + '</div>';
  return s;
}, { transparent: true });

add('logo', LW, LW, '08', 'fish-badge', () =>
  ring(K.salmon, sunrise(460, 520, 120, { noSun: true, rayOp: 0.35 }) + char('eating', { left: 150, top: 90, width: 640 })), { transparent: true });

add('logo', LW, LW, '09', 'app-icon', () =>
  '<div style="position:absolute;inset:0;border-radius:220px;background:' + K.ink + ';overflow:hidden">' + sunrise(500, 560, 150, { noSun: true, rayOp: 0.28 }) + head(6, { left: 150, top: 210, width: 580, expr: 'proud', beak: 'grin' }) + '</div>', { transparent: true });

add('logo', LW, LW, '10', 'drone-badge', () =>
  ring('#6E7257 url(' + A('scenes/s3-ground.svg') + ') 50% 50%/1500px auto', '<img src="' + A('characters/flying-topdown.svg') + '" style="position:absolute;left:30px;top:250px;width:860px">'), { transparent: true });

/* ================================================================== RENDER */
async function main() {
  let chromium;
  try { chromium = require('playwright').chromium; } catch (e) { chromium = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright').chromium; }
  const list = D.filter((d) => !ONLY || d.set === ONLY);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const tmp = path.join(__dirname, '_page.html');
  const manifest = [];
  for (const d of list) {
    const inner = d.html(d.w, d.h);
    const html = '<!doctype html><meta charset="utf-8"><style>' + CSS + '</style><div class="stage" id="s" style="width:' + d.w + 'px;height:' + d.h + 'px">' + inner + '</div>';
    fs.writeFileSync(tmp, html);
    await page.setViewportSize({ width: d.w, height: d.h });
    await page.goto('file://' + tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(120);
    const dir = path.join(OUT, d.set);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, d.id + '-' + d.name + '-' + d.w + 'x' + d.h + '@2x.png');
    await page.locator('#s').screenshot({ path: file, omitBackground: !!d.transparent });
    manifest.push({ set: d.set, file: path.relative(__dirname, file), w: d.w, h: d.h, name: d.name });
    process.stdout.write('.');
  }
  fs.unlinkSync(tmp);
  if (!ONLY) fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
  console.log('\nRendered ' + list.length + ' images into brand/out/');
}

main().catch((e) => { console.error(e); process.exit(1); });
