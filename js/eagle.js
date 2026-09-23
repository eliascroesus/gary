/*!
 * EAGLES GON EAT — character rig (js/eagle.js)
 *
 * One source of truth for the young eagle. Every pose is assembled from the
 * same named, layered parts so each part can be animated on its own:
 *
 *   rig ─┬─ tail
 *        ├─ wing-r            (back wing, rotates from its shoulder)
 *        ├─ talons            (legs + feet — deliberately too big)
 *        ├─ body
 *        ├─ wing-l            (front wing, rotates from its shoulder)
 *        └─ head ─┬─ signature-feather   (the single white feather — every pose)
 *                 ├─ headfeathers        (6 white stages, driven by milestones)
 *                 ├─ eyes ── pupils
 *                 └─ beak
 *
 * Every group carries data-part="…" and data-pivot="x y" (its hinge in the
 * parent's coordinates). Pass { canonicalIds: true } to also stamp the ids
 * #eagle-body, #eagle-head, … on one instance per page.
 *
 * Runs in the browser (window.EagleRig) and in Node (module.exports), which is
 * how /assets/characters/*.svg are exported from this exact art.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EagleRig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Palette — mirrors the character tokens in css/style.css
  // ---------------------------------------------------------------------------
  const C = {
    ink: '#17110D',
    brown: '#7B4A2A',
    brownDark: '#55301A',
    brownLight: '#A06B3D',
    tan: '#C99A5E',
    tanLight: '#E2BD85',
    chocolate: '#4A2916',
    chocolateLight: '#6E4428',
    white: '#FFFDF6',
    whiteShade: '#EDE3CF',
    beakJuv: '#5C534F',
    beakJuvHi: '#80766F',
    cereJuv: '#A8956A',
    beakAdult: '#FFBE1A',
    beakAdultHi: '#FFE17A',
    cereAdult: '#FFD24D',
    talon: '#F5B82E',
    talonShade: '#D99522',
    down: '#8D8279',
    downDark: '#6B6058',
    downLight: '#B4AA9F',
    eye: '#FFFFFF',
    mouth: '#7E2A26',
    tongue: '#F27B70',
    salmon: '#FF7F6E',
    salmonDark: '#DE5A4B',
    salmonLight: '#FFC2B2',
    water: '#CFF1F5',
    sweat: '#A9DDF2',
    branch: '#5E4330',
    branchDark: '#432F20',
    branchLight: '#7C5B41',
  };

  const LINE = 6;    // outer outline — "thick 5-6px solid black"
  const LINE_M = 4.5; // eyes, lids, beak, small parts
  const LINE_S = 3;  // interior detail strokes

  // ---------------------------------------------------------------------------
  // Geometry helpers
  // ---------------------------------------------------------------------------
  const r1 = (n) => Math.round(n * 10) / 10;
  const pt = (p) => r1(p[0]) + ' ' + r1(p[1]);
  const rad = (deg) => (deg * Math.PI) / 180;

  function rng(seed) {
    let s = ((seed + 1) * 2654435761) >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // Smooth closed/open path through points. A point written [x, y, 'c'] is a
  // hard corner (feather tips, notches).
  function smooth(pts, closed, k) {
    closed = closed !== false;
    k = k == null ? 1 : k;
    const n = pts.length;
    const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = 'M ' + pt(pts[0]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = p1[2] === 'c' ? p1 : [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
      const c2 = p2[2] === 'c' ? p2 : [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
      d += ' C ' + pt(c1) + ' ' + pt(c2) + ' ' + pt(p2);
    }
    return closed ? d + ' Z' : d;
  }

  // Wonky blob: an ellipse with jittered radius.
  function blob(cx, cy, rx, ry, n, jit, seed, rot) {
    const R = rng(seed);
    const pts = [];
    rot = rot || 0;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const k = 1 + (R() - 0.5) * 2 * jit;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return smooth(pts);
  }

  // Fluffy scalloped outline — down feathers, feathered pants, white patches.
  function fluff(cx, cy, rx, ry, n, amp, seed, rot) {
    const R = rng(seed);
    rot = rot || 0;
    const v = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2 + (R() - 0.5) * 0.14;
      const k = 1 - amp * 0.4 + (R() - 0.5) * amp * 0.5;
      v.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, a]);
    }
    let d = 'M ' + pt(v[0]);
    for (let i = 0; i < n; i++) {
      const p = v[i], q = v[(i + 1) % n];
      let a0 = p[2], a1 = q[2];
      if (a1 < a0) a1 += Math.PI * 2;
      const am = (a0 + a1) / 2;
      const k = 1 + amp * (1.15 + (R() - 0.5) * 0.7);
      d += ' Q ' + pt([cx + Math.cos(am) * rx * k, cy + Math.sin(am) * ry * k]) + ' ' + pt(q);
    }
    return d + ' Z';
  }

  // Upper (or lower) eyelid: the cap of an ellipse cut by a tilted line.
  // cover 0..1 of the eye height, tilt in degrees (+ = right side lower).
  function lidPath(e, cover, tilt, lower, bulge) {
    if (!cover || cover <= 0.001) return null;
    const t = rad(tilt || 0);
    const rx = e.rx, ry = e.ry;
    const sgn = lower ? -1 : 1;
    const y0 = sgn * (-ry + cover * 2 * ry);
    const ct = Math.cos(t), st = Math.sin(t);
    const a = (ct * ct) / (rx * rx) + (st * st) / (ry * ry);
    const b = (2 * y0 * st) / (ry * ry);
    const c = (y0 * y0) / (ry * ry) - 1;
    const disc = b * b - 4 * a * c;
    if (disc <= 0) return null;
    const s1 = (-b - Math.sqrt(disc)) / (2 * a), s2 = (-b + Math.sqrt(disc)) / (2 * a);
    const p1 = [e.cx + s1 * ct, e.cy + y0 + s1 * st];
    const p2 = [e.cx + s2 * ct, e.cy + y0 + s2 * st];
    const large = sgn * y0 > 0 ? 1 : 0;
    const bul = lower ? -(bulge == null ? 2.5 : bulge) : (bulge == null ? 3.5 : bulge);
    const m = [(p1[0] + p2[0]) / 2 - st * bul, (p1[1] + p2[1]) / 2 + ct * bul];
    const sweep = lower ? 0 : 1;
    return {
      fill: 'M ' + pt(p1) + ' A ' + r1(rx) + ' ' + r1(ry) + ' 0 ' + large + ' ' + sweep + ' ' + pt(p2) + ' Q ' + pt(m) + ' ' + pt(p1) + ' Z',
      edge: 'M ' + pt(p1) + ' Q ' + pt(m) + ' ' + pt(p2),
    };
  }

  // ---------------------------------------------------------------------------
  // SVG helpers
  // ---------------------------------------------------------------------------
  const stroke = (w, color) =>
    ' fill="none" stroke="' + (color || C.ink) + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"';

  function clip(ctx, key, d, inner) {
    const id = ctx.uid + '-' + key;
    ctx.defs.push('<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>');
    return '<g clip-path="url(#' + id + ')">' + inner + '</g>';
  }

  // Flat fill → clipped detail → outline on top (details never cover the line).
  function shape(ctx, key, d, fill, detail, w) {
    w = w || LINE;
    if (!detail) return '<path d="' + d + '" fill="' + fill + '"' + ' stroke="' + C.ink + '" stroke-width="' + w + '" stroke-linejoin="round"/>';
    return '<path d="' + d + '" fill="' + fill + '"/>' + clip(ctx, key, d, detail) + '<path d="' + d + '"' + stroke(w) + '/>';
  }

  function part(ctx, name, inner, pivot, cls) {
    const id = ctx.canonical ? ' id="eagle-' + name + '"' : '';
    const pv = pivot ? ' data-pivot="' + pt(pivot) + '"' : '';
    return '<g' + id + ' class="eg-' + name + (cls ? ' ' + cls : '') + '" data-part="' + name + '"' + pv + '>' + inner + '</g>';
  }

  const place = (x, y, rot, s, inner) =>
    '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')' + (rot ? ' rotate(' + r1(rot) + ')' : '') + (s && s !== 1 ? ' scale(' + s + ')' : '') + '">' + inner + '</g>';

  // Mottling — irregular dabs, clipped by the caller.
  function mottles(seed, count, box, rmin, rmax, color) {
    const R = rng(seed);
    let s = '';
    for (let i = 0; i < count; i++) {
      const cx = box[0] + R() * box[2], cy = box[1] + R() * box[3];
      const r = rmin + R() * (rmax - rmin);
      s += '<path d="' + blob(cx, cy, r * (0.9 + R() * 0.7), r * (0.55 + R() * 0.35), 6, 0.28, seed * 17 + i * 5, R() * Math.PI) + '" fill="' + color + '"/>';
    }
    return s;
  }

  // Feather scallops — little "u" strokes that read as feather rows.
  function scallops(x, y, n, w, h, color, sw) {
    let d = 'M ' + r1(x) + ' ' + r1(y);
    for (let i = 0; i < n; i++) d += ' q ' + r1(w / 2) + ' ' + r1(h) + ' ' + r1(w) + ' 0';
    return '<path d="' + d + '"' + stroke(sw || LINE_S, color || C.brownDark) + '/>';
  }

  // A scruffy feather sticking out at the wrong angle. Wrapped so the outer
  // group can wobble from its base (secondary motion) without losing placement.
  function tuft(x, y, ang, len, w, fill, tint) {
    const d =
      'M 0 ' + r1(-w / 2) +
      ' C ' + r1(len * 0.35) + ' ' + r1(-w * 0.95) + ' ' + r1(len * 0.78) + ' ' + r1(-w * 0.5) + ' ' + r1(len) + ' ' + r1(-w * 0.08) +
      ' C ' + r1(len * 0.72) + ' ' + r1(w * 0.2) + ' ' + r1(len * 0.38) + ' ' + r1(w * 0.72) + ' 0 ' + r1(w / 2) + ' Z';
    const tf = ' transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(ang) + ')"';
    let s = '<path d="' + d + '"' + tf + ' fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + LINE_M + '" stroke-linejoin="round"/>';
    if (tint) s += '<path class="hf-tint ' + tint.cls + '" opacity="' + tint.op + '" d="' + d + '"' + tf + ' fill="' + C.white + '" stroke="' + C.ink + '" stroke-width="' + LINE_M + '" stroke-linejoin="round"/>';
    return '<g class="scruff" data-pivot="' + r1(x) + ' ' + r1(y) + '">' + s + '</g>';
  }

  // A talon claw: base at (x,y), pointing `ang` degrees, always hooking down.
  function claw(x, y, ang, len, w) {
    len = len || 18; w = w || 11;
    const flip = Math.cos(rad(ang)) < 0 ? ' scale(1 -1)' : '';
    const d =
      'M 0 ' + r1(-w / 2) +
      ' C ' + r1(len * 0.6) + ' ' + r1(-w * 0.62) + ' ' + r1(len * 1.05) + ' ' + r1(len * 0.12) + ' ' + r1(len * 0.9) + ' ' + r1(len * 0.62) +
      ' C ' + r1(len * 0.62) + ' ' + r1(len * 0.3) + ' ' + r1(len * 0.34) + ' ' + r1(w * 0.52) + ' 0 ' + r1(w / 2) + ' Z';
    return '<path d="' + d + '" transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(ang) + ')' + flip + '" fill="' + C.ink + '" stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round"/>';
  }

  // Toes as fat rounded strokes: ink under-stroke, then fill — merges into one
  // clean foot with a single outer outline.
  function toes(list, fill, width) {
    const d = list.map((t) => 'M ' + pt(t[0]) + ' Q ' + pt(t[1]) + ' ' + pt(t[2])).join(' ');
    return (
      '<path d="' + d + '"' + stroke(width + LINE * 2 - 1) + '/>' +
      '<path d="' + d + '"' + stroke(width, fill) + '/>'
    );
  }

  function toeCreases(list) {
    let d = '';
    list.forEach((t) => {
      // two small creases along each toe
      [0.45, 0.72].forEach((u) => {
        const x = (1 - u) * (1 - u) * t[0][0] + 2 * (1 - u) * u * t[1][0] + u * u * t[2][0];
        const y = (1 - u) * (1 - u) * t[0][1] + 2 * (1 - u) * u * t[1][1] + u * u * t[2][1];
        const dx = 2 * (1 - u) * (t[1][0] - t[0][0]) + 2 * u * (t[2][0] - t[1][0]);
        const dy = 2 * (1 - u) * (t[1][1] - t[0][1]) + 2 * u * (t[2][1] - t[1][1]);
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        d += ' M ' + pt([x + nx * 5, y + ny * 5]) + ' L ' + pt([x - nx * 5, y - ny * 5]);
      });
    });
    return '<path d="' + d + '"' + stroke(2.5, C.talonShade) + '/>';
  }

  const clawsFor = (list, len, w) =>
    list.map((t) => {
      const a = Math.atan2(t[2][1] - t[1][1], t[2][0] - t[1][0]) * 180 / Math.PI;
      return claw(t[2][0], t[2][1], a, len, w);
    }).join('');

  // ---------------------------------------------------------------------------
  // HEAD — authored in local space, (0,0) = centre of the skull, facing right.
  // ---------------------------------------------------------------------------
  const HEAD_PTS = [[4, -70], [48, -62], [74, -34], [80, 0], [68, 38], [36, 62], [-6, 68], [-48, 58], [-76, 22], [-76, -24], [-46, -60]];
  const HEAD_D = smooth(HEAD_PTS);
  const EYE_NEAR = { cx: -16, cy: -10, rx: 25, ry: 29 };
  const EYE_FAR = { cx: 36, cy: -12, rx: 21, ry: 26 };

  // White head stages — each unlocked milestone reveals one more.
  const HEADFEATHERS = [
    fluff(-8, -60, 40, 24, 8, 0.16, 11),                                   // 1 crown, around the signature feather
    fluff(44, -40, 38, 28, 8, 0.16, 12) + ' ' + fluff(16, -52, 26, 18, 6, 0.18, 13), // 2 forehead + brow
    fluff(-56, -22, 30, 40, 8, 0.16, 14),                                  // 3 back of the head
    fluff(12, -8, 66, 30, 11, 0.12, 15),                                   // 4 cheeks + around the eyes
    fluff(-42, 36, 40, 32, 8, 0.16, 16),                                   // 5 nape
    fluff(26, 42, 62, 32, 10, 0.14, 17) + ' ' + blob(0, 0, 82, 76, 10, 0.02, 18), // 6 throat — completes the white head
  ];

  const EXPR = {
    //          near lid [cover, tilt]   far lid       lower lids            gaze [dx,dy]   pupils [near, far]
    hungry:     { up: [[0.16, 7], [0.16, -7]], low: null, gaze: [3, 2], pupil: [16, 14] },
    worried:    { up: [[0.1, -16], [0.1, 16]], low: null, gaze: [2, -5], pupil: [15, 13], brows: 'worried' },
    tired:      { up: [[0.55, -12], [0.55, 12]], low: null, gaze: [4, 6], pupil: [13, 11], bags: true },
    determined: { up: [[0.34, 16], [0.34, -16]], low: null, gaze: [7, 1], pupil: [14, 12] },
    focused:    { up: [[0.32, 18], [0.32, -18]], low: null, gaze: [8, 7], pupil: [12, 11] },
    annoyed:    { up: [[0.5, 2], [0.52, -2]], low: [[0.12, 0], [0.12, 0]], gaze: [-9, 2], pupil: [12, 10], brows: 'annoyed' },
    happy:      { up: null, low: [[0.36, 6, 14], [0.36, -6, 12]], gaze: [3, -7], pupil: [15, 13], sparkle: true, blush: true },
    proud:      { up: [[0.24, 4], [0.26, -4]], low: [[0.1, 0, 6], [0.1, 0, 6]], gaze: [5, -2], pupil: [15, 10] },
    amazed:     { up: null, low: null, gaze: [3, -6], pupil: [13, 11] },
    smug:       { up: [[0.45, -4], [0.45, 4]], low: null, gaze: [4, 0], pupil: [12, 11] },
  };

  function eyesPart(ctx, o) {
    const ex = EXPR[o.expr] || EXPR.hungry;
    const eyes = [o.eyeNear || EYE_NEAR, o.eyeFar || EYE_FAR];
    const g = o.gaze || ex.gaze;
    const white = eyes.map((e) => '<ellipse cx="' + e.cx + '" cy="' + e.cy + '" rx="' + e.rx + '" ry="' + e.ry + '" fill="' + C.eye + '"/>').join('');
    // pupils clipped to the whites so they can roll right to the rim
    const clipD = eyes.map((e) => 'M ' + (e.cx - e.rx) + ' ' + e.cy + ' a ' + e.rx + ' ' + e.ry + ' 0 1 0 ' + e.rx * 2 + ' 0 a ' + e.rx + ' ' + e.ry + ' 0 1 0 ' + -e.rx * 2 + ' 0 Z').join(' ');
    let pupils = '';
    eyes.forEach((e, i) => {
      const pr = ex.pupil[i];
      const px = e.cx + g[0] * (i ? 0.85 : 1), py = e.cy + g[1];
      pupils += '<circle cx="' + r1(px) + '" cy="' + r1(py) + '" r="' + pr + '" fill="' + C.ink + '"/>';
      pupils += '<circle cx="' + r1(px + pr * 0.32) + '" cy="' + r1(py - pr * 0.4) + '" r="' + r1(pr * 0.3) + '" fill="#fff"/>';
      if (ex.sparkle) pupils += '<circle cx="' + r1(px - pr * 0.38) + '" cy="' + r1(py + pr * 0.36) + '" r="' + r1(pr * 0.15) + '" fill="#fff"/>';
    });
    const pupilsPart = clip(ctx, 'eyes', clipD, part(ctx, 'pupils', pupils, [(eyes[0].cx + eyes[1].cx) / 2, eyes[0].cy]));
    let lids = '', lidEdges = '', tintLids = '';
    const lidFill = o.adult ? C.white : C.brown;
    const addLid = (e, spec, lower) => {
      if (!spec) return;
      const L = lidPath(e, spec[0], spec[1], lower, spec[2]);
      if (!L) return;
      lids += '<path d="' + L.fill + '" fill="' + lidFill + '"/>';
      if (!o.adult && !o.chick) tintLids += '<path d="' + L.fill + '" fill="' + C.white + '"/>';
      lidEdges += '<path d="' + L.edge + '"' + stroke(LINE_M) + '/>';
    };
    eyes.forEach((e, i) => {
      addLid(e, o.up ? o.up[i] : ex.up ? ex.up[i] : null, false);
      if (ex.low) addLid(e, ex.low[i], true);
    });
    if (o.chick) lids = lids.split(C.brown).join(C.down);
    const tint = tintLids ? '<g class="hf-tint hf-4" opacity="' + (ctx.plumage >= 4 ? 1 : 0) + '">' + tintLids + '</g>' : '';
    const outlines = eyes.map((e) => '<ellipse cx="' + e.cx + '" cy="' + e.cy + '" rx="' + e.rx + '" ry="' + e.ry + '"' + stroke(LINE_M) + '/>').join('');
    let extra = '';
    if (ex.bags) {
      extra += eyes.map((e) => '<path d="M ' + r1(e.cx - e.rx * 0.6) + ' ' + r1(e.cy + e.ry + 7) + ' q ' + r1(e.rx * 0.6) + ' 7 ' + r1(e.rx * 1.2) + ' 0"' + stroke(LINE_S) + '/>').join('');
    }
    if (ex.brows === 'worried') {
      extra += '<path d="M ' + (eyes[0].cx - 20) + ' ' + (eyes[0].cy - eyes[0].ry - 6) + ' q 14 -4 26 -14"' + stroke(LINE_M + 1) + '/>';
      extra += '<path d="M ' + (eyes[1].cx + 16) + ' ' + (eyes[1].cy - eyes[1].ry - 6) + ' q -12 -4 -22 -13"' + stroke(LINE_M + 1) + '/>';
    }
    if (ex.brows === 'annoyed') {
      extra += '<path d="M ' + (eyes[0].cx - 22) + ' ' + (eyes[0].cy - eyes[0].ry - 2) + ' l 42 4"' + stroke(LINE_M + 1) + '/>';
      extra += '<path d="M ' + (eyes[1].cx - 16) + ' ' + (eyes[1].cy - eyes[1].ry - 12) + ' q 14 -8 30 2"' + stroke(LINE_M + 1) + '/>';
    }
    if (ex.blush) {
      extra += '<ellipse cx="' + (eyes[0].cx - 8) + '" cy="' + (eyes[0].cy + eyes[0].ry + 10) + '" rx="13" ry="7" fill="' + C.salmon + '" opacity="0.85"/>';
      extra += '<ellipse cx="' + (eyes[1].cx + 8) + '" cy="' + (eyes[1].cy + eyes[1].ry + 9) + '" rx="10" ry="6" fill="' + C.salmon + '" opacity="0.85"/>';
    }
    const inner = white + pupilsPart + lids + tint + outlines + lidEdges + extra;
    return part(ctx, 'eyes', inner, [(eyes[0].cx + eyes[1].cx) / 2, (eyes[0].cy + eyes[1].cy) / 2]);
  }

  // Beak — big, chunky, softly hooked. States: closed | open | full | grin.
  const BEAK_UP = 'M 48 -22 C 66 -36 102 -34 118 -12 C 130 4 128 28 114 44 C 108 50 102 46 104 38 C 105 30 100 24 92 23 L 62 23 C 51 23 43 13 43 1 C 43 -9 44 -16 48 -22 Z';
  const BEAK_LOW = 'M 60 21 C 72 27 86 29 97 27 C 96 38 84 45 71 43 C 62 41 57 31 60 21 Z';
  const CERE = 'M 48 -22 C 54 -27 62 -29 69 -28 C 62 -14 62 6 66 23 L 62 23 C 51 23 43 13 43 1 C 43 -9 44 -16 48 -22 Z';

  function beakPart(ctx, o) {
    const adult = o.adult;
    const col = adult ? C.beakAdult : o.chick ? '#4E4744' : C.beakJuv;
    const hi = adult ? C.beakAdultHi : C.beakJuvHi;
    const cere = adult ? C.cereAdult : o.chick ? '#E8C35A' : C.cereJuv;
    const state = o.beak || 'closed';
    let s = '';
    // mouth interior + lower mandible first
    let lowerRot = 0;
    if (state === 'open') lowerRot = 24;
    if (state === 'grin') lowerRot = o.adult ? 17 : 12;
    if (lowerRot) {
      s += '<path d="M 58 20 L 104 28 C 100 46 80 62 62 50 Z" fill="' + C.mouth + '" stroke="' + C.ink + '" stroke-width="' + LINE_M + '" stroke-linejoin="round"/>';
      s += '<path d="M 66 38 C 76 34 90 36 96 42 C 88 50 74 52 66 46 Z" fill="' + C.tongue + '"/>';
    }
    const lowD = state === 'full' ? 'M 58 20 C 72 30 92 32 104 28 C 104 46 86 56 70 52 C 58 49 52 34 58 20 Z' : BEAK_LOW;
    s += '<g transform="rotate(' + lowerRot + ' 58 20)"><path d="' + lowD + '" fill="' + col + '" stroke="' + C.ink + '" stroke-width="' + LINE_M + '" stroke-linejoin="round"/></g>';
    // upper mandible
    s += '<path d="' + BEAK_UP + '" fill="' + col + '"/>';
    s += '<path d="' + CERE + '" fill="' + cere + '"/>';
    s += '<path d="M 76 -24 C 92 -27 106 -21 113 -10"' + stroke(4, hi) + '/>';
    if (!adult && !o.chick) {
      // yellow creeps in as the head turns white
      const op = Math.max(0, Math.min(1, (ctx.plumage - 2) / 4));
      s += '<g class="beak-adult" opacity="' + r1(op) + '"><path d="' + BEAK_UP + '" fill="' + C.beakAdult + '"/><path d="' + CERE + '" fill="' + C.cereAdult + '"/><path d="M 76 -24 C 92 -27 106 -21 113 -10"' + stroke(4, C.beakAdultHi) + '/></g>';
    }
    s += '<path d="' + BEAK_UP + '"' + stroke(LINE_M + 0.5) + '/>';
    s += '<path d="M 66 -26 C 61 -12 61 6 65 22"' + stroke(LINE_S) + '/>';
    s += '<ellipse cx="59" cy="-7" rx="4" ry="3" transform="rotate(-20 59 -7)" fill="' + C.ink + '"/>';
    // gape — a little upturned smile at the corner
    s += '<path d="M 62 23 Q 52 24 47 16"' + stroke(LINE_S + 0.5) + '/>';
    if (state === 'full') {
      // fish tail poking out of a full beak + a crumb
      s += '<g transform="translate(106 30) rotate(18)"><path d="M 0 0 L 22 -14 L 18 0 L 24 14 Z" fill="' + C.salmon + '" stroke="' + C.ink + '" stroke-width="' + LINE_M + '" stroke-linejoin="round"/></g>';
      s += '<circle cx="94" cy="62" r="4" fill="' + C.salmonLight + '" stroke="' + C.ink + '" stroke-width="2.5"/>';
    }
    if (o.beakScale) s = '<g transform="translate(46 4) scale(' + o.beakScale + ') translate(-46 -4)">' + s + '</g>';
    return part(ctx, 'beak', s, [58, 20]);
  }

  // Signature feather — the one white feather he has from the very first frame.
  const SIG_D = smooth([[-15, -58, 'c'], [-27, -80], [-38, -104], [-43, -126], [-38, -144], [-27, -154, 'c'], [-16, -142], [-10, -122], [-5, -100], [0, -80], [8, -58, 'c']]);
  const SIG_RACHIS = smooth([[-3, -60], [-14, -88], [-24, -118], [-27, -146]], false);

  function signatureFeather(ctx, s) {
    let g = '<path d="' + SIG_D + '" fill="' + C.white + '" stroke="' + C.ink + '" stroke-width="' + LINE_M + '" stroke-linejoin="round"/>';
    g += '<path d="' + SIG_RACHIS + '"' + stroke(LINE_S) + '/>';
    g += '<path d="M -39 -96 L -28 -92 M -8 -114 L -17 -109"' + stroke(LINE_S) + '/>';
    return part(ctx, 'signature-feather', g, [-3, -58]);
  }

  function headPart(ctx, o) {
    const adult = !!o.adult;
    const chick = !!o.chick;
    let s = '';
    // scruffy tufts behind the skull (tinted white by stage)
    const tint = (n) => (adult || chick ? null : { cls: 'hf-' + n, op: ctx.plumage >= n ? 1 : 0 });
    const tuftFill = adult ? C.white : chick ? C.down : C.brown;
    if (chick) {
      s += tuft(-60, -30, 200, 26, 16, tuftFill) + tuft(-30, -58, 240, 22, 14, tuftFill) + tuft(56, -44, -40, 20, 12, tuftFill);
    } else {
      s += tuft(-66, -8, 192, 34, 17, tuftFill, tint(3));
      s += tuft(-40, -52, 232, 30, 15, tuftFill, tint(1));
      s += tuft(-52, 40, 152, 30, 15, tuftFill, tint(5));
    }
    s += signatureFeather(ctx);
    // skull
    const base = chick ? fluff(0, 0, 76, 70, 15, 0.08, 31) : HEAD_D;
    let detail = '';
    if (chick) {
      detail += mottles(41, 6, [-60, -50, 120, 100], 6, 10, C.downLight);
    } else if (!adult) {
      detail += mottles(42, 7, [-74, -66, 150, 130], 7, 13, C.brownDark);
      detail += mottles(43, 4, [-60, -40, 110, 90], 4, 7, C.brownLight);
    }
    if (!chick) {
      let hf = '';
      HEADFEATHERS.forEach((d, i) => {
        const n = i + 1;
        const on = adult || ctx.plumage >= n;
        hf += '<path class="hf hf-' + n + '" data-stage="' + n + '" d="' + d + '" fill="' + C.white + '" opacity="' + (on ? 1 : 0) + '"/>';
      });
      detail += part(ctx, 'headfeathers', hf, null);
    }
    const fill = adult ? C.white : chick ? C.down : C.brown;
    s += '<path d="' + base + '" fill="' + fill + '"/>' + clip(ctx, 'skull', base, detail) + '<path d="' + base + '"' + stroke(LINE) + '/>';
    s += eyesPart(ctx, o);
    s += beakPart(ctx, o);
    if (o.headFx) s += o.headFx;
    return place(o.x, o.y, o.rot || 0, o.s || 1, part(ctx, 'head', s, [0, 56]));
  }

  // ---------------------------------------------------------------------------
  // STANDING JUVENILE — shared by scruffy, missing, eating, landed
  // ---------------------------------------------------------------------------
  const ST = {
    body: [[204, 178], [252, 190], [288, 238], [298, 296], [278, 348], [212, 372], [148, 364], [110, 318], [112, 250], [156, 192]],
    belly: [[206, 244], [246, 264], [262, 312], [246, 352], [204, 364], [166, 352], [150, 312], [166, 266]],
    wingL: [[178, 216], [152, 200], [118, 212], [99, 252], [96, 306], [103, 350], [112, 390, 'c'], [126, 366, 'c'], [136, 396, 'c'], [148, 368, 'c'], [160, 388, 'c'], [166, 354, 'c'], [180, 306], [186, 256]],
    wingR: [[230, 216], [256, 200], [290, 212], [309, 252], [312, 306], [305, 350], [296, 390, 'c'], [283, 366, 'c'], [273, 394, 'c'], [262, 368, 'c'], [251, 386, 'c'], [244, 354, 'c'], [230, 306], [224, 256]],
    tail: [[152, 328], [114, 356], [80, 390, 'c'], [102, 392, 'c'], [90, 412, 'c'], [116, 404, 'c'], [114, 424, 'c'], [136, 402, 'c'], [172, 358]],
    shoulderL: [158, 208],
    shoulderR: [250, 208],
  };

  function bodyStand(ctx, o) {
    const adult = !!o.adult;
    const base = adult ? C.chocolate : C.brown;
    const bd = smooth(o.bodyPts || ST.body);
    let detail = '';
    if (adult) {
      detail += mottles(51, 6, [110, 180, 190, 190], 8, 14, C.chocolateLight);
      detail += scallops(170, 300, 4, 18, 9, C.chocolateLight) + scallops(186, 330, 3, 18, 9, C.chocolateLight);
    } else {
      detail += mottles(52, 10, [106, 176, 196, 196], 7, 15, C.brownDark);
      const bl = smooth(ST.belly);
      detail += '<path d="' + bl + '" fill="' + C.tan + '"/>';
      detail += mottles(53, 8, [150, 250, 112, 110], 6, 12, C.brownLight);
      detail += scallops(170, 286, 4, 17, 9) + scallops(180, 314, 4, 17, 9) + scallops(174, 342, 3, 17, 8);
    }
    let s = '';
    // tufts that poke out from behind the body edge
    s += tuft(286, 296, -16, 28, 15, base);
    s += tuft(114, 330, 196, 24, 13, base);
    s += shape(ctx, 'body', bd, base, detail);
    // neck ruff — hackles at wrong angles, under the head
    s += tuft(160, 196, 218, 30, 16, base) + tuft(250, 194, -36, 28, 15, base) + tuft(140, 214, 192, 24, 13, base);
    return part(ctx, 'body', s, [204, 372]);
  }

  function wingFolded(ctx, side, o) {
    const adult = !!o.adult;
    const base = adult ? C.chocolate : C.brown;
    const pts = side === 'l' ? ST.wingL : ST.wingR;
    const d = smooth(pts);
    let detail = mottles(side === 'l' ? 61 : 62, 6, side === 'l' ? [96, 200, 80, 190] : [230, 200, 80, 190], 6, 12, adult ? C.chocolateLight : C.brownDark);
    if (side === 'l') {
      detail += scallops(104, 262, 4, 16, 10, adult ? C.chocolateLight : C.brownDark);
      detail += '<path d="M 132 318 L 127 360 M 148 318 L 147 362"' + stroke(LINE_S) + '/>';
    } else {
      detail += '<path d="M 262 318 L 263 360 M 280 318 L 283 362"' + stroke(LINE_S) + '/>';
    }
    const shoulder = side === 'l' ? ST.shoulderL : ST.shoulderR;
    let s = shape(ctx, 'wing-' + side, d, base, detail);
    if (side === 'l' && !adult) s += tuft(104, 300, 172, 22, 12, base);
    return part(ctx, 'wing-' + side, s, shoulder);
  }

  const FEET_STAND = {
    l: [[[162, 398], [134, 398], [104, 420]], [[162, 398], [156, 418], [146, 434]], [[162, 398], [178, 412], [186, 428]]],
    r: [[[248, 398], [232, 412], [224, 428]], [[248, 398], [254, 418], [264, 434]], [[248, 398], [276, 398], [306, 420]]],
  };

  function pants(x, y, seed, fill) {
    return '<path d="' + fluff(x, y, 27, 25, 8, 0.14, seed) + '" fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + LINE + '" stroke-linejoin="round"/>';
  }

  function talonsStand(ctx, o) {
    const fill = o.adult ? C.chocolate : C.brown;
    const all = FEET_STAND.l.concat(FEET_STAND.r);
    let s = toes(all, C.talon, 20) + toeCreases(all) + clawsFor(all, 21, 12);
    s += pants(164, 376, 71, fill) + pants(246, 376, 72, fill);
    return part(ctx, 'talons', s, [205, 400]);
  }

  function tailStand(ctx, o) {
    const d = smooth(ST.tail);
    const fill = o.adult ? C.white : C.brownDark;
    const detail = o.adult ? '' : '<path d="' + smooth([[96, 380], [126, 356], [138, 372], [110, 402]]) + '" fill="' + C.tan + '"/>';
    return part(ctx, 'tail', shape(ctx, 'tail', d, fill, detail), [162, 340]);
  }

  // ---------------------------------------------------------------------------
  // FLYING BODY — side view facing right
  // ---------------------------------------------------------------------------
  const FL = {
    body: [[372, 196], [350, 160], [290, 146], [214, 158], [150, 186], [140, 204], [196, 234], [282, 248], [346, 234]],
    belly: [[330, 206], [300, 232], [240, 240], [196, 228], [230, 206], [290, 198]],
    tail: [[158, 180], [104, 160], [74, 164, 'c'], [88, 178, 'c'], [62, 186, 'c'], [84, 198, 'c'], [64, 212, 'c'], [92, 216, 'c'], [80, 232, 'c'], [112, 226], [160, 212]],
  };

  function bodyFly(ctx, o) {
    const d = smooth(FL.body);
    let detail = mottles(81, 10, [150, 150, 220, 90], 7, 14, C.brownDark);
    detail += '<path d="' + smooth(FL.belly) + '" fill="' + C.tan + '"/>';
    detail += mottles(82, 5, [210, 204, 110, 34], 5, 9, C.brownLight);
    detail += scallops(214, 182, 5, 18, 9) + scallops(236, 206, 4, 18, 9);
    let s = tuft(300, 150, -70, 22, 12, C.brown) + tuft(224, 236, 120, 22, 12, C.brown);
    s += shape(ctx, 'body', d, C.brown, detail);
    return part(ctx, 'body', s, [260, 200]);
  }

  function tailFly(ctx) {
    const d = smooth(FL.tail);
    return part(ctx, 'tail', shape(ctx, 'tail', d, C.brownDark, '<path d="M 70 196 L 130 188 L 130 206 Z" fill="' + C.tan + '"/>'), [156, 196]);
  }

  // Spread wings — a big mitten with four chunky finger feathers.
  const WINGS = {
    // raised on the up-stroke (determined): four fingers fanned back
    up: [[296, 182], [322, 142], [336, 94], [320, 24, 'c'], [306, 52, 'c'], [292, 6, 'c'], [280, 44, 'c'], [260, 8, 'c'], [254, 48, 'c'], [228, 24, 'c'], [230, 66, 'c'], [212, 78], [220, 104, 'c'], [206, 118, 'c'], [224, 132, 'c'], [214, 150, 'c'], [248, 170]],
    // hanging low and heavy (tired): fingers drooping
    down: [[300, 186], [330, 216], [344, 262], [330, 328, 'c'], [314, 306, 'c'], [304, 346, 'c'], [290, 314, 'c'], [274, 348, 'c'], [266, 310, 'c'], [246, 334, 'c'], [248, 292], [236, 276, 'c'], [248, 258, 'c'], [236, 240, 'c'], [256, 228, 'c'], [262, 204]],
    // swept back and up — the dive
    swept: [[300, 180], [292, 140], [264, 104], [214, 78], [146, 60, 'c'], [168, 82, 'c'], [124, 84, 'c'], [152, 100, 'c'], [112, 112, 'c'], [148, 122, 'c'], [120, 140, 'c'], [176, 142], [226, 160], [260, 178]],
  };

  function wingSpread(ctx, side, variant, o) {
    const pts = WINGS[variant];
    const d = smooth(pts);
    const back = side === 'r';
    const fill = back ? C.brownDark : C.brown;
    let detail = mottles(back ? 91 : 92, 7, [150, 10, 200, 340], 7, 14, back ? C.brown : C.brownDark);
    if (variant === 'up') {
      detail += '<path d="M 300 120 C 280 112 250 108 222 118"' + stroke(LINE_S) + '/>' + scallops(236, 146, 3, 18, 9);
      detail += '<path d="M 294 68 L 290 96 M 270 56 L 268 94 M 247 58 L 248 96"' + stroke(LINE_S) + '/>';
    } else if (variant === 'down') {
      detail += '<path d="M 326 250 C 300 262 270 262 240 250"' + stroke(LINE_S) + '/>' + scallops(246, 222, 3, 18, 9);
      detail += '<path d="M 314 284 L 312 300 M 292 290 L 290 314 M 266 288 L 262 314"' + stroke(LINE_S) + '/>';
    } else {
      detail += '<path d="M 272 118 C 240 116 206 108 180 96"' + stroke(LINE_S) + '/>' + scallops(212, 140, 3, 18, 9);
      detail += '<path d="M 180 80 L 200 96 M 160 96 L 186 108 M 150 118 L 178 122"' + stroke(LINE_S) + '/>';
    }
    let s = shape(ctx, 'wing-' + side + '-' + variant, d, fill, detail);
    const pivot = [pts[0][0] - 10, pts[0][1] - 4];
    const off = { up: [-34, -14, -8], down: [-30, -8, 8], swept: [-26, -22, -14] }[variant];
    const tf = back ? ' transform="translate(' + off[0] + ' ' + off[1] + ') rotate(' + off[2] + ' ' + pt(pivot) + ')"' : '';
    return part(ctx, 'wing-' + side, '<g' + tf + '>' + s + '</g>', back ? [pivot[0] + off[0], pivot[1] + off[1]] : pivot);
  }

  function talonsTucked(ctx) {
    const t = [[[200, 232], [176, 240], [150, 236]], [[200, 232], [180, 250], [156, 250]]];
    let s = toes(t, C.talon, 16) + clawsFor(t, 15, 10);
    s += pants(212, 226, 73, C.brown);
    return part(ctx, 'talons', s, [212, 226]);
  }

  function talonsDangle(ctx) {
    const t = [
      [[196, 286], [188, 306], [176, 314]], [[196, 286], [198, 308], [192, 320]], [[196, 286], [210, 300], [214, 314]],
      [[228, 290], [222, 310], [212, 320]], [[228, 290], [236, 312], [234, 324]], [[228, 290], [246, 300], [254, 314]],
    ];
    let s = '<path d="M 200 232 L 196 286 M 232 236 L 228 290"' + stroke(15 + LINE * 2 - 1) + '/>';
    s += '<path d="M 200 232 L 196 286 M 232 236 L 228 290"' + stroke(15, C.talon) + '/>';
    s += toes(t, C.talon, 14) + clawsFor(t, 13, 9);
    s += pants(200, 238, 74, C.brown) + pants(232, 242, 75, C.brown);
    return part(ctx, 'talons', s, [216, 236]);
  }

  function talonsReach(ctx) {
    // legs thrown forward past the beak, toes spread wide open
    const legs = 'M 276 240 Q 350 280 418 270 M 292 234 Q 368 252 428 236';
    let s = '<path d="' + legs + '"' + stroke(16 + LINE * 2 - 1) + '/>';
    s += '<path d="' + legs + '"' + stroke(16, C.talon) + '/>';
    const t = [
      [[418, 270], [440, 270], [456, 284]], [[418, 270], [440, 280], [446, 300]], [[418, 270], [420, 290], [410, 304]],
      [[428, 236], [452, 232], [470, 242]], [[428, 236], [452, 246], [460, 262]], [[428, 236], [440, 216], [458, 206]],
    ];
    s += toes(t, C.talon, 15) + clawsFor(t, 15, 10);
    s += pants(282, 236, 76, C.brown);
    return part(ctx, 'talons', s, [282, 236]);
  }

  // ---------------------------------------------------------------------------
  // POSES
  // ---------------------------------------------------------------------------
  const fx = (inner) => '<g class="eg-fx" data-part="fx">' + inner + '</g>';
  const drop = (x, y, s, fill) =>
    '<path d="M 0 -12 C 6 -4 10 2 10 7 C 10 13 5 17 0 17 C -5 17 -10 13 -10 7 C -10 2 -6 -4 0 -12 Z" transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')" fill="' + (fill || C.sweat) + '" stroke="' + C.ink + '" stroke-width="3" stroke-linejoin="round"/>';
  const looseFeather = (x, y, rot, s, fill) =>
    '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + (s || 1) + ')"><path d="M 0 -18 C 9 -10 10 6 0 18 C -10 6 -9 -10 0 -18 Z" fill="' + (fill || C.brown) + '" stroke="' + C.ink + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M 0 -14 L 0 22"' + stroke(3) + '/></g>';
  const speedLines = (lines) => lines.map((l) => '<path d="M ' + l[0] + ' ' + l[1] + ' l ' + l[2] + ' 0"' + stroke(5, C.ink) + ' opacity="0.9"/>').join('');

  function rig(ctx, inner, pivot) {
    return part(ctx, 'rig', inner, pivot);
  }

  const POSES = {
    runt: {
      label: 'Runt',
      note: 'Scene 1 — hunched, tiny, hugging himself against the storm.',
      viewBox: '0 -20 300 320',
      scale: 0.62,
      build(ctx) {
        let s = '';
        const nub = (x, y, rot, side, seed) => part(ctx, 'wing-' + side, place(x, y, rot, 1, '<path d="' + fluff(0, 0, 34, 19, 7, 0.14, seed) + '" fill="' + C.downDark + '" stroke="' + C.ink + '" stroke-width="' + LINE + '" stroke-linejoin="round"/>'), [x, y]);
        s += part(ctx, 'tail', '<path d="' + fluff(84, 250, 22, 14, 6, 0.2, 23) + '" fill="' + C.downDark + '" stroke="' + C.ink + '" stroke-width="' + LINE + '" stroke-linejoin="round"/>', [96, 244]);
        const ft = [
          [[124, 262], [104, 266], [88, 280]], [[124, 262], [122, 276], [114, 290]], [[124, 262], [138, 272], [142, 288]],
          [[178, 262], [168, 274], [166, 290]], [[178, 262], [184, 276], [192, 290]], [[178, 262], [198, 266], [214, 280]],
        ];
        s += part(ctx, 'talons', toes(ft, C.talon, 15) + clawsFor(ft, 15, 10), [150, 262]);
        const bodyD = fluff(150, 202, 86, 70, 15, 0.08, 24);
        s += part(ctx, 'body', shape(ctx, 'body', bodyD, C.down, '<path d="' + fluff(156, 226, 46, 36, 9, 0.12, 25) + '" fill="' + C.downLight + '"/>' + mottles(26, 5, [80, 150, 140, 110], 5, 9, C.downDark)), [150, 268]);
        // both stubby wings wrapped round the belly — hugging himself
        s += nub(210, 222, 152, 'r', 22);
        s += nub(92, 224, 26, 'l', 21);
        s += headPart(ctx, { x: 150, y: 130, rot: 6, s: 0.88, chick: true, expr: 'worried', beakScale: 0.74, eyeNear: { cx: -16, cy: -6, rx: 27, ry: 31 }, eyeFar: { cx: 36, cy: -8, rx: 22, ry: 27 } });
        s += fx(
          '<path d="M 36 176 q -8 10 0 20 M 22 182 q -8 10 0 20 M 264 176 q 8 10 0 20 M 278 182 q 8 10 0 20"' + stroke(4) + '/>' +
          drop(196, 30, 0.8, C.water)
        );
        return rig(ctx, s, [150, 290]);
      },
    },

    scruffy: {
      label: 'Scruffy',
      note: 'Scene 2 — standing on the mudflat, permanently hungry.',
      viewBox: '0 -10 420 450',
      scale: 1,
      build(ctx) {
        let s = tailStand(ctx, {});
        s += wingFolded(ctx, 'r', {});
        s += talonsStand(ctx, {});
        s += bodyStand(ctx, {});
        s += wingFolded(ctx, 'l', {});
        s += headPart(ctx, { x: 214, y: 142, rot: -4, expr: 'hungry', headFx: drop(112, 62, 0.55, C.water) });
        return rig(ctx, s, [205, 430]);
      },
    },

    diving: {
      label: 'Diving',
      note: 'Scene 5 — locked on, wings back, talons first.',
      viewBox: '0 -30 520 470',
      scale: 1,
      build(ctx) {
        let s = wingSpread(ctx, 'r', 'swept', {});
        s += tailFly(ctx);
        s += bodyFly(ctx);
        s += talonsReach(ctx);
        s += wingSpread(ctx, 'l', 'swept', {});
        s += headPart(ctx, { x: 372, y: 170, rot: -10, s: 0.9, expr: 'focused' });
        const body = place(280, 200, 30, 1, '<g transform="translate(-280 -200)">' + s + '</g>');
        const lines = fx(speedLines([[40, 20, 70], [20, 60, 90], [60, 100, 60], [10, 140, 70]]).replace(/<path/g, '<path transform="rotate(30 120 90)"'));
        return rig(ctx, lines + body, [280, 200]);
      },
    },

    missing: {
      label: 'Missing',
      note: 'Scene 5 — empty talons. Annoyed. Trying again.',
      viewBox: '0 -10 420 450',
      scale: 1,
      build(ctx) {
        let s = tailStand(ctx, {});
        s += wingFolded(ctx, 'r', {});
        // standing on one foot; the other held up, open and empty
        const stand = FEET_STAND.l;
        let t = toes(stand, C.talon, 20) + toeCreases(stand) + clawsFor(stand, 21, 12) + pants(164, 376, 71, C.brown);
        s += part(ctx, 'talons', t, [205, 400]);
        s += bodyStand(ctx, {});
        // raised empty foot, sole to camera, claws splayed
        const up = [
          [[302, 262], [300, 232], [290, 206]], [[302, 262], [318, 236], [322, 206]], [[302, 262], [334, 250], [350, 228]], [[302, 262], [280, 264], [266, 250]],
        ];
        let raised = '<path d="M 270 318 Q 298 300 302 262"' + stroke(18 + LINE * 2 - 1) + '/><path d="M 270 318 Q 298 300 302 262"' + stroke(18, C.talon) + '/>';
        raised += toes(up, C.talon, 18) + clawsFor(up, 19, 11);
        raised += '<circle cx="302" cy="258" r="13" fill="' + C.talonShade + '"/>';
        raised += '<path d="' + fluff(262, 322, 30, 24, 8, 0.14, 77) + '" fill="' + C.brown + '" stroke="' + C.ink + '" stroke-width="' + LINE + '" stroke-linejoin="round"/>';
        s += '<g class="eg-talon-raised" data-part="talon-raised" data-pivot="262 322">' + raised + '</g>';
        s += wingFolded(ctx, 'l', {});
        s += headPart(ctx, { x: 206, y: 144, rot: 6, expr: 'annoyed', beak: 'grin' });
        s += fx(drop(296, 300, 0.7, C.water) + drop(334, 290, 0.5, C.water) + '<path d="M 320 70 q 10 -14 20 0 q 10 14 20 0 M 330 50 q 8 -10 16 0"' + stroke(4) + '/>');
        return rig(ctx, s, [205, 430]);
      },
    },

    'flying-tired': {
      label: 'Flying — tired',
      note: 'Scene 3 — the long flight. Wings heavy.',
      viewBox: '30 -20 460 400',
      scale: 1,
      build(ctx) {
        let s = wingSpread(ctx, 'r', 'down', {});
        s += tailFly(ctx);
        s += talonsDangle(ctx);
        s += bodyFly(ctx);
        s += wingSpread(ctx, 'l', 'down', {});
        s += headPart(ctx, { x: 374, y: 172, rot: 16, s: 0.9, expr: 'tired', beak: 'open' });
        s += fx(drop(432, 104, 0.7) + drop(452, 132, 0.5) + looseFeather(120, 290, 40, 0.9));
        return rig(ctx, place(260, 200, 6, 1, '<g transform="translate(-260 -200)">' + s + '</g>'), [260, 200]);
      },
    },

    'flying-determined': {
      label: 'Flying — determined',
      note: 'Scene 3 → 7 — found his second wind.',
      viewBox: '30 -60 460 360',
      scale: 1,
      build(ctx) {
        let s = wingSpread(ctx, 'r', 'up', {});
        s += tailFly(ctx);
        s += talonsTucked(ctx);
        s += bodyFly(ctx);
        s += wingSpread(ctx, 'l', 'up', {});
        s += headPart(ctx, { x: 378, y: 160, rot: -8, s: 0.9, expr: 'determined' });
        s += fx(speedLines([[40, 120, 70], [20, 160, 90], [50, 250, 60]]));
        return rig(ctx, place(260, 200, -6, 1, '<g transform="translate(-260 -200)">' + s + '</g>'), [260, 200]);
      },
    },

    landed: {
      label: 'Landed',
      note: 'Scene 4 — first branch. Wings still settling.',
      viewBox: '-20 -10 460 470',
      scale: 1,
      build(ctx) {
        let s = '';
        s += '<g class="eg-prop" data-part="prop">' +
          '<path d="M -14 414 C 40 404 110 398 180 402 C 250 406 330 398 400 406 C 420 408 436 412 446 418 C 440 432 436 440 440 446 C 380 440 300 444 220 440 C 140 436 60 444 -14 442 C -10 432 -10 422 -14 414 Z" fill="' + C.branch + '" stroke="' + C.ink + '" stroke-width="' + LINE + '" stroke-linejoin="round"/>' +
          '<path d="M 10 426 C 50 422 80 426 110 424 M 190 428 C 230 424 262 430 300 426 M 340 424 C 370 420 396 424 420 428"' + stroke(LINE_S, C.branchDark) + '/>' +
          '<ellipse cx="150" cy="424" rx="10" ry="6" fill="' + C.branchDark + '" stroke="' + C.ink + '" stroke-width="3"/>' +
          '<path d="M 372 404 C 392 380 400 360 420 350"' + stroke(14 + LINE * 2 - 1) + '/><path d="M 372 404 C 392 380 400 360 420 350"' + stroke(14, C.branch) + '/>' +
          '</g>';
        s += tailStand(ctx, {});
        // wings flared out, still balancing from the landing
        s += part(ctx, 'wing-r', '<g transform="rotate(-38 252 208)">' + wingFolded(ctx, 'r', {}).replace(/ id="eagle-wing-r"/, '').replace('data-part="wing-r"', 'data-part="wing-r-inner"') + '</g>', ST.shoulderR);
        // feet wrapped round the branch
        const grip = [
          [[160, 388], [138, 396], [128, 414]], [[160, 388], [156, 402], [152, 418]], [[160, 388], [176, 400], [180, 416]],
          [[248, 388], [232, 400], [228, 416]], [[248, 388], [254, 402], [258, 418]], [[248, 388], [270, 396], [282, 414]],
        ];
        s += part(ctx, 'talons', toes(grip, C.talon, 19) + toeCreases(grip) + clawsFor(grip, 18, 11) + pants(164, 372, 71, C.brown) + pants(246, 372, 72, C.brown), [205, 400]);
        s += bodyStand(ctx, {});
        s += part(ctx, 'wing-l', '<g transform="rotate(34 158 208)">' + wingFolded(ctx, 'l', {}).replace(/ id="eagle-wing-l"/, '').replace('data-part="wing-l"', 'data-part="wing-l-inner"') + '</g>', ST.shoulderL);
        s += headPart(ctx, { x: 210, y: 140, rot: -8, expr: 'amazed', beak: 'grin' });
        s += fx(looseFeather(60, 120, -30, 0.8) + looseFeather(360, 90, 25, 0.7) + looseFeather(330, 250, 70, 0.6));
        return rig(ctx, s, [205, 404]);
      },
    },

    eating: {
      label: 'Eating',
      note: 'Scene 5 — mouth full. Happiest bird on the river.',
      viewBox: '0 -10 440 450',
      scale: 1,
      build(ctx) {
        let s = tailStand(ctx, {});
        s += part(ctx, 'wing-r', '<g transform="rotate(-22 252 208)">' + wingFolded(ctx, 'r', {}).replace(/ id="eagle-wing-r"/, '').replace('data-part="wing-r"', 'data-part="wing-r-inner"') + '</g>', ST.shoulderR);
        s += talonsStand(ctx, {});
        s += bodyStand(ctx, {});
        // the catch — pinned under one big foot
        const fish =
          '<g class="eg-prop" data-part="prop">' +
          '<path d="M 232 396 C 262 360 340 352 384 376 L 424 352 L 418 392 L 432 426 L 390 408 C 344 434 262 430 232 396 Z" fill="' + C.salmon + '" stroke="' + C.ink + '" stroke-width="' + LINE + '" stroke-linejoin="round"/>' +
          '<path d="M 250 404 C 290 420 340 420 380 404 C 340 426 280 428 250 404 Z" fill="' + C.salmonLight + '"/>' +
          '<path d="M 266 374 C 300 362 344 362 372 376"' + stroke(LINE_S, C.salmonDark) + '/>' +
          '<circle cx="258" cy="386" r="6" fill="#fff" stroke="' + C.ink + '" stroke-width="3"/><circle cx="259" cy="386" r="2.6" fill="' + C.ink + '"/>' +
          '<path d="M 300 366 q 6 -8 12 0 q 6 -8 12 0 q 6 -8 12 0"' + ' fill="' + C.salmonLight + '" stroke="' + C.ink + '" stroke-width="3.5" stroke-linejoin="round"/>' +
          '</g>';
        s += fish;
        const grip = [[[300, 370], [300, 388], [290, 400]], [[300, 370], [318, 388], [320, 404]], [[300, 370], [334, 380], [346, 396]]];
        s += '<g class="eg-talon-grip" data-part="talon-grip">' + toes(grip, C.talon, 18) + clawsFor(grip, 17, 11) + '</g>';
        s += part(ctx, 'wing-l', '<g transform="rotate(20 158 208)">' + wingFolded(ctx, 'l', {}).replace(/ id="eagle-wing-l"/, '').replace('data-part="wing-l"', 'data-part="wing-l-inner"') + '</g>', ST.shoulderL);
        s += headPart(ctx, { x: 212, y: 144, rot: 6, expr: 'happy', beak: 'full' });
        s += fx(
          '<circle cx="352" cy="120" r="5" fill="' + C.salmonLight + '" stroke="' + C.ink + '" stroke-width="2.5"/>' +
          '<circle cx="372" cy="150" r="3.5" fill="' + C.salmonLight + '" stroke="' + C.ink + '" stroke-width="2.5"/>' +
          '<path d="M 60 110 l 0 -22 M 49 99 l 22 0 M 360 40 l 0 -18 M 351 31 l 18 0"' + stroke(4, C.ink) + '/>'
        );
        return rig(ctx, s, [205, 430]);
      },
    },

    'adult-white-head': {
      label: 'Adult — white head',
      note: 'Scene 6-7 — proud. Still a little goofy.',
      viewBox: '0 -20 420 460',
      scale: 1.04,
      plumage: 6,
      build(ctx) {
        const o = { adult: true };
        let s = tailStand(ctx, o);
        s += wingFolded(ctx, 'r', o);
        s += talonsStand(ctx, o);
        s += bodyStand(ctx, { adult: true, bodyPts: [[204, 172], [256, 184], [294, 234], [302, 296], [280, 350], [212, 374], [146, 366], [108, 318], [110, 248], [152, 186]] });
        // wing on the hip — proud
        s += part(ctx, 'wing-l', '<g transform="rotate(26 158 208)">' + wingFolded(ctx, 'l', o).replace(/ id="eagle-wing-l"/, '').replace('data-part="wing-l"', 'data-part="wing-l-inner"') + '</g>', ST.shoulderL);
        s += headPart(ctx, { x: 214, y: 126, rot: -12, adult: true, expr: 'proud', beak: 'grin', eyeNear: { cx: -16, cy: -10, rx: 26, ry: 30 }, eyeFar: { cx: 36, cy: -12, rx: 19, ry: 24 } });
        return rig(ctx, s, [205, 430]);
      },
    },
  };

  // Supporting cast (not the hero) — shown on the model sheet.
  const CAST = {
    sibling: {
      label: 'Big sibling',
      note: 'Scene 1 — bigger, fluffier, no white feather.',
      viewBox: '0 -20 320 320',
      scale: 0.78,
      build(ctx) {
        let s = '';
        const ft = [
          [[128, 272], [106, 276], [90, 290]], [[128, 272], [126, 286], [118, 300]], [[128, 272], [142, 282], [146, 298]],
          [[192, 272], [182, 284], [180, 300]], [[192, 272], [198, 286], [206, 300]], [[192, 272], [214, 276], [230, 290]],
        ];
        s += toes(ft, C.talon, 15) + clawsFor(ft, 15, 10);
        const bodyD = fluff(160, 196, 104, 86, 16, 0.07, 124);
        s += shape(ctx, 'sib-body', bodyD, C.downDark, '<path d="' + fluff(166, 220, 60, 48, 9, 0.12, 125) + '" fill="' + C.down + '"/>');
        s += '<path d="' + fluff(84, 190, 30, 22, 7, 0.14, 126) + '" fill="' + C.downDark + '" stroke="' + C.ink + '" stroke-width="' + LINE + '"/>';
        const sub = { uid: ctx.uid + 's', canonical: false, defs: ctx.defs, plumage: 0 };
        let h = headPart(sub, { x: 166, y: 104, rot: -6, s: 1, chick: true, expr: 'smug', eyeNear: { cx: -16, cy: -8, rx: 22, ry: 25 }, eyeFar: { cx: 34, cy: -10, rx: 19, ry: 22 } });
        // big sibling has no white feather
        h = h.replace(/<g class="eg-signature-feather"[\s\S]*?<\/g>/, '');
        h = h.split(C.down).join(C.downDark);
        s += h;
        return '<g class="eg-rig" data-part="rig">' + s + '</g>';
      },
    },
  };

  let counter = 0;

  function render(name, opts) {
    opts = opts || {};
    const pose = POSES[name] || CAST[name];
    if (!pose) throw new Error('Unknown pose: ' + name);
    const ctx = {
      uid: opts.uid || 'eg' + (++counter).toString(36),
      canonical: !!opts.canonicalIds,
      defs: [],
      plumage: opts.plumage != null ? opts.plumage : pose.plumage || 0,
    };
    const inner = pose.build(ctx, opts);
    const title = opts.title != null ? opts.title : 'The young eagle — ' + pose.label.toLowerCase();
    const cls = 'eagle' + (opts.className ? ' ' + opts.className : '');
    const vb = pose.viewBox.split(' ');
    const size = opts.intrinsic ? ' width="' + vb[2] + '" height="' + vb[3] + '"' : '';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + pose.viewBox + '"' + size + ' class="' + cls + '" data-pose="' + name + '" data-plumage="' + ctx.plumage + '" role="img" aria-label="' + title + '">' +
      (title ? '<title>' + title + '</title>' : '') +
      '<defs>' + ctx.defs.join('') + '</defs>' +
      inner +
      '</svg>'
    );
  }

  // Head only — plumage icons for the milestone timeline (stage 0-6).
  function renderHead(stage, opts) {
    opts = opts || {};
    const ctx = { uid: opts.uid || 'eh' + (++counter).toString(36), canonical: false, defs: [], plumage: stage };
    const adult = stage >= 6;
    const inner = headPart(ctx, { x: 0, y: 0, rot: -4, expr: opts.expr || (adult ? 'proud' : 'hungry'), beak: opts.beak, adult: false });
    const title = opts.title != null ? opts.title : 'Plumage stage ' + stage + ' of 6';
    const size = opts.intrinsic ? ' width="232" height="236"' : '';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-96 -150 232 236"' + size + ' class="eagle-head-icon" data-plumage="' + stage + '" role="img" aria-label="' + title + '">' +
      '<title>' + title + '</title><defs>' + ctx.defs.join('') + '</defs>' + inner + '</svg>'
    );
  }

  // ---------------------------------------------------------------------------
  // LIVE RIG — browser only. One shared animation loop drives every mounted
  // eagle that is on screen: blink, breathing, head tilt + pupils toward the
  // cursor, feather lag/overshoot, hops, pose swaps, plumage changes.
  // Writes SVG transform attributes only; nothing runs under reduced motion.
  // ---------------------------------------------------------------------------

  // Per-pose motion: wing flap [amplitude deg, period s], body bob, airborne.
  const MOTION = {
    runt: { flap: [4, 0.18], bob: 0, shiver: 1.2 },
    scruffy: { flap: [1.6, 2], bob: 0 },
    diving: { flap: [3, 0.22], bob: 3, air: true },
    missing: { flap: [2.5, 2], bob: 0 },
    'flying-tired': { flap: [13, 1.7], bob: 8, air: true, sync: true },
    'flying-determined': { flap: [20, 0.75], bob: 5, air: true, sync: true },
    landed: { flap: [5, 1.1], bob: 0 },
    eating: { flap: [3, 0.9], bob: 0, chew: true },
    'adult-white-head': { flap: [1.4, 2], bob: 0 },
    sibling: { flap: [0, 2], bob: 0 },
  };

  const LiveRuntime = (function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    const rigs = new Set();
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight * 0.35, seen: false, at: 0 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let lastT = 0;
    let io = null;

    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const f3 = (n) => Math.round(n * 1000) / 1000;
    const onPointer = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
      pointer.at = performance.now();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });

    function setTf(el, p, x, y, r, sx, sy) {
      if (!el) return;
      el.setAttribute(
        'transform',
        'translate(' + f3(x + p[0]) + ' ' + f3(y + p[1]) + ') rotate(' + f3(r) + ') scale(' + f3(sx) + ' ' + f3(sy) + ') translate(' + -p[0] + ' ' + -p[1] + ')'
      );
    }

    // Damped spring — underdamped on purpose, so feathers overshoot.
    function spring(s, target, k, c, dt) {
      const a = -k * (s.x - target) - c * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      return s.x;
    }

    function running() {
      return !reduce.matches && !document.hidden;
    }

    function ensureLoop() {
      if (raf || !running()) return;
      for (const r of rigs) if (r.visible) { lastT = performance.now(); raf = requestAnimationFrame(frame); return; }
    }

    function frame(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
      lastT = now;
      let any = false;
      for (const r of rigs) if (r.visible) { r.step(now, dt); any = true; }
      if (any && running()) raf = requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', ensureLoop);
    reduce.addEventListener && reduce.addEventListener('change', () => {
      for (const r of rigs) r.rest();
      ensureLoop();
    });

    function observe(rig) {
      if (!('IntersectionObserver' in window)) { rig.visible = true; return; }
      if (!io) {
        io = new IntersectionObserver((entries) => {
          entries.forEach((en) => { if (en.target.__eagleRig) en.target.__eagleRig.visible = en.isIntersecting; });
          ensureLoop();
        }, { rootMargin: '120px' });
      }
      io.observe(rig.host);
    }

    let uidN = 0;

    function LiveRig(host, pose, opts) {
      this.host = host;
      this.opts = opts || {};
      this.pose = pose;
      this.uid = this.opts.uid || 'lr' + (++uidN).toString(36);
      const p = POSES[pose] || CAST[pose];
      this.plumage = this.opts.plumage != null ? this.opts.plumage : (p && p.plumage) || 0;
      this.visible = false;
      this.blinkAt = performance.now() + 1200 + Math.random() * 2500;
      this.blinkStart = -1;
      this.hopStart = -1;
      this.popStart = -1;
      this.swapStart = -1;
      this.pendingPose = null;
      this.phase = Math.random() * 10;
      this.head = { x: 0, v: 0 };
      this.gaze = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 } };
      this.prevHead = 0;
      this.prevY = 0;
      host.__eagleRig = this;
      this.build();
      rigs.add(this);
      observe(this);
      ensureLoop();
    }

    LiveRig.prototype.build = function () {
      this.host.innerHTML = render(this.pose, {
        uid: this.uid,
        canonicalIds: !!this.opts.canonicalIds,
        plumage: this.plumage,
        intrinsic: this.opts.intrinsic !== false,
        className: this.opts.className,
        title: this.opts.title,
      });
      const svg = (this.svg = this.host.querySelector('svg'));
      const q = (n) => svg.querySelector('[data-part="' + n + '"]');
      const pv = (el) => (el && el.getAttribute('data-pivot') ? el.getAttribute('data-pivot').split(' ').map(Number) : [0, 0]);
      const P = (this.parts = {});
      ['rig', 'head', 'eyes', 'pupils', 'wing-l', 'wing-r', 'body', 'tail', 'signature-feather'].forEach((n) => {
        const el = q(n);
        P[n] = el ? { el: el, p: pv(el) } : null;
      });
      this.headWrap = P.head ? P.head.el.parentNode : null;
      this.feathers = [];
      svg.querySelectorAll('.scruff').forEach((el) => {
        this.feathers.push({ el: el, p: pv(el), s: { x: 0, v: 0 }, inHead: !!el.closest('[data-part="head"]'), gain: 0.6 + Math.random() * 0.6, ph: Math.random() * 6 });
      });
      if (P['signature-feather']) this.feathers.push({ el: P['signature-feather'].el, p: P['signature-feather'].p, s: { x: 0, v: 0 }, inHead: true, gain: 1.5, ph: 0, sig: true });
      this.motion = MOTION[this.pose] || MOTION.scruffy;
      this.applyPlumage(false);
    };

    // Pointer → head-local coordinates (via the head's static placement group).
    LiveRig.prototype.localPointer = function () {
      if (!this.headWrap || !this.headWrap.getScreenCTM) return null;
      const m = this.headWrap.getScreenCTM();
      if (!m) return null;
      const inv = m.inverse();
      return { x: inv.a * pointer.x + inv.c * pointer.y + inv.e, y: inv.b * pointer.x + inv.d * pointer.y + inv.f };
    };

    LiveRig.prototype.step = function (now, dt) {
      const P = this.parts;
      const M = this.motion;
      const t = now / 1000 + this.phase;

      // 1. Whole body: breathing (2s), airborne bob, hop, pose-swap squash, shiver.
      const br = Math.sin((t * Math.PI * 2) / 2);
      let y = M.air ? Math.sin(t * Math.PI * 2 / (M.flap[1] * 1.0)) * M.bob : 0;
      let sx = 1 - 0.008 * br;
      let sy = 1 + 0.016 * br;
      let rx = M.shiver ? Math.sin(t * 60) * M.shiver : 0;
      if (this.hopStart >= 0) {
        const u = (now - this.hopStart) / 560;
        if (u >= 1) this.hopStart = -1;
        else if (u < 0.14) { const k = u / 0.14; sy *= 1 - 0.12 * k; sx *= 1 + 0.08 * k; }
        else if (u < 0.72) { const k = (u - 0.14) / 0.58; y -= 46 * Math.sin(Math.PI * k); sy *= 1.06; sx *= 0.96; }
        else { const k = (u - 0.72) / 0.28; const d = Math.sin(Math.PI * k) * (1 - k); sy *= 1 - 0.14 * d; sx *= 1 + 0.1 * d; }
      }
      if (this.swapStart >= 0) {
        const u = (now - this.swapStart) / 420;
        if (u < 0.3) { sy *= 1 - 0.18 * (u / 0.3); sx *= 1 + 0.1 * (u / 0.3); }
        else if (this.pendingPose) { this.pose = this.pendingPose; this.pendingPose = null; this.build(); }
        else if (u < 1) { const k = (u - 0.3) / 0.7; const e = Math.exp(-5 * k) * Math.cos(k * 11); sy *= 1 + 0.16 * e; sx *= 1 - 0.1 * e; }
        else this.swapStart = -1;
      }
      const P2 = this.parts;
      if (P2.rig) setTf(P2.rig.el, P2.rig.p, rx, y, 0, sx, sy);
      const velY = (y - this.prevY) / dt;
      this.prevY = y;

      // 2. Wings: breathing sway when standing, a real flap in the air.
      const [amp, per] = M.flap;
      const w = Math.sin((t * Math.PI * 2) / per);
      if (P2['wing-l']) setTf(P2['wing-l'].el, P2['wing-l'].p, 0, 0, M.sync ? w * amp : w * amp, 1, M.sync ? 1 - 0.12 * Math.abs(w) : 1);
      if (P2['wing-r']) setTf(P2['wing-r'].el, P2['wing-r'].p, 0, 0, M.sync ? Math.sin((t - 0.06) * Math.PI * 2 / per) * amp * 0.9 : -w * amp, 1, 1);

      // 3. Head: tilt toward the cursor (idle wander when there is none), bob, milestone pop.
      const lp = this.localPointer();
      const idle = !pointer.seen || now - pointer.at > 5000 || this.opts.follow === false;
      let gx, gy, tilt;
      if (idle || !lp) {
        gx = Math.sin(t * 0.37) * 0.8 + Math.sin(t * 0.13) * 0.3;
        gy = Math.sin(t * 0.29 + 1) * 0.5;
        tilt = Math.sin(t * 0.21) * 3;
      } else {
        const dx = lp.x - 10, dy = lp.y + 10;
        const len = Math.hypot(dx, dy) || 1;
        const reach = clamp(len / 160, 0, 1);
        gx = (dx / len) * reach;
        gy = (dy / len) * reach;
        tilt = clamp(clamp(dy / 320, -1, 1) * 9 + clamp(dx / 520, -1, 1) * 3, -11, 11);
      }
      const hr = spring(this.head, tilt, 55, 11, dt);
      const hVel = (hr - this.prevHead) / dt;
      this.prevHead = hr;
      let hs = 1;
      if (this.popStart >= 0) {
        const u = (now - this.popStart) / 700;
        if (u >= 1) this.popStart = -1;
        else hs = 1 + 0.14 * Math.exp(-4.5 * u) * Math.cos(u * 14);
      }
      const chew = M.chew ? Math.max(0, Math.sin(t * 9)) * 2.5 : 0;
      if (P2.head) setTf(P2.head.el, P2.head.p, 0, br * 1.4 + chew, hr, hs, hs);

      // 4. Pupils: ease toward the gaze, clipped to the whites.
      const px = spring(this.gaze.x, gx * 7, 90, 16, dt);
      const py = spring(this.gaze.y, gy * 6, 90, 16, dt);
      if (P2.pupils) setTf(P2.pupils.el, P2.pupils.p, px, py, 0, 1, 1);

      // 5. Blink every 3–5s, sometimes twice.
      if (this.blinkStart < 0 && now >= this.blinkAt) this.blinkStart = now;
      let bs = 1;
      if (this.blinkStart >= 0) {
        const u = (now - this.blinkStart) / 150;
        if (u >= 1) {
          this.blinkStart = -1;
          this.blinkAt = now + (Math.random() < 0.15 ? 110 : 3000 + Math.random() * 2000);
        } else bs = 1 - 0.92 * Math.sin(Math.PI * u);
      }
      if (P2.eyes) setTf(P2.eyes.el, P2.eyes.p, 0, 0, 0, 1, bs);

      // 6. Secondary motion: every loose feather lags behind and overshoots.
      for (const f of this.feathers) {
        const drive = (f.inHead ? -hVel * 0.12 : 0) - velY * 0.05 * f.gain + (f.sig ? Math.sin(t * 1.3) * 2.5 : Math.sin(t * 1.7 + f.ph) * 1.2);
        const a = spring(f.s, clamp(drive * f.gain, -24, 24), 140, 7, dt);
        setTf(f.el, f.p, 0, 0, a, 1, 1);
      }
    };

    // Clear every animated transform (reduced motion / static).
    LiveRig.prototype.rest = function () {
      if (!this.svg) return;
      Object.values(this.parts).forEach((p) => p && p.el.removeAttribute('transform'));
      this.feathers.forEach((f) => f.el.removeAttribute('transform'));
    };

    LiveRig.prototype.applyPlumage = function (animate) {
      const stage = this.plumage;
      const svg = this.svg;
      svg.setAttribute('data-plumage', stage);
      if ((POSES[this.pose] || {}).plumage === 6) return; // the adult is already white
      const fade = animate && !reduce.matches ? 'opacity 0.7s cubic-bezier(.22,1,.36,1)' : 'none';
      for (let n = 1; n <= 6; n++) {
        svg.querySelectorAll('.hf-' + n).forEach((el) => {
          el.style.transition = fade;
          el.style.opacity = stage >= n ? 1 : 0;
        });
      }
      svg.querySelectorAll('.beak-adult').forEach((el) => {
        el.style.transition = fade;
        el.style.opacity = clamp((stage - 2) / 4, 0, 1);
      });
    };

    LiveRig.prototype.setPlumage = function (stage, animate) {
      stage = clamp(Math.round(stage), 0, 6);
      const up = stage > this.plumage;
      this.plumage = stage;
      this.applyPlumage(animate !== false);
      if (up && animate !== false) {
        this.popStart = performance.now();
        const sig = this.feathers.find((f) => f.sig);
        if (sig) sig.s.v -= 220;
      }
      ensureLoop();
    };

    LiveRig.prototype.setPose = function (pose) {
      if (!(POSES[pose] || CAST[pose]) || pose === this.pose) return;
      if (reduce.matches || !this.visible) { this.pose = pose; this.build(); return; }
      this.pendingPose = pose;
      this.swapStart = performance.now();
      ensureLoop();
    };

    LiveRig.prototype.hop = function (delay) {
      if (reduce.matches) return;
      const go = () => { this.hopStart = performance.now(); ensureLoop(); };
      delay ? setTimeout(go, delay) : go();
    };

    LiveRig.prototype.blink = function () {
      this.blinkAt = performance.now();
      ensureLoop();
    };

    LiveRig.prototype.destroy = function () {
      rigs.delete(this);
      if (io) io.unobserve(this.host);
      this.host.__eagleRig = null;
    };

    return {
      mount: (host, pose, opts) => new LiveRig(host, pose, opts),
      hopAll: () => { let i = 0; for (const r of rigs) if (r.visible) r.hop(i++ * 45); },
      instances: () => Array.from(rigs),
    };
  })();

  return {
    COLORS: C,
    LINE: LINE,
    POSES: Object.keys(POSES),
    CAST: Object.keys(CAST),
    meta: (name) => {
      const p = POSES[name] || CAST[name];
      return p ? { label: p.label, note: p.note, viewBox: p.viewBox, scale: p.scale } : null;
    },
    render: render,
    renderHead: renderHead,
    // live rig (browser only): EagleRig.mount(el, 'scruffy', { canonicalIds, plumage })
    mount: LiveRuntime ? LiveRuntime.mount : null,
    hopAll: LiveRuntime ? LiveRuntime.hopAll : function () {},
    instances: LiveRuntime ? LiveRuntime.instances : function () { return []; },
  };
});
