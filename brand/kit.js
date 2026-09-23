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
