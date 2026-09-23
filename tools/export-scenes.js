#!/usr/bin/env node
/*
 * Writes the scene background layers (assets/scenes/) and flock sprites
 * (assets/sprites/) using the same drawing vocabulary as the character rig.
 *
 *   node tools/export-scenes.js
 *
 * Not a build step — the site only reads the SVG files this writes.
 * Art rules: flat fills, thick ink outlines, no gradients (skies are CSS).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { draw, COLORS: C } = require('../js/eagle.js');
const { smooth, fluff, blob, rng, r1 } = draw;

const root = path.join(__dirname, '..');
const sceneDir = path.join(root, 'assets', 'scenes');
const spriteDir = path.join(root, 'assets', 'sprites');
fs.mkdirSync(sceneDir, { recursive: true });
fs.mkdirSync(spriteDir, { recursive: true });

const INK = C.ink;
const T = {
  storm900: '#1B2330', storm700: '#2E3A4B', storm500: '#4A5A6E', storm300: '#7D8A9A',
  fog200: '#B3BCC5', fog100: '#D9DFE4', mud700: '#4B3F33', mud500: '#6F604F', mud300: '#9A8A75',
  cream: '#FFF6E4', gold200: '#FFE28A',
};

const svg = (w, h, body, extra) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"' + (extra || '') + ' aria-hidden="true">' + body + '</svg>\n';
const fillInk = (d, fill, w) => '<path d="' + d + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (w || 6) + '" stroke-linejoin="round"/>';
const flat = (d, fill, op) => '<path d="' + d + '" fill="' + fill + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
const line = (d, color, w, op) => '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
// A stick: ink under-stroke + colour over-stroke (one clean outline)
const sticks = (list, color, w) => {
  const d = list.map((s) => 'M ' + r1(s[0]) + ' ' + r1(s[1]) + ' L ' + r1(s[2]) + ' ' + r1(s[3])).join(' ');
  return line(d, INK, w + 9) + line(d, color, w);
};

// Ridge/hill silhouettes that tile seamlessly horizontally (periodic in `period`).
function ridge(period, base, amps, seed, sharp, bottom, x0, x1) {
  const R = rng(seed);
  const waves = amps.map((a, i) => ({ a, k: i + 1 + Math.floor(R() * 2), ph: R() * Math.PI * 2 }));
  const pts = [];
  const step = 40;
  for (let x = x0; x <= x1; x += step) {
    let y = base;
    waves.forEach((w) => {
      const s = Math.sin((x / period) * Math.PI * 2 * w.k + w.ph);
      y -= w.a * (sharp ? 1 - Math.abs(s) * 1.6 + 0.6 : s);
    });
    pts.push([x, y]);
  }
  return smooth([[x0, bottom, 'c']].concat(pts, [[x1, bottom, 'c']]));
}

// A cartoon cloud: a row of fluffy lobes on a flat-ish bottom.
function cloud(cx, cy, w, h, seed) {
  return fluff(cx, cy, w / 2, h / 2, 9, 0.16, seed);
}

// Tiny bare tree for the far hills
function bareTree(x, y, s, seed) {
  const R = rng(seed);
  const L = [[x, y, x + (R() - 0.5) * 6 * s, y - 60 * s]];
  const top = L[0];
  for (let i = 0; i < 4; i++) {
    const t = 0.35 + i * 0.16;
    const bx = x + (top[2] - x) * t, by = y + (top[3] - y) * t;
    const dir = i % 2 ? 1 : -1;
    L.push([bx, by, bx + dir * (14 + R() * 12) * s, by - (12 + R() * 14) * s]);
  }
  return L;
}

const files = {};

/* ------------------------------------------------------------------ SCENE 1 */
{
  // Back: storm clouds + two mountain ranges
  let b = '';
  [[260, 170, 520, 170, 1], [820, 120, 640, 190, 2], [1380, 190, 560, 170, 3], [560, 330, 480, 130, 4], [1180, 340, 520, 140, 5]].forEach((c, i) => {
    b += fillInk(cloud(c[0], c[1], c[2], c[3], 100 + c[4]), i < 3 ? '#2A3546' : '#354357', 6);
  });
  b += fillInk(ridge(1600, 690, [60, 34, 18], 11, true, 1010, -40, 1640), '#263142', 6);
  b += fillInk(ridge(1600, 800, [40, 26, 12], 12, true, 1010, -40, 1640), '#1E2735', 6);
  files['scenes/s1-back.svg'] = svg(1600, 1000, b, ' preserveAspectRatio="xMidYMax slice"');

  // Lightning bolt (flashes on scroll)
  const bolt = 'M 150 0 L 88 250 L 150 238 L 70 520 L 224 190 L 158 206 L 226 0 Z';
  files['scenes/s1-bolt.svg'] = svg(300, 540, flat(bolt, T.gold200, 0.55).replace('d="', 'transform="translate(-10 -6) scale(1.08)" d="') + fillInk(bolt, T.cream, 6));

  // The cliff, with a ledge for the nest at ~(300, 330)
  const cliff = smooth([[0, 1000, 'c'], [34, 800], [88, 600], [62, 450], [120, 360], [300, 336], [500, 344], [560, 296], [600, 140], [660, 30], [800, -10, 'c'], [800, 1000, 'c']]);
  let c = fillInk(cliff, '#3C4553', 7);
  const face = smooth([[0, 1000, 'c'], [34, 800], [88, 600], [62, 450], [120, 380], [180, 520], [150, 720], [190, 1000, 'c']]);
  c += flat(face, '#313946');
  c += line('M 240 420 l 30 60 l -18 40 M 420 470 l -20 70 l 26 50 M 640 300 l 30 90 M 330 700 l 40 60 l -10 60 M 560 620 l -30 80', INK, 4);
  c += fillInk(cliff, 'none', 7);
  // dead grass on the ledge
  [[160, 350], [470, 352], [520, 342]].forEach((p, i) => {
    c += line('M ' + p[0] + ' ' + p[1] + ' q -6 -26 -18 -34 M ' + p[0] + ' ' + p[1] + ' q 2 -30 10 -40 M ' + p[0] + ' ' + p[1] + ' q 12 -18 26 -22', INK, 9) + line('M ' + p[0] + ' ' + p[1] + ' q -6 -26 -18 -34 M ' + p[0] + ' ' + p[1] + ' q 2 -30 10 -40 M ' + p[0] + ' ' + p[1] + ' q 12 -18 26 -22', T.mud300, 4);
  });
  // scraggly dead branch sticking out of the rock
  c += sticks([[610, 190, 700, 100], [650, 150, 640, 90], [680, 118, 730, 104]], '#5E4330', 12);
  files['scenes/s1-cliff.svg'] = svg(800, 1000, c);

  // Nest — back half (behind the chicks) and front lip (in front of them)
  const R = rng(7);
  let nb = fillInk(smooth([[40, 150], [80, 96], [250, 70], [420, 96], [460, 150], [250, 170]]), '#4A3423', 7);
  const back = [];
  for (let i = 0; i < 16; i++) {
    const x = 60 + R() * 380, y = 84 + R() * 40, a = (R() - 0.5) * 1.4, L = 70 + R() * 70;
    back.push([x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2 - 10, x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2 - 10]);
  }
  nb += sticks(back, '#6B4B33', 9);
  files['scenes/s1-nest-back.svg'] = svg(500, 230, nb);

  let nf = fillInk(smooth([[10, 120], [60, 110], [250, 128], [440, 110], [492, 124], [470, 190], [380, 222], [250, 228], [120, 222], [30, 190]]), '#5E4330', 7);
  const front = [];
  for (let i = 0; i < 22; i++) {
    const x = 30 + R() * 440, y = 130 + R() * 80, a = (R() - 0.5) * 1.1 + (R() < 0.2 ? 1.2 : 0), L = 80 + R() * 110;
    front.push([x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2, x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2]);
  }
  nf += sticks(front, '#7C5B41', 9);
  nf += sticks([[-10, 150, 90, 120], [410, 116, 510, 84], [200, 216, 150, 250]], '#6B4B33', 8); // wrong-angle sticks
  files['scenes/s1-nest-front.svg'] = svg(500, 260, nf, ' overflow="visible"');

  // Rain — seamless diagonal tile: thin, soft streaks (the layer's opacity does the rest)
  let rain = '';
  const RR = rng(21);
  for (let i = 0; i < 14; i++) {
    const x = RR() * 240, y = RR() * 240, L = 34 + RR() * 40, w = 1.6 + RR() * 1.2;
    for (const ox of [-240, 0, 240]) for (const oy of [-240, 0, 240]) {
      rain += line('M ' + r1(x + ox) + ' ' + r1(y + oy) + ' l ' + r1(-L * 0.3) + ' ' + r1(L), T.fog100, r1(w), r1(0.45 + RR() * 0.35));
    }
  }
  files['scenes/s1-rain.svg'] = svg(240, 240, rain);

  // Wind-blown leaf
  files['scenes/leaf.svg'] = svg(40, 40, fillInk('M 20 3 C 32 12 33 28 20 37 C 7 28 8 12 20 3 Z', '#6F604F', 3.5) + line('M 20 7 L 20 40', INK, 3));
}

/* ------------------------------------------------------------------ SCENE 2 */
{
  let b = '';
  b += fillInk(ridge(1600, 470, [26, 14], 31, false, 620, -40, 1640), '#8A96A5', 6);
  b += fillInk(ridge(1600, 515, [18, 10], 32, false, 620, -40, 1640), '#7A8697', 6);
  b += fillInk('M -20 560 L 1620 560 L 1620 1010 L -20 1010 Z', '#A9B3BE', 6);
  b += line('M 120 590 l 140 0 M 520 610 l 220 0 M 1040 588 l 160 0 M 1320 604 l 120 0', T.fog100, 5);
  [[300, 470, 420, 40], [1100, 450, 520, 46], [760, 520, 380, 30]].forEach((f, i) => { b += flat(blob(f[0], f[1], f[2] / 2, f[3] / 2, 8, 0.12, 40 + i), T.fog100, 0.55); });
  files['scenes/s2-back.svg'] = svg(1600, 1000, b, ' preserveAspectRatio="xMidYMax slice"');

  // Mud plane — sits on the bottom 45% of the screen
  let m = fillInk(smooth([[-40, 60], [300, 36], [700, 56], [1100, 30], [1640, 58], [1640, 560, 'c'], [-40, 560, 'c']]), T.mud500, 7);
  const R = rng(33);
  for (let i = 0; i < 14; i++) m += flat(blob(R() * 1600, 110 + R() * 380, 40 + R() * 90, 10 + R() * 22, 8, 0.2, 50 + i), i % 3 ? T.mud700 : T.mud300, i % 3 ? 0.55 : 0.5);
  [[330, 170, 120, 26], [1180, 250, 170, 34], [760, 420, 110, 22]].forEach((p, i) => {
    m += fillInk(blob(p[0], p[1], p[2], p[3], 10, 0.12, 60 + i), '#9AA5B1', 5);
    m += line('M ' + (p[0] - p[2] * 0.5) + ' ' + (p[1] - 4) + ' l ' + p[2] * 0.4 + ' 0', T.fog100, 5);
  });
  // his footprints wandering across the mud
  for (let i = 0; i < 9; i++) {
    const x = 180 + i * 120, y = 330 + Math.sin(i * 0.9) * 60 + (i % 2) * 26;
    m += line('M ' + x + ' ' + y + ' l -14 -18 M ' + x + ' ' + y + ' l 0 -22 M ' + x + ' ' + y + ' l 14 -18 M ' + x + ' ' + y + ' l 0 10', T.mud700, 5);
  }
  files['scenes/s2-mud.svg'] = svg(1600, 560, m, ' preserveAspectRatio="xMidYMin slice"');

  // The scraps — something already dead (cartoon, not gory)
  let f = fillInk('M 30 80 C 60 40 160 34 214 60 L 258 34 L 250 74 L 270 110 L 218 94 C 170 118 70 120 30 80 Z', '#8F9A8B', 6);
  f += flat('M 60 90 C 110 104 170 104 210 90 C 170 112 90 114 60 90 Z', '#B7C0B2');
  f += fillInk('M 110 48 q 12 -16 24 0 q 12 -16 24 0 q 10 -14 22 0 L 180 60 L 110 60 Z', '#6F604F', 4); // a bite taken
  f += line('M 120 66 l 0 22 M 140 64 l 0 26 M 160 64 l 0 24', INK, 3.5);
  f += line('M 50 68 l 12 12 M 62 68 l -12 12', INK, 4); // x eye
  [[70, 18], [96, 4], [180, 14]].forEach((p) => { f += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + INK + '"/>' + '<ellipse cx="' + (p[0] + 5) + '" cy="' + (p[1] - 5) + '" rx="5" ry="3" fill="#E9EEF2" stroke="' + INK + '" stroke-width="2"/>'; });
  files['scenes/s2-scraps.svg'] = svg(280, 130, f, ' overflow="visible"');

  // Front: reeds + mud clumps in the corners
  let fr = '';
  const reeds = (x0, n, seed, dir) => {
    const RR = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 26 * dir + RR() * 10, h = 220 + RR() * 220, bend = (RR() - 0.5) * 80;
      const d = 'M ' + r1(x) + ' 1010 q ' + r1(bend * 0.3) + ' ' + r1(-h * 0.5) + ' ' + r1(bend) + ' ' + r1(-h);
      s += line(d, INK, 15) + line(d, i % 2 ? T.mud300 : '#8A7B66', 7);
      if (RR() < 0.5) s += fillInk(blob(x + bend, 1010 - h + 8, 9, 26, 6, 0.1, seed + i), T.mud700, 4);
    }
    return s;
  };
  fr += reeds(40, 9, 70, 1) + reeds(1560, 8, 71, -1);
  fr += fillInk(blob(120, 990, 200, 70, 9, 0.18, 72), T.mud700, 7) + fillInk(blob(1500, 1000, 220, 80, 9, 0.18, 73), T.mud700, 7);
  files['scenes/s2-front.svg'] = svg(1600, 1000, fr, ' preserveAspectRatio="xMidYMax slice"');
}

/* ------------------------------------------------------------------ SCENE 3 — the drone shot (tiles vertically) */
{
  // Looking straight down at a river valley at dusk. The tile is periodic in y,
  // so scenes.js scrolls it downward forever while he flies up the screen.
  const S = 1000, SW = 1600; // periodic in y (S); wide enough that it never repeats sideways
  const P = {
    land: '#6E7257', landDark: '#5B5F47', landLight: '#838769', sand: '#B59A7C', sandDark: '#9A8166',
    river: '#3F6F79', deep: '#335E68', ripple: '#9CC3C2', foam: '#E9EEF2',
    tree: '#48543F', treeDark: '#3A4533', treeHi: '#62704F', rock: '#7D8A9A',
    fish: '#E98470', fishDark: '#B85A4C',
  };
  const TAU = Math.PI * 2;
  const cx = (y) => 800 + 105 * Math.sin((TAU * y) / S) + 32 * Math.sin((2 * TAU * y) / S + 1.1);
  const half = (y) => 84 + 16 * Math.sin((2 * TAU * y) / S + 0.5);
  const band = (extra) => {
    const L = [], R = [];
    for (let y = -60; y <= S + 60; y += 10) {
      L.push(r1(cx(y) - half(y) - extra) + ' ' + y);
      R.push(r1(cx(y) + half(y) + extra) + ' ' + y);
    }
    return 'M ' + L.join(' L ') + ' L ' + R.reverse().join(' L ') + ' Z';
  };
  const wrap = (y, fn) => [-S, 0, S].map((o) => (y + o > -120 && y + o < S + 120 ? fn(y + o) : '')).join('');
  const R = rng(303);
  let g = '<rect x="0" y="0" width="' + SW + '" height="' + S + '" fill="' + P.land + '"/>';
  // fields and meadows
  for (let i = 0; i < 26; i++) {
    const x = R() * SW, y = R() * S, w = 60 + R() * 120, h = 40 + R() * 90, c = i % 3 ? P.landDark : P.landLight, seed = 330 + i;
    g += wrap(y, (yy) => flat(blob(x, yy, w, h, 9, 0.2, seed), c, 0.7));
  }
  // grass tufts
  let tufts = '';
  for (let i = 0; i < 110; i++) {
    const x = R() * SW, y = R() * S;
    if (Math.abs(x - cx(y)) < half(y) + 40) continue;
    tufts += wrap(y, (yy) => 'M ' + r1(x) + ' ' + r1(yy) + ' l -5 -9 M ' + r1(x + 5) + ' ' + r1(yy) + ' l 0 -11 M ' + r1(x + 10) + ' ' + r1(yy) + ' l 5 -9 ');
  }
  g += line(tufts, P.landDark, 3);
  // sandbanks, then the river with a deeper channel
  g += fillInk(band(26), P.sand, 5) + flat(band(14), P.sandDark, 0.35);
  g += fillInk(band(0), P.river, 5);
  const ch = [];
  for (let y = -60; y <= S + 60; y += 10) ch.push(r1(cx(y) + 10 * Math.sin((TAU * y) / S * 3)) + ' ' + y);
  g += line('M ' + ch.join(' L '), P.deep, 46, 0.8);
  // ripples across the current
  let rip = '';
  for (let y = 10; y < S; y += 34) {
    const x = cx(y) + (R() - 0.5) * half(y) * 1.1, w = 16 + R() * 20;
    rip += wrap(y, (yy) => 'M ' + r1(x - w) + ' ' + r1(yy) + ' q ' + r1(w / 2) + ' -7 ' + r1(w) + ' 0 q ' + r1(w / 2) + ' 7 ' + r1(w) + ' 0 ');
  }
  g += line(rip, P.ripple, 3, 0.75);
  // rocks with foam
  [[0.12, -0.55], [0.47, 0.5], [0.81, -0.35]].forEach((k, i) => {
    const y = k[0] * S, x = cx(y) + k[1] * half(y);
    g += wrap(y, (yy) => line('M ' + r1(x - 22) + ' ' + r1(yy + 18) + ' q 22 -34 44 0', P.foam, 5, 0.9) + fillInk(blob(x, yy, 16, 12, 7, 0.2, 360 + i), P.rock, 4));
  });
  // salmon heading upriver — the same way he is
  const fish = (x, y, s, a) =>
    '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(a) + ') scale(' + s + ')">' +
    line('M -12 30 l 12 -10 l 12 10', P.ripple, 3, 0.9) +
    fillInk('M 0 -22 C 9 -22 11 -6 9 6 C 8 14 4 18 0 20 C -4 18 -8 14 -9 6 C -11 -6 -9 -22 0 -22 Z', P.fish, 3) +
    fillInk('M 0 18 L -10 32 L 0 28 L 10 32 Z', P.fishDark, 3) +
    flat('M 0 -18 C 3 -10 3 4 0 14 C -3 4 -3 -10 0 -18 Z', P.fishDark, 0.6) +
    '</g>';
  for (let i = 0; i < 14; i++) {
    const y = (i + R() * 0.6) * (S / 14), x = cx(y) + (R() - 0.5) * half(y) * 1.2;
    const slope = cx(y - 10) - cx(y + 10);
    const a = (Math.atan2(slope, 20) * 180) / Math.PI + (R() - 0.5) * 16;
    g += wrap(y, (yy) => fish(x, yy, 1.25 + R() * 0.4, a));
  }
  // trees seen from above: round crowns with a highlight, clumped along the banks
  const crowns = [];
  let tries = 0;
  while (crowns.length < 90 && tries++ < 4000) {
    const y = R() * S, side = R() < 0.5 ? -1 : 1, off = half(y) + 56 + Math.pow(R(), 1.4) * 700;
    const x = cx(y) + side * off, r = 20 + R() * 20;
    if (x < -20 || x > SW + 20) continue;
    if (crowns.some((c) => Math.hypot(c[0] - x, c[1] - y) < c[2] + r - 6)) continue;
    crowns.push([x, y, r, 380 + crowns.length]);
  }
  crowns.sort((a, b) => a[1] - b[1]).forEach((c) => {
    g += wrap(c[1], (yy) => fillInk(fluff(c[0], yy, c[2], c[2], 7, 0.18, c[3]), c[2] > 32 ? P.treeDark : P.tree, 4) + flat(blob(c[0] - c[2] * 0.25, yy - c[2] * 0.25, c[2] * 0.45, c[2] * 0.35, 6, 0.2, c[3] + 50), P.treeHi, 0.8));
  });
  files['scenes/s3-ground.svg'] = svg(SW, S, g);

  // Cloud wisps drifting below him — soft, no outline, tile vertically.
  let wisps = '';
  [[260, 160, 190, 60], [1240, 420, 240, 70], [420, 720, 170, 50], [1380, 900, 150, 46]].forEach((c, i) => {
    wisps += wrap(c[1], (yy) => flat(fluff(c[0], yy, c[2], c[3], 8, 0.2, 390 + i), '#EEF1F4', 0.9) + flat(fluff(c[0] + c[2] * 0.3, yy + c[3] * 0.5, c[2] * 0.6, c[3] * 0.6, 7, 0.2, 395 + i), '#FFFFFF', 0.6));
  });
  files['scenes/s3-wisps.svg'] = svg(SW, S, wisps);

  // The flock from above: wings and body are separate files so the wings can
  // flap on the compositor (scaleX) while the body stays still.
  const TD = require('../js/eagle.js').renderTopDown;
  const strip = (x) => x.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const tdFile = (o) => svg(424, 280, '<g transform="translate(212 125)">' + strip(TD(o)) + '</g>');
  files['sprites/topdown-wings-brown.svg'] = tdFile({ part: 'wings' });
  files['sprites/topdown-wings-white.svg'] = tdFile({ part: 'wings', white: true });
  files['sprites/topdown-body-brown.svg'] = tdFile({ part: 'body' });
  files['sprites/topdown-body-white.svg'] = tdFile({ part: 'body', white: true });
}


/* ------------------------------------------------------------------ SCENES 4 + 5 (warm) */
const WARM = {
  amber: '#F2991E', amberDark: '#C9701A', rust: '#A9571C', gold: '#FFC83A', gold200: '#FFE28A', cream: '#FFF6E4',
  teal700: '#0D5C5A', teal500: '#16968E', teal300: '#5CC8BA', salmon: '#FF7F6E', salmonDark: '#DE5A4B', salmonLight: '#FFC2B2',
  bank: '#7A5A3A', bankDark: '#5E4330', snow: '#FFF6E4', bark: '#4A3423',
};

// A distant tree packed with perched eagles (tiny brown bodies, some white heads).
function crowdTree(x, y, s, seed, whiteShare) {
  const R = rng(seed);
  const L = bareTree(x, y, s, seed);
  let out = sticks(L, WARM.bark, 5 * s);
  L.slice(1).forEach((b) => {
    for (let i = 0; i < 3; i++) {
      const t = 0.25 + i * 0.3 + R() * 0.1;
      const bx = b[0] + (b[2] - b[0]) * t, by = b[1] + (b[3] - b[1]) * t;
      out += '<ellipse cx="' + r1(bx) + '" cy="' + r1(by - 6 * s) + '" rx="' + r1(4.5 * s) + '" ry="' + r1(6.5 * s) + '" fill="#5A3A24" stroke="' + INK + '" stroke-width="' + r1(1.6 * s) + '"/>';
      const white = R() < whiteShare;
      out += '<circle cx="' + r1(bx + 1 * s) + '" cy="' + r1(by - 13 * s) + '" r="' + r1(3.4 * s) + '" fill="' + (white ? WARM.cream : '#6B4128') + '" stroke="' + INK + '" stroke-width="' + r1(1.4 * s) + '"/>';
    }
  });
  return out;
}

{
  // SCENE 4 back: low winter sun, warm hills, far bank crowded with eagles, the wide river
  let b = '<circle cx="1180" cy="470" r="150" fill="' + WARM.gold200 + '" stroke="' + INK + '" stroke-width="6"/>';
  b += fillInk(ridge(1600, 540, [40, 22, 10], 61, false, 1010, -40, 1640), WARM.amberDark, 6);
  b += fillInk(ridge(1600, 600, [22, 12], 62, false, 1010, -40, 1640), WARM.rust, 6);
  const R = rng(63);
  for (let i = 0; i < 16; i++) b += crowdTree(40 + i * 102 + R() * 30, 640 - R() * 14, 0.9 + R() * 0.5, 64 + i, 0.4);
  b += fillInk('M -20 648 L 1620 648 L 1620 1010 L -20 1010 Z', WARM.teal500, 6);
  b += line('M 80 700 l 180 0 M 420 740 l 260 0 M 900 700 l 200 0 M 1250 760 l 240 0 M 200 820 l 220 0 M 760 860 l 300 0 M 1180 900 l 200 0', WARM.teal300, 7);
  b += line('M 1060 690 l 120 0 M 1110 720 l 80 0', WARM.gold200, 7); // sun on the water
  files['scenes/s4-back.svg'] = svg(1600, 1000, b, ' preserveAspectRatio="xMidYMax slice"');

  // SCENE 4 front: the near bank — old snow, dead grass, a broken stick
  let f = fillInk(smooth([[-40, 860], [300, 840], [700, 870], [1100, 846], [1640, 866], [1640, 1010, 'c'], [-40, 1010, 'c']]), WARM.bank, 7);
  [[160, 900, 120, 22], [640, 930, 160, 24], [1320, 910, 140, 22]].forEach((p, i) => { f += fillInk(blob(p[0], p[1], p[2], p[3], 9, 0.18, 70 + i), WARM.snow, 5); });
  for (let i = 0; i < 22; i++) {
    const x = 30 + i * 74 + R() * 20, y = 866 + Math.sin(i) * 10;
    f += line('M ' + r1(x) + ' ' + r1(y) + ' q -6 -26 -16 -34 M ' + r1(x) + ' ' + r1(y) + ' q 5 -30 12 -38', INK, 9) + line('M ' + r1(x) + ' ' + r1(y) + ' q -6 -26 -16 -34 M ' + r1(x) + ' ' + r1(y) + ' q 5 -30 12 -38', '#C49A5E', 4);
  }
  files['scenes/s4-front.svg'] = svg(1600, 1000, f, ' preserveAspectRatio="xMidYMax slice"');

  // SCENE 5 back: salmon-pink sky side — far bank, every tree full
  let b5 = fillInk(ridge(1600, 470, [34, 18], 81, false, 1010, -40, 1640), '#E0735F', 6);
  b5 += fillInk(ridge(1600, 520, [20, 12], 82, false, 1010, -40, 1640), '#C4563F', 6);
  const R5 = rng(83);
  for (let i = 0; i < 20; i++) b5 += crowdTree(20 + i * 82 + R5() * 24, 560 - R5() * 12, 0.8 + R5() * 0.5, 84 + i, 0.45);
  files['scenes/s5-back.svg'] = svg(1600, 1000, b5, ' preserveAspectRatio="xMidYMax slice"');

  // SCENE 5 water: the shallows where the salmon run
  let w = fillInk(smooth([[-40, 560], [400, 548], [800, 566], [1200, 546], [1640, 560], [1640, 1010, 'c'], [-40, 1010, 'c']]), WARM.teal500, 7);
  w += line('M 60 620 l 200 0 M 520 640 l 240 0 M 980 610 l 220 0 M 1300 660 l 200 0 M 180 760 l 260 0 M 700 800 l 300 0 M 1180 780 l 260 0 M 360 920 l 280 0 M 980 940 l 300 0', WARM.teal300, 8);
  [[240, 700, 90, 36], [1330, 720, 110, 40], [820, 900, 130, 44], [120, 930, 100, 40], [1500, 940, 120, 46]].forEach((r, i) => {
    w += fillInk(blob(r[0], r[1], r[2], r[3], 9, 0.14, 90 + i), '#6F604F', 6);
    w += flat(blob(r[0] - r[2] * 0.25, r[1] - r[3] * 0.35, r[2] * 0.4, r[3] * 0.25, 7, 0.2, 95 + i), '#9A8A75');
    w += line('M ' + (r[0] - r[2] - 20) + ' ' + (r[1] + r[3] * 0.6) + ' q ' + (r[2] + 20) + ' 18 ' + (2 * r[2] + 40) + ' 0', WARM.cream, 6);
  });
  files['scenes/s5-water.svg'] = svg(1600, 1000, w, ' preserveAspectRatio="xMidYMax slice"');
}


/* ------------------------------------------------------------------ SCENES 6 + 7 (home) */
{
  const HOME = { deep900: '#0A1734', deep700: '#14295C', deep500: '#23448F', cream: '#FBE2B6', bone: '#FFFDF6', teal: '#16968E', tealDark: '#0D5C5A' };
  // SCENE 6: the valley below at first light — the river he'll come back to
  let b = fillInk(ridge(1600, 560, [40, 20, 10], 101, false, 1010, -40, 1640), '#1D3A73', 6);
  b += fillInk(ridge(1600, 650, [30, 16], 102, false, 1010, -40, 1640), HOME.deep700, 6);
  b += fillInk('M -20 760 C 300 720 520 800 800 770 C 1080 740 1300 790 1620 752 L 1620 850 C 1300 880 1080 830 800 860 C 520 890 300 812 -20 846 Z', HOME.teal, 6);
  b += line('M 120 790 l 160 0 M 620 808 l 200 0 M 1120 786 l 180 0', HOME.cream, 6);
  b += fillInk(ridge(1600, 900, [18, 10], 103, false, 1010, -40, 1640), HOME.deep900, 6);
  // lifted so the river (and the eagles that land on it) sits above the docked timeline
  b = '<g transform="translate(0 -250)">' + b + '</g>' + fillInk('M -20 740 L 1620 740 L 1620 1010 L -20 1010 Z', HOME.deep900, 6);
  files['scenes/s6-back.svg'] = svg(1600, 1000, b, ' preserveAspectRatio="xMidYMax slice"');

  // SCENE 7: the whole river at sunrise — thousands of them
  const R = rng(111);
  let pano = fillInk(ridge(1600, 470, [26, 14], 112, false, 1010, -40, 1640), '#E7B98C', 5);
  pano += fillInk(ridge(1600, 520, [20, 10], 113, false, 1010, -40, 1640), '#C98E66', 5);
  // the river, wide at the front, thin at the horizon
  pano += fillInk('M 700 530 C 760 560 690 600 640 640 C 560 700 420 760 380 840 C 350 900 380 960 420 1010 L 1240 1010 C 1100 940 1040 880 1000 820 C 940 740 860 690 820 640 C 790 600 820 560 760 530 Z', HOME.teal, 5);
  pano += line('M 700 600 l 50 0 M 620 700 l 90 0 M 540 800 l 140 0 M 620 900 l 200 0 M 820 760 l 90 0', HOME.bone, 5);
  // banks, packed: tiny eagles everywhere, smaller toward the horizon
  const banks = [[380, 1000, 130, 540, 1], [1240, 1000, 1500, 560, -1]];
  let dots = '';
  for (let i = 0; i < 1100; i++) {
    const depth = Math.pow(R(), 0.8);            // 0 = horizon, 1 = foreground
    const y = 540 + depth * 450;
    const side = R() < 0.5 ? -1 : 1;
    const riverHalf = 20 + depth * 420;
    const x = 760 + side * (riverHalf + R() * (60 + depth * 520)) + (R() - 0.5) * 40;
    const sc = 0.35 + depth * 1.6;
    const white = R() < 0.4;
    dots += '<ellipse cx="' + r1(x) + '" cy="' + r1(y) + '" rx="' + r1(3.4 * sc) + '" ry="' + r1(5 * sc) + '" fill="#5A3A24"/>';
    dots += '<circle cx="' + r1(x + 0.6 * sc) + '" cy="' + r1(y - 5.4 * sc) + '" r="' + r1(2.6 * sc) + '" fill="' + (white ? HOME.bone : '#6B4128') + '"/>';
  }
  pano += '<g stroke="' + INK + '" stroke-width="1.2">' + dots + '</g>';
  files['scenes/s7-panorama.svg'] = svg(1600, 1000, pano, ' preserveAspectRatio="xMidYMax slice"');

  // SCENE 7: the rock — a lone promontory above the river, its flat top jutting
  // out like a stage. The nest sits on the ledge at the same spot as in scene 1.
  const rock = 'M 190 1010 C 210 860 160 720 196 610 C 214 540 130 480 70 440 C 36 418 12 390 18 356 C 140 332 380 326 560 336 C 640 342 694 392 704 470 C 722 640 744 820 796 1010 Z';
  let rk = fillInk(rock, '#3C4553', 7);
  rk += flat('M 196 610 C 214 540 130 480 70 440 C 120 470 190 520 240 600 C 260 700 250 860 270 1010 L 190 1010 C 210 860 160 720 196 610 Z', '#313946');
  rk += flat('M 560 336 C 640 342 694 392 704 470 C 722 640 744 820 796 1010 L 700 1010 C 680 820 660 620 640 480 C 630 400 600 360 560 336 Z', '#313946');
  rk += line('M 300 460 l 30 60 l -18 40 M 480 520 l -20 70 l 26 50 M 360 720 l 40 60 l -10 60 M 560 640 l -30 80', INK, 4);
  // first light catching the top of the ledge
  rk += line('M 30 352 C 150 332 380 326 556 338', '#FFD27A', 7);
  [[120, 344], [470, 338], [540, 340]].forEach((p) => {
    const d = 'M ' + p[0] + ' ' + p[1] + ' q -6 -22 -16 -30 M ' + p[0] + ' ' + p[1] + ' q 2 -26 10 -36 M ' + p[0] + ' ' + p[1] + ' q 12 -16 24 -20';
    rk += line(d, INK, 9) + line(d, '#C9A86A', 4);
  });
  rk += fillInk(rock, 'none', 7);
  files['scenes/s7-rock.svg'] = svg(800, 1000, rk, ' overflow="visible"');

  // Sunrise behind the rock: a disc and a slowly turning crown of rays
  let rays = '';
  const NR = 24;
  for (let i = 0; i < NR; i++) {
    const a0 = (i / NR) * Math.PI * 2, a1 = ((i + 0.5) / NR) * Math.PI * 2;
    rays += 'M 500 500 L ' + r1(500 + Math.cos(a0) * 520) + ' ' + r1(500 + Math.sin(a0) * 520) + ' L ' + r1(500 + Math.cos(a1) * 520) + ' ' + r1(500 + Math.sin(a1) * 520) + ' Z ';
  }
  files['scenes/s7-rays.svg'] = svg(1000, 1000, flat(rays, '#FFE28A', 0.32));
  files['scenes/s7-sun.svg'] = svg(400, 400, '<circle cx="200" cy="200" r="190" fill="#FFE28A" opacity="0.35"/><circle cx="200" cy="200" r="150" fill="#FFD24D" stroke="' + INK + '" stroke-width="7"/><path d="M 110 150 C 130 110 170 90 210 88" fill="none" stroke="#FFF6E4" stroke-width="12" stroke-linecap="round"/>');
}

/* ------------------------------------------------------------------ SPRITES */
{
  // A flying eagle seen from the side, facing right. Wing and body are separate
  // files so the wing can flap on the compositor (scaleY about the shoulder,
  // which sits at 44% 56% of the 160×110 box). speck.svg is the two combined.
  const flyer = (white) => {
    const bodyC = white ? '#4A2916' : '#7B4A2A', headC = white ? '#FFFDF6' : '#7B4A2A';
    const tailC = white ? '#FFFDF6' : '#55301A', beakC = white ? '#FFBE1A' : '#5C534F';
    let body = fillInk('M 34 52 L 4 40 L 10 54 L 2 66 L 36 62 Z', tailC, 4);
    body += fillInk('M 28 56 C 40 42 88 40 106 48 C 114 52 114 62 106 66 C 88 72 44 72 28 56 Z', bodyC, 4.5);
    body += flat('M 50 62 C 66 66 86 66 100 62 C 88 70 62 70 50 62 Z', white ? '#633A21' : '#C99A5E');
    body += fillInk('M 70 68 l 6 8 l 4 -6 M 80 68 l 6 8 l 4 -6', '#F5B82E', 3);
    body += fillInk('M 116 30 C 128 30 136 38 136 48 C 136 58 128 64 116 64 C 104 64 98 56 98 46 C 98 36 106 30 116 30 Z', headC, 4.5);
    body += fillInk('M 130 40 C 144 38 154 46 152 56 C 150 61 146 60 144 56 C 140 53 136 52 132 52 Z', beakC, 4);
    body += '<ellipse cx="121" cy="43" rx="6" ry="7" fill="#fff" stroke="' + INK + '" stroke-width="3"/><circle cx="123" cy="44" r="3.4" fill="' + INK + '"/>';
    const wingD = 'M 50 56 C 44 42 32 28 14 16 L 28 15 L 18 5 L 34 8 L 30 -2 L 46 5 L 48 -4 C 62 8 78 28 88 54 Z';
    const wing = fillInk(wingD, white ? '#3A2011' : '#5E3A20', 4.5) + line('M 62 46 C 56 36 48 28 38 22 M 74 46 C 70 34 64 24 56 16', INK, 2.5);
    return { body: body, wing: wing };
  };
  ['brown', 'white'].forEach((k) => {
    const f = flyer(k === 'white');
    const g = (x) => '<g transform="translate(0 8)">' + x + '</g>';
    files['sprites/fly-' + k + '-body.svg'] = svg(160, 110, g(f.body));
    files['sprites/fly-' + k + '-wing.svg'] = svg(160, 110, g(f.wing));
    if (k === 'brown') files['sprites/speck.svg'] = svg(160, 110, g(f.body + f.wing));
  });

  // Crowd eagles — deliberately simple (≈15 shapes) so dozens stay cheap.
  // No signature feather: only the hero has one.
  const crowdBird = (head, body, fish) => {
    const beak = head === '#FFFDF6' ? '#FFBE1A' : '#5C534F';
    let g = fillInk('M 40 104 L 22 128 L 44 122 L 52 130 L 60 106 Z', body === '#4A2916' ? '#FFFDF6' : '#55301A', 4);
    g += fillInk('M 60 44 C 88 44 100 72 98 96 C 96 116 80 124 60 124 C 40 124 24 116 24 96 C 22 70 34 44 60 44 Z', body, 5);
    g += flat('M 48 78 C 62 74 76 84 76 100 C 76 112 66 118 56 116 C 46 112 42 92 48 78 Z', body === '#4A2916' ? '#633A21' : '#C99A5E');
    g += fillInk('M 34 64 C 20 74 18 100 26 118 L 40 108 C 42 90 42 74 34 64 Z', body === '#4A2916' ? '#3A2011' : '#5E3A20', 4);
    g += line('M 44 126 l -8 8 M 46 126 l 0 10 M 48 126 l 8 8 M 72 126 l -8 8 M 74 126 l 0 10 M 76 126 l 8 8', INK, 9) + line('M 44 126 l -8 8 M 46 126 l 0 10 M 48 126 l 8 8 M 72 126 l -8 8 M 74 126 l 0 10 M 76 126 l 8 8', '#F5B82E', 4);
    g += fillInk('M 60 6 C 84 6 98 22 98 40 C 98 58 82 68 62 68 C 40 68 26 56 26 38 C 26 20 40 6 60 6 Z', head, 5);
    g += fillInk('M 86 28 C 104 24 118 34 118 48 C 118 58 110 62 106 56 C 104 50 98 48 90 48 C 86 44 84 34 86 28 Z', beak, 4);
    g += '<ellipse cx="72" cy="34" rx="10" ry="12" fill="#fff" stroke="' + INK + '" stroke-width="3.5"/><circle cx="75" cy="36" r="6" fill="' + INK + '"/><circle cx="77" cy="33" r="2" fill="#fff"/>';
    if (fish) g += fillInk('M 104 52 L 124 40 L 120 54 L 128 66 Z', WARM.salmon, 3.5);
    return svg(130, 140, g);
  };
  files['sprites/crowd-brown.svg'] = crowdBird('#7B4A2A', '#7B4A2A', false);
  files['sprites/crowd-white.svg'] = crowdBird('#FFFDF6', '#4A2916', false);
  files['sprites/crowd-brown-eat.svg'] = crowdBird('#7B4A2A', '#7B4A2A', true);
  files['sprites/crowd-white-eat.svg'] = crowdBird('#FFFDF6', '#4A2916', true);

  // How to buy — four spot illustrations (no brands, no coins, no money imagery)
  const head = (x, y, sc, white) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')">' +
    fillInk('M 0 -24 C 20 -24 30 -10 30 4 C 30 18 18 26 2 26 C -16 26 -28 16 -28 2 C -28 -12 -16 -24 0 -24 Z', white ? '#FFFDF6' : '#7B4A2A', 4) +
    fillInk('M 22 -4 C 36 -8 46 0 46 10 C 46 18 40 20 37 16 C 35 12 30 10 24 10 C 20 6 20 0 22 -4 Z', white ? '#FFBE1A' : '#5C534F', 3.5) +
    '<ellipse cx="10" cy="-4" rx="8" ry="9" fill="#fff" stroke="' + INK + '" stroke-width="3"/><circle cx="12" cy="-2" r="4.6" fill="' + INK + '"/>' +
    fillInk('M -4 -22 C -12 -34 -14 -44 -8 -54 C -2 -46 2 -36 2 -22 Z', '#FFFDF6', 3) + '</g>';
  files['sprites/howto-wallet.svg'] = svg(200, 160,
    fillInk('M 66 16 L 134 16 C 142 16 148 22 148 30 L 148 138 C 148 146 142 152 134 152 L 66 152 C 58 152 52 146 52 138 L 52 30 C 52 22 58 16 66 16 Z', '#2E3A4B', 5) +
    fillInk('M 64 34 L 136 34 L 136 128 L 64 128 Z', '#FFE28A', 4) +
    fillInk('M 100 52 C 116 62 116 90 100 110 C 84 90 84 62 100 52 Z', '#FFFDF6', 3.5) + line('M 100 58 L 100 116', INK, 3) +
    '<circle cx="100" cy="141" r="5" fill="#7D8A9A"/>' + head(162, 118, 0.9, false));
  files['sprites/howto-fill.svg'] = svg(200, 160,
    fillInk('M 60 30 L 140 30 L 136 44 C 150 58 152 90 150 120 C 148 144 132 152 100 152 C 68 152 52 144 50 120 C 48 90 50 58 64 44 Z', '#D9DFE4', 5) +
    fillInk('M 53 104 C 80 96 120 112 147 102 C 148 108 149 114 149 120 C 147 142 132 148 100 148 C 68 148 53 142 51 120 Z', '#16968E', 4) +
    fillInk('M 56 20 L 144 20 L 144 32 L 56 32 Z', '#7B4A2A', 4) +
    line('M 72 80 l 0 20 M 64 92 l 16 0', '#FFFDF6', 5) + '<text x="100" y="80" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="13" fill="' + INK + '">A LITTLE</text>' + head(170, 60, 0.75, false));
  files['sprites/howto-paste.svg'] = svg(200, 160,
    fillInk('M 50 24 L 150 24 L 150 150 L 50 150 Z', '#FFFDF6', 5) +
    fillInk('M 78 12 L 122 12 L 126 34 L 74 34 Z', '#7B4A2A', 4) +
    line('M 66 60 L 134 60 M 66 82 L 120 82 M 66 104 L 134 104 M 66 126 L 104 126', '#9A8A75', 7) +
    '<rect x="60" y="94" width="80" height="20" rx="6" fill="none" stroke="#FFC83A" stroke-width="5"/>' +
    fillInk('M 158 30 C 176 50 176 90 150 128 C 134 96 136 58 158 30 Z', '#FFFDF6', 4) + line('M 156 38 L 146 140', INK, 3.5));
  files['sprites/howto-swap.svg'] = svg(200, 160,
    fillInk('M 60 54 C 70 28 110 16 138 34 L 146 22 L 156 62 L 116 56 L 128 46 C 110 34 84 40 76 58 Z', '#FFC83A', 4.5) +
    fillInk('M 140 106 C 130 132 90 144 62 126 L 54 138 L 44 98 L 84 104 L 72 114 C 90 126 116 120 124 102 Z', '#FF7F6E', 4.5) +
    head(100, 84, 0.8, false));
  // A jumping salmon, and feather confetti
  let sal = fillInk('M 8 40 C 40 12 120 10 164 34 L 196 14 L 190 44 L 202 72 L 164 56 C 124 78 40 74 8 40 Z', WARM.salmon, 5);
  sal += flat('M 30 48 C 70 62 120 62 160 50 C 120 70 60 70 30 48 Z', WARM.salmonLight);
  sal += line('M 50 30 C 80 22 120 22 148 32', WARM.salmonDark, 4);
  sal += fillInk('M 90 22 q 14 -18 30 -2 Z', WARM.salmonDark, 4);
  sal += '<circle cx="34" cy="36" r="6" fill="#fff" stroke="' + INK + '" stroke-width="3"/><circle cx="35" cy="36" r="2.6" fill="' + INK + '"/>';
  files['sprites/salmon.svg'] = svg(210, 86, sal);
  const quill = (fill) => svg(40, 64, fillInk('M 20 4 C 34 16 34 40 20 58 C 6 40 6 16 20 4 Z', fill, 3.5) + line('M 20 10 L 20 62', INK, 3) + line('M 11 30 l 8 4 M 29 24 l -8 4', INK, 2.5));
  files['sprites/feather-white.svg'] = quill(WARM.cream);
  files['sprites/feather-brown.svg'] = quill('#7B4A2A');
  files['sprites/feather-gold.svg'] = quill(WARM.gold);
  // The splash: a crown of water, a ring on the surface and droplets (animated apart in scenes.js)
  let crown = fillInk('M 14 132 C 26 104 18 76 32 50 C 42 76 50 88 60 76 C 62 54 62 32 76 10 C 86 38 88 62 98 70 C 102 50 106 30 112 4 C 120 30 124 52 132 68 C 142 60 146 40 150 16 C 160 42 160 66 162 80 C 172 72 180 58 190 46 C 198 72 194 104 206 132 Z', WARM.teal300, 5);
  crown += flat('M 36 132 C 44 110 40 92 46 80 C 54 96 64 100 74 92 C 78 78 78 58 84 44 C 90 66 96 84 108 88 C 114 72 116 54 118 40 C 124 62 130 80 140 88 C 150 86 156 76 164 70 C 170 90 170 112 184 132 Z', WARM.cream);
  crown += line('M 60 116 l 0 -14 M 110 112 l 0 -18 M 156 116 l 0 -14', WARM.teal300, 5);
  [[36, 30, 6], [76, -6 + 10, 5], [112, -4 + 6, 7], [152, 2, 5], [192, 30, 6]].forEach((d) => { crown += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="' + WARM.cream + '" stroke="' + INK + '" stroke-width="3.5"/>'; });
  files['sprites/splash.svg'] = svg(220, 140, crown, ' overflow="visible"');
  files['sprites/splash-ring.svg'] = svg(240, 60, '<ellipse cx="120" cy="30" rx="112" ry="22" fill="none" stroke="' + INK + '" stroke-width="10"/><ellipse cx="120" cy="30" rx="112" ry="22" fill="none" stroke="' + WARM.cream + '" stroke-width="5"/>');
  files['sprites/splash-drop.svg'] = svg(24, 32, fillInk('M 12 3 C 18 12 21 18 21 22 C 21 27 17 30 12 30 C 7 30 3 27 3 22 C 3 18 6 12 12 3 Z', WARM.cream, 3.5) + flat('M 8 20 C 8 17 10 15 11 14 C 11 18 10 21 8 22 Z', WARM.teal300));
}

let n = 0;
for (const [rel, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(root, 'assets', rel), '<!-- EAGLES GON EAT — generated by tools/export-scenes.js -->\n' + content);
  n++;
}
console.log('Wrote ' + n + ' scene/sprite SVG files.');
