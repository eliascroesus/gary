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
  // and the sky full of them
  let sky = '';
  for (let i = 0; i < 420; i++) {
    const x = R() * 1600, y = 40 + Math.pow(R(), 1.3) * 440, sc = 0.4 + R() * 1.1;
    sky += '<path d="M ' + r1(x - 8 * sc) + ' ' + r1(y - 4 * sc) + ' q ' + r1(4 * sc) + ' ' + r1(5 * sc) + ' ' + r1(8 * sc) + ' ' + r1(4 * sc) + ' q ' + r1(4 * sc) + ' ' + r1(-1 * sc) + ' ' + r1(8 * sc) + ' ' + r1(-4 * sc) + '"/>';
  }
  pano += '<g fill="none" stroke="#4A2E1C" stroke-width="2.4" stroke-linecap="round">' + sky + '</g>';
  files['scenes/s7-panorama.svg'] = svg(1600, 1000, pano, ' preserveAspectRatio="xMidYMax slice"');
}

/* ------------------------------------------------------------------ SPRITES */
{
  // A far-off eagle: brown, wings up, flying right. Readable at 24px.
  const body = 'M 14 24 C 22 18 40 18 50 22 C 54 23 58 25 60 27 C 54 29 48 30 42 30 C 32 32 20 30 14 24 Z';
  const wingUp = 'M 30 22 C 26 12 20 4 10 2 C 16 8 18 14 22 22 Z M 38 22 C 40 12 46 4 56 2 C 50 10 46 16 44 22 Z';
  files['sprites/speck.svg'] = svg(64, 36, fillInk(wingUp, '#5A3A24', 3) + fillInk(body, '#6B4128', 3) + fillInk('M 6 22 L 16 20 L 16 28 Z', '#4A2E1C', 2.5));
  const wingDown = 'M 30 24 C 26 32 20 36 12 36 C 18 32 22 28 24 24 Z M 38 24 C 42 32 48 36 56 36 C 50 32 46 28 44 24 Z';
  files['sprites/speck-down.svg'] = svg(64, 40, fillInk(body, '#6B4128', 3) + fillInk(wingDown, '#5A3A24', 3) + fillInk('M 6 22 L 16 20 L 16 28 Z', '#4A2E1C', 2.5));


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
  files['sprites/splash.svg'] = svg(160, 90, fillInk('M 10 86 C 20 50 30 40 40 20 C 46 44 52 50 60 34 C 66 54 72 58 80 8 C 88 58 94 54 100 34 C 108 50 114 44 120 20 C 130 40 140 50 150 86 Z', WARM.cream, 5) + line('M 30 70 l 0 -10 M 80 60 l 0 -14 M 128 70 l 0 -10', WARM.teal300, 4));
}

let n = 0;
for (const [rel, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(root, 'assets', rel), '<!-- EAGLES GON EAT — generated by tools/export-scenes.js -->\n' + content);
  n++;
}
console.log('Wrote ' + n + ' scene/sprite SVG files.');
