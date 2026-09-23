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

  // Rain — seamless diagonal tile
  let rain = '';
  const RR = rng(21);
  for (let i = 0; i < 10; i++) {
    const x = RR() * 240, y = RR() * 240, L = 40 + RR() * 50;
    for (const ox of [-240, 0, 240]) for (const oy of [-240, 0, 240]) {
      rain += line('M ' + r1(x + ox) + ' ' + r1(y + oy) + ' l ' + r1(-L * 0.3) + ' ' + r1(L), T.fog100, 3.5, 0.7);
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

/* ------------------------------------------------------------------ SCENE 3 (tiles horizontally) */
{
  const W = 1600;
  files['scenes/s3-clouds.svg'] = svg(W, 1000, [[260, 200, 400, 110], [900, 130, 480, 130], [1400, 250, 340, 100], [620, 380, 300, 80]].map((c, i) => fillInk(cloud(c[0], c[1], c[2], c[3], 300 + i), '#8A93A4', 5)).join(''));
  files['scenes/s3-far.svg'] = svg(W, 1000, fillInk(ridge(W, 560, [70, 40, 20], 41, true, 1010, -40, W + 40), '#5F6A7E', 6) + fillInk(ridge(W, 660, [50, 30, 14], 42, true, 1010, -40, W + 40), '#4C566A', 6));
  let mid = fillInk(ridge(W, 790, [34, 20, 10], 43, false, 1010, -40, W + 40), T.mud500, 6);
  const R = rng(44);
  const trees = [];
  for (let i = 0; i < 9; i++) trees.push.apply(trees, bareTree(80 + i * 170 + R() * 60, 790 - Math.sin(i) * 10, 0.8 + R() * 0.5, 45 + i));
  mid += sticks(trees, T.mud700, 5);
  files['scenes/s3-mid.svg'] = svg(W, 1000, mid);
  let fr = fillInk(ridge(W, 930, [20, 10], 46, false, 1010, -40, W + 40), '#3F3831', 6);
  for (let i = 0; i < 20; i++) {
    const x = 40 + i * 80 + R() * 30, y = 925 - Math.sin(i * 0.7) * 8;
    fr += line('M ' + r1(x) + ' ' + r1(y) + ' q -4 -24 -14 -30 M ' + r1(x) + ' ' + r1(y) + ' q 4 -28 12 -34', INK, 8) + line('M ' + r1(x) + ' ' + r1(y) + ' q -4 -24 -14 -30 M ' + r1(x) + ' ' + r1(y) + ' q 4 -28 12 -34', T.mud300, 3.5);
  }
  files['scenes/s3-front.svg'] = svg(W, 1000, fr);
}

/* ------------------------------------------------------------------ SPRITES */
{
  // A far-off eagle: brown, wings up, flying right. Readable at 24px.
  const body = 'M 14 24 C 22 18 40 18 50 22 C 54 23 58 25 60 27 C 54 29 48 30 42 30 C 32 32 20 30 14 24 Z';
  const wingUp = 'M 30 22 C 26 12 20 4 10 2 C 16 8 18 14 22 22 Z M 38 22 C 40 12 46 4 56 2 C 50 10 46 16 44 22 Z';
  files['sprites/speck.svg'] = svg(64, 36, fillInk(wingUp, '#5A3A24', 3) + fillInk(body, '#6B4128', 3) + fillInk('M 6 22 L 16 20 L 16 28 Z', '#4A2E1C', 2.5));
  const wingDown = 'M 30 24 C 26 32 20 36 12 36 C 18 32 22 28 24 24 Z M 38 24 C 42 32 48 36 56 36 C 50 32 46 28 44 24 Z';
  files['sprites/speck-down.svg'] = svg(64, 40, fillInk(body, '#6B4128', 3) + fillInk(wingDown, '#5A3A24', 3) + fillInk('M 6 22 L 16 20 L 16 28 Z', '#4A2E1C', 2.5));
}

let n = 0;
for (const [rel, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(root, 'assets', rel), '<!-- EAGLES GON EAT — generated by tools/export-scenes.js -->\n' + content);
  n++;
}
console.log('Wrote ' + n + ' scene/sprite SVG files.');
