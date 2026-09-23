/*!
 * EAGLES GON EAT — js/scenes.js
 * The story: one pinned stage, one master timeline scrubbed by scroll.
 * Scenes hand over by colour and camera (cross-fade + move), never a hard cut.
 *
 * Timeline units are "screens": 1 unit = one viewport height of scrolling.
 * Everything animates transform or opacity only. Each scene's eagles and
 * flock are mounted just before the scene is reached (lazy init) and paused
 * while the scene is off stage.
 */
(function () {
  'use strict';

  const EGE = (window.EGE = window.EGE || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const mobile = () => window.matchMedia('(max-width: 700px)').matches;
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  const BASE_ROT = [-1.6, 1.1, -0.6]; // the headline's resting word tilt

  // --------------------------------------------------------------------------
  // Scene assets that are built by script
  // --------------------------------------------------------------------------

  // Scene 3 flock: brown specks on every horizon, all flying the same way.
  const BANDS = {
    far: { y: [22, 56], w: [18, 26], n: [22, 52], flap: [0.5, 0.8] },
    mid: { y: [30, 70], w: [28, 42], n: [18, 48], flap: [0.45, 0.7] },
    near: { y: [10, 86], w: [48, 72], n: [9, 24], flap: [0.35, 0.55] },
  };

  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function buildSpecks(scene) {
    const all = [];
    const small = mobile();
    Object.keys(BANDS).forEach((band, bi) => {
      const host = $('.specks[data-band="' + band + '"]', scene);
      if (!host || host.childElementCount) return;
      const B = BANDS[band];
      const R = seeded(97 + bi * 31);
      const n = small ? B.n[0] : B.n[1];
      for (let i = 0; i < n; i++) {
        const el = document.createElement('span');
        el.className = 'speck';
        const w = B.w[0] + R() * (B.w[1] - B.w[0]);
        el.style.cssText =
          'left:' + (3 + R() * 90).toFixed(1) + '%;top:' + (B.y[0] + R() * (B.y[1] - B.y[0])).toFixed(1) + '%;--w:' + w.toFixed(0) + 'px;' +
          '--flap:' + (B.flap[0] + R() * (B.flap[1] - B.flap[0])).toFixed(2) + 's;--delay:-' + (R() * 1).toFixed(2) + 's';
        el.innerHTML = '<img src="assets/sprites/speck.svg" alt="" width="64" height="36">';
        host.appendChild(el);
        all.push({ el: el, order: R(), band: band });
      }
    });
    // one by one: shuffle across every horizon, not band by band
    return all.sort((a, b) => a.order - b.order).map((s) => s.el);
  }


  // Scene 4: the council tree — drawn here so perches and branches share one geometry.
  const COUNCIL = {
    wide: [{ a: [490, 640], b: [110, 590] }, { a: [505, 560], b: [900, 520] }, { a: [488, 420], b: [190, 370] }, { a: [500, 320], b: [800, 290] }],
    narrow: [{ a: [490, 640], b: [250, 612] }, { a: [505, 560], b: [750, 532] }, { a: [488, 420], b: [270, 392] }, { a: [500, 320], b: [730, 298] }],
  };
  const PER_BRANCH = 6; // six to a branch — always, on every screen size

  function branchCtrl(br) { return [(br.a[0] + br.b[0]) / 2, (br.a[1] + br.b[1]) / 2 + 16]; }
  function branchPoint(br, t) {
    const c = branchCtrl(br), u = 1 - t;
    return [u * u * br.a[0] + 2 * u * t * c[0] + t * t * br.b[0], u * u * br.a[1] + 2 * u * t * c[1] + t * t * br.b[1]];
  }

  function treeSVG(branches) {
    const ink = '#17110D', bark = '#4A3423', hi = '#6B4B33';
    const path = (d, color, w) => '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
    const bd = branches.map((br) => 'M ' + br.a.join(' ') + ' Q ' + branchCtrl(br).join(' ') + ' ' + br.b.join(' ')).join(' ');
    let twigs = 'M 495 290 L 430 170 M 444 196 L 404 150 M 500 280 L 566 150 M 552 182 L 596 144 M 498 270 L 502 104';
    branches.forEach((br) => {
      const dir = br.b[0] < br.a[0] ? -1 : 1;
      twigs += ' M ' + br.b.join(' ') + ' l ' + dir * 34 + ' -30 M ' + branchPoint(br, 0.7).map(Math.round).join(' ') + ' l ' + dir * 10 + ' -54';
    });
    return (
      '<svg class="council__tree" viewBox="0 0 1000 900" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      path(twigs, ink, 17) + path(twigs, bark, 7) +
      path(bd, ink, 36) + path(bd, bark, 23) + path(bd.replace(/Q/g, 'Q'), hi, 5).replace('stroke-width="5"', 'stroke-width="5" transform="translate(0 -6)"') +
      '<path d="M 428 905 C 460 860 470 780 470 640 C 470 520 476 380 482 250 L 514 250 C 518 380 526 520 530 640 C 532 780 540 860 574 905 Z" fill="' + bark + '" stroke="' + ink + '" stroke-width="7" stroke-linejoin="round"/>' +
      path('M 492 820 q 6 -60 0 -120 M 506 600 q -6 -50 2 -110 M 496 420 q 4 -40 0 -80', hi, 5) +
      '</svg>'
    );
  }

  function buildCouncil(scene) {
    const host = $('.council', scene);
    if (!host || host.childElementCount) return host && host.__council;
    const narrow = mobile();
    const branches = narrow ? COUNCIL.narrow : COUNCIL.wide;
    host.innerHTML = treeSVG(branches);
    const R = seeded(404);
    const bw = narrow ? 84 : 108; // bird width in tree units (of 1000)
    const rows = [];
    const hero = $('.perch--hero', scene);
    branches.forEach((br, bi) => {
      const row = [];
      for (let i = 0; i < PER_BRANCH; i++) {
        const t = 0.2 + i * (0.72 / (PER_BRANCH - 1));
        const pt = branchPoint(br, t);
        const isHero = bi === 0 && i === 2;
        const w = isHero ? bw * 1.9 : bw * (0.9 + R() * 0.18);
        let el;
        if (isHero && hero) {
          el = hero;
          host.appendChild(el);
        } else {
          el = document.createElement('span');
          el.className = 'perch' + (R() < 0.5 ? ' is-flipped' : '');
          const white = R() < 0.4;
          el.innerHTML = '<img src="assets/sprites/crowd-' + (white ? 'white' : 'brown') + '.svg" alt="" width="130" height="140">';
          host.appendChild(el);
        }
        el.style.left = ((pt[0] - w / 2) / 10).toFixed(2) + '%';
        el.style.top = ((pt[1] - 10) / 9).toFixed(2) + '%';
        el.style.width = (w / 10).toFixed(2) + '%';
        row.push(el);
      }
      rows.push(row);
    });
    host.__council = { rows: rows, hero: hero };
    return host.__council;
  }

  // Scene 5: the feast — eaters in the shallows, salmon, flyers overhead, divers, confetti.
  function buildFeast(scene) {
    const feast = $('.feast', scene);
    if (!feast || feast.childElementCount) return scene.__feast;
    const small = mobile();
    const R = seeded(505);
    const add = (parent, src, css, cls) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.className = cls || '';
      img.style.cssText = css;
      parent.appendChild(img);
      return img;
    };
    const EATERS = [[6, 26, 13], [20, 14, 16], [30, 34, 10], [69, 32, 10], [80, 13, 17], [91, 28, 12], [39, 44, 7], [60, 45, 7], [14, 44, 6], [50, 48, 6]];
    const eaters = EATERS.slice(0, small ? 5 : 10).map((e, i) => {
      const src = ['brown-eat', 'white-eat', 'brown', 'white', 'brown-eat'][i % 5];
      return add(feast, 'assets/sprites/crowd-' + src + '.svg', 'left:' + e[0] + '%;bottom:' + e[1] + '%;width:' + (small ? e[2] * 1.5 + 'vw' : e[2] + 'vh') + ';margin-left:-' + (small ? e[2] * 0.75 + 'vw' : e[2] / 2 + 'vh') + ';' + (R() < 0.5 ? 'scale:-1 1' : ''));
    });
    const salmon = [];
    for (let i = 0; i < (small ? 4 : 8); i++) salmon.push(add(feast, 'assets/sprites/salmon.svg', 'left:' + (8 + R() * 80).toFixed(1) + '%;bottom:' + (18 + R() * 24).toFixed(1) + '%;width:' + (7 + R() * 5).toFixed(1) + 'vh;opacity:0'));
    const over = $('.overhead', scene);
    const flyers = [];
    for (let i = 0; i < (small ? 5 : 11); i++) {
      const big = R() < 0.45;
      flyers.push(add(over, 'assets/sprites/speck.svg', 'left:-18%;top:' + (4 + R() * 30).toFixed(1) + '%;width:' + (big ? 8 + R() * 5 : 4 + R() * 3).toFixed(1) + (small ? 'vw' : 'vh')));
    }
    const divers = [];
    for (let i = 0; i < (small ? 2 : 3); i++) divers.push(add(over, 'assets/sprites/speck.svg', 'left:' + (18 + i * 30) + '%;top:-20%;width:' + (9 + i * 2) + (small ? 'vw' : 'vh') + ';rotate:50deg'));
    const conf = $('.confetti', scene);
    const feathers = [];
    const cols = ['white', 'brown', 'gold'];
    for (let i = 0; i < (small ? 16 : 38); i++) feathers.push(add(conf, 'assets/sprites/feather-' + cols[i % 3] + '.svg', 'left:' + (R() * 100).toFixed(1) + '%;top:-12%;width:' + (2.2 + R() * 2.6).toFixed(1) + 'vh'));
    scene.__feast = { eaters: eaters, salmon: salmon, flyers: flyers, divers: divers, feathers: feathers };
    return scene.__feast;
  }

  // Chromatic ghosts of the feast headline (teal + salmon copies, no outline).
  function buildGhosts(scene) {
    const copy = $('.scene__copy--feast', scene);
    const hl = copy && $('.hl', copy);
    if (!hl || $('.scene__ghost', copy)) return [];
    return ['a', 'b'].map((k) => {
      const g = document.createElement('div');
      g.className = 'scene__ghost scene__ghost--' + k;
      g.setAttribute('aria-hidden', 'true');
      const h = hl.cloneNode(true);
      h.removeAttribute('id');
      g.appendChild(h);
      copy.insertBefore(g, hl);
      return g;
    });
  }

  function mountRigs(scene, proxies) {
    if (!window.EagleRig || !EagleRig.mount) return [];
    return $$('[data-live-pose]', scene).map((host) => {
      if (host.__eagleRig) return host.__eagleRig;
      const rig = EagleRig.mount(host, host.getAttribute('data-live-pose'), { title: (host.querySelector('img') || {}).alt || '' });
      const key = host.getAttribute('data-proxy');
      if (key && proxies[key]) rig.extra = proxies[key];
      return rig;
    });
  }

  // --------------------------------------------------------------------------
  // Headline helpers (scrubbed)
  // --------------------------------------------------------------------------
  function wordsIn(tl, words, at, dur) {
    if (!words.length) return;
    tl.fromTo(
      words,
      { yPercent: 130, opacity: 0, scale: 0.6, rotation: (i) => (i % 2 ? 16 : -16) },
      { yPercent: 0, opacity: 1, scale: 1, rotation: (i) => BASE_ROT[i % 3], ease: 'back.out(2.4)', duration: dur * 0.55, stagger: (dur * 0.45) / words.length },
      at
    );
  }

  function wordsOut(tl, words, at, dur) {
    if (!words.length) return;
    tl.to(words, { yPercent: -80, opacity: 0, ease: 'power2.in', duration: dur * 0.7, stagger: (dur * 0.3) / words.length }, at);
  }

  // --------------------------------------------------------------------------
  // Static mode: reduced motion / no GSAP — every scene shown as a still frame
  // --------------------------------------------------------------------------
  function initStatic(scenes) {
    document.documentElement.classList.add('is-static');
    scenes.forEach((scene) => {
      mountRigs(scene, {});
      if (scene.dataset.scene === '3') buildSpecks(scene);
      if (scene.dataset.scene === '4') buildCouncil(scene);
      if (scene.dataset.scene === '5') {
        const f = buildFeast(scene);
        f.salmon.forEach((el, i) => { el.style.opacity = i % 2 ? 0 : 1; el.style.transform = 'translateY(-60%) rotate(-20deg)'; });
      }
    });
    const s3 = $('.scene--3 [data-live-pose]');
    if (s3 && s3.__eagleRig) s3.__eagleRig.setPose('flying-determined');
    // simple fades as each frame arrives
    if ('IntersectionObserver' in window) {
      scenes.forEach((s) => s.classList.add('fade-ready'));
      const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')), { threshold: 0.15 });
      scenes.forEach((s) => io.observe(s));
    }
  }

  // --------------------------------------------------------------------------
  // Motion mode
  // --------------------------------------------------------------------------
  function initMotion(scenes) {
    const gsap = window.gsap;
    const root = document.documentElement;
    root.classList.add('is-motion');
    const m = mobile() ? 0.6 : 1;

    // Scroll-driven offsets for each eagle; the rig reads them every frame.
    const proxies = {
      runt: { x: 0, y: 0, rot: 0, headRot: 0, headY: 0 },
      sib: { x: 0, y: 0, rot: 0, headRot: 0, headY: 0 },
      scruffy: { x: 0, y: 0, rot: 0, headRot: 0, headY: 0 },
      flyer: { x: 0, y: 0, rot: 0, headRot: 0, headY: 0 },
    };
    $('.chick--runt').setAttribute('data-proxy', 'runt');
    $('.chick--sib').setAttribute('data-proxy', 'sib');
    $('.s2-eagle').setAttribute('data-proxy', 'scruffy');
    $('.s3-eagle').setAttribute('data-proxy', 'flyer');

    const S = {}; // scene start times
    const ranges = [];
    const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
    const [s1, s2, s3] = scenes;
    const q = (sc, sel) => $(sel, sc);
    const words = (sc, line) => $$('.scene__copy > .hl .w' + (line != null ? '[data-line="' + line + '"]' : ''), sc);
    const [, , , s4, s5] = scenes;

    gsap.set([s2, s3, s4, s5], { autoAlpha: 0 });

    /* ---------------- SCENE 1 — THE NEST (0 → 2.3) ---------------- */
    S[1] = 0;
    const cam1 = q(s1, '.scene__cam');
    gsap.set(cam1, { transformOrigin: mobile() ? '50% 50%' : '70% 50%' });
    tl.fromTo(cam1, { scale: 1.22 }, { scale: 1, duration: 1.0, ease: 'power1.inOut' }, 0);
    tl.to(q(s1, '.intro'), { y: () => -0.12 * H(), opacity: 0, duration: 0.45, ease: 'power1.in' }, 0.05);
    tl.fromTo(q(s1, '.layer--back'), { y: 0 }, { y: () => 0.04 * H() * m, duration: 2.3 }, 0);
    tl.fromTo(q(s1, '.layer--mid'), { y: 0 }, { y: () => -0.02 * H() * m, duration: 2.3 }, 0);
    tl.fromTo(q(s1, '.layer--front'), { y: 0 }, { y: () => -0.12 * H() * m, duration: 2.3 }, 0);
    $$('.leaf', s1).forEach((leaf, i) => {
      tl.fromTo(leaf, { x: 0, y: 0, rotation: 0 }, { x: () => (0.5 + i * 0.2) * W(), y: () => (-0.25 + i * 0.12) * H(), rotation: 540 + i * 200, duration: 1.8 }, 0.1 + i * 0.15);
    });
    wordsIn(tl, words(s1), 0.5, 0.6);
    // lightning: the big sibling looms, the runt flinches
    tl.to(q(s1, '.flash'), { opacity: 0.55, duration: 0.04 }, 0.95).to(q(s1, '.flash'), { opacity: 0, duration: 0.3 }, 0.99);
    tl.to(q(s1, '.s1-bolt'), { opacity: 1, duration: 0.03 }, 0.95).to(q(s1, '.s1-bolt'), { opacity: 0, duration: 0.35 }, 1.0);
    tl.to(proxies.sib, { x: 26, rot: 7, headRot: 8, duration: 0.4, ease: 'power2.out' }, 0.95);
    tl.to(proxies.runt, { y: 10, rot: -6, headRot: -6, duration: 0.3, ease: 'power2.out' }, 0.97);
    tl.to(proxies.runt, { y: 0, rot: 0, headRot: 0, duration: 0.4 }, 1.4);
    // camera tilts down the cliff toward the mudflat
    wordsOut(tl, words(s1), 1.65, 0.35);
    tl.to(cam1, { y: () => -0.32 * H(), scale: 1.12, duration: 0.65, ease: 'power2.in' }, 1.65);
    tl.to(s1, { autoAlpha: 0, duration: 0.3 }, 2.0);
    ranges.push([s1, 0, 2.3, ['runt', 'sib']]);

    /* ---------------- SCENE 2 — THE SCRAPS (2.0 → 4.6) ---------------- */
    const t2 = (S[2] = 2.0);
    const cam2 = q(s2, '.scene__cam');
    tl.to(s2, { autoAlpha: 1, duration: 0.3 }, t2);
    tl.fromTo(cam2, { y: () => 0.26 * H(), scale: 1.14 }, { y: 0, scale: 1, duration: 0.7, ease: 'power2.out' }, t2);
    tl.fromTo(q(s2, '.layer--back'), { x: 0 }, { x: () => -0.03 * W() * m, duration: 2.6 }, t2);
    tl.fromTo(q(s2, '.layer--mid'), { x: 0 }, { x: () => -0.05 * W() * m, duration: 2.6 }, t2);
    tl.fromTo(q(s2, '.layer--front'), { x: 0 }, { x: () => -0.1 * W() * m, duration: 2.6 }, t2);
    wordsIn(tl, words(s2), t2 + 0.45, 0.6);
    // pecking at something already dead
    [0.3, 0.75, 1.2, 1.6].forEach((p) => {
      tl.to(proxies.scruffy, { headRot: 30, headY: 18, rot: 3, duration: 0.12, ease: 'power2.in' }, t2 + p);
      tl.to(proxies.scruffy, { headRot: 0, headY: 0, rot: 0, duration: 0.2, ease: 'back.out(2)' }, t2 + p + 0.12);
    });
    // the taunts drift past; he doesn't look up
    $$('.taunt', s2).forEach((el, i) => {
      const dir = i === 1 ? 1 : -1;
      tl.fromTo(el, { x: () => -dir * 0.35 * W(), opacity: 0 }, { x: () => dir * 0.25 * W(), duration: 1.3 }, t2 + 0.35 + i * 0.45);
      tl.to(el, { opacity: 0.55, duration: 0.25 }, t2 + 0.35 + i * 0.45).to(el, { opacity: 0, duration: 0.3 }, t2 + 1.35 + i * 0.45);
    });
    // he takes off — out of frame, into the long flight
    wordsOut(tl, words(s2), t2 + 2.05, 0.3);
    tl.to(proxies.scruffy, { y: 24, duration: 0.12, ease: 'power2.in' }, t2 + 2.0);
    tl.to(proxies.scruffy, { x: 520, y: -620, rot: 22, duration: 0.5, ease: 'power2.in' }, t2 + 2.12);
    tl.to(cam2, { x: () => -0.18 * W(), y: () => 0.08 * H(), scale: 1.06, duration: 0.5, ease: 'power2.in' }, t2 + 2.1);
    tl.to(s2, { autoAlpha: 0, duration: 0.3 }, t2 + 2.3);
    ranges.push([s2, t2, t2 + 2.6, ['scruffy']]);

    /* ---------------- SCENE 3 — THE LONG FLIGHT (4.3 → 9.3) — the longest ---------------- */
    const t3 = (S[3] = t2 + 2.3);
    const D3 = 5.0;
    const cam3 = q(s3, '.scene__cam');
    tl.to(s3, { autoAlpha: 1, duration: 0.3 }, t3);
    tl.fromTo(cam3, { scale: 1.1 }, { scale: 0.96, duration: D3, ease: 'power1.inOut' }, t3);
    // Side-scrolling parallax: each strip is one viewport + one tile wide and is
    // wrapped by its tile width, so the layers stay small however far he flies.
    const strips = [['.strip--clouds', 0.35], ['.strip--far', 0.7], ['.strip--mid', 1.6], ['.strip--front', 3.2]].map(([sel, k]) => ({ el: q(s3, sel), k: k }));
    const setStrips = (t) => {
      const p = Math.max(0, Math.min(1, (t - t3) / D3));
      strips.forEach((st) => {
        const tile = s3.offsetHeight * 1.6 || 1;
        const dist = st.k * W() * (0.6 + 0.4 * m) * p;
        st.el.style.transform = 'translate3d(' + (-(dist % tile)).toFixed(1) + 'px,0,0)';
      });
    };
    const flyer = q(s3, '.s3-eagle');
    tl.fromTo(flyer, { x: () => -0.55 * W() }, { x: 0, duration: 0.7, ease: 'power2.out' }, t3);
    tl.to(proxies.flyer, { y: 30, rot: 6, duration: 1.4, ease: 'sine.inOut' }, t3 + 0.6); // sagging
    wordsIn(tl, words(s3, 0), t3 + 0.35, 0.6);
    // the emotional turn: brown specks, one by one, on every horizon
    const specks = buildSpecks(s3);
    const n = specks.length;
    const f0 = t3 + 1.15, span = 2.7;
    specks.forEach((el, i) => {
      const at = f0 + span * Math.pow(i / n, 0.55);
      tl.fromTo(el, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'back.out(3)' }, at);
    });
    [['far', 0.05], ['mid', 0.09], ['near', 0.16]].forEach(([b, k]) => {
      tl.fromTo(q(s3, '.specks--' + b), { x: 0 }, { x: () => k * W(), duration: D3 - 1, ease: 'sine.inOut' }, t3 + 1);
    });
    tl.to(proxies.flyer, { y: -20, rot: -6, duration: 0.8, ease: 'power2.out' }, t3 + 2.4); // second wind
    wordsIn(tl, words(s3, 1), t3 + 2.9, 0.6);
    tl.fromTo(q(s3, '.scene__glow'), { opacity: 0 }, { opacity: 1, duration: 1.8 }, t3 + 3.1);
    wordsOut(tl, words(s3), t3 + 4.55, 0.4);
    tl.to(proxies.flyer, { x: 700, y: -160, duration: 0.5, ease: 'power2.in' }, t3 + 4.5);
    ranges.push([s3, t3, t3 + D3, ['flyer']]);
    const POSE_TURN = t3 + 2.45;


    /* ---------------- SCENE 4 — THE COUNCIL GROUNDS (warm) ---------------- */
    const t4 = (S[4] = t3 + 4.4);
    const cam4 = q(s4, '.scene__cam');
    const council = buildCouncil(s4);
    tl.to(s4, { autoAlpha: 1, duration: 0.35 }, t4);
    tl.to(s3, { autoAlpha: 0, duration: 0.3 }, t4 + 0.2);
    // camera starts close on his branch, then pulls back to show the whole tree filling up
    const heroOrigin = () => {
      const h = council.hero, sc = s4.getBoundingClientRect();
      if (!h) return '50% 60%';
      const r = h.getBoundingClientRect();
      return (((r.left + r.width / 2 - sc.left) / sc.width) * 100).toFixed(1) + '% ' + (((r.top - sc.top) / sc.height) * 100).toFixed(1) + '%';
    };
    tl.fromTo(cam4, { scale: 1.55, transformOrigin: heroOrigin }, { scale: 1, duration: 1.7, ease: 'power2.inOut' }, t4);
    tl.fromTo(q(s4, '.layer--back'), { y: 0 }, { y: () => 0.03 * H() * m, duration: 2.8 }, t4);
    tl.fromTo(q(s4, '.layer--front'), { y: 0 }, { y: () => -0.05 * H() * m, duration: 2.8 }, t4);
    if (council.hero) {
      tl.fromTo(council.hero, { x: () => -0.45 * W(), y: () => -0.4 * H(), rotation: -24 }, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: 'power2.out' }, t4 + 0.1);
      tl.to(council.hero, { scaleY: 0.82, scaleX: 1.12, duration: 0.05 }, t4 + 0.6).to(council.hero, { scaleY: 1, scaleX: 1, duration: 0.14, ease: 'back.out(3)' }, t4 + 0.65);
    }
    // eagles land one after another and stack up, six to a branch
    const landers = [];
    council.rows.forEach((row) => row.forEach((el) => { if (el !== council.hero) landers.push(el); }));
    landers.forEach((el, i) => {
      const at = t4 + 0.55 + i * (1.9 / landers.length);
      const fromLeft = i % 2 ? 1 : -1;
      tl.fromTo(el, { x: () => fromLeft * (0.15 + (i % 3) * 0.08) * W(), y: () => -(0.45 + (i % 4) * 0.08) * H(), rotation: fromLeft * 22, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.26, ease: 'power3.out' }, at);
      tl.to(el, { scaleY: 0.8, scaleX: 1.12, duration: 0.04 }, at + 0.26).to(el, { scaleY: 1, scaleX: 1, duration: 0.12, ease: 'back.out(3)' }, at + 0.3);
    });
    wordsIn(tl, words(s4), t4 + 1.15, 0.55);
    wordsOut(tl, words(s4), t4 + 2.5, 0.3);
    ranges.push([s4, t4, t4 + 3.1, []]);

    /* ---------------- SCENE 5 — EAGLES GON EAT (the loudest moment) ---------------- */
    const t5 = (S[5] = t4 + 2.75);
    const D5 = 3.8;
    const cam5 = q(s5, '.scene__cam');
    const feast = buildFeast(s5);
    const ghosts = buildGhosts(s5);
    // dive from the branch down to the river
    tl.to(cam4, { scale: 1.4, y: () => 0.25 * H(), duration: 0.5, ease: 'power2.in' }, t5 - 0.25);
    tl.to(s5, { autoAlpha: 1, duration: 0.3 }, t5 - 0.05);
    tl.to(s4, { autoAlpha: 0, duration: 0.25 }, t5 + 0.1);
    tl.fromTo(cam5, { scale: 1.3, y: () => -0.18 * H() }, { scale: 1, y: 0, duration: 0.6, ease: 'power2.out' }, t5);
    tl.fromTo(q(s5, '.layer--back'), { x: 0 }, { x: () => -0.03 * W() * m, duration: D5 }, t5);
    tl.fromTo(q(s5, '.layer--mid'), { x: 0 }, { x: () => -0.02 * W() * m, duration: D5 }, t5);
    // the crowd: flyers stream overhead, divers drop in, salmon jump
    feast.flyers.forEach((el, i) => {
      tl.fromTo(el, { x: 0 }, { x: () => (1.3 + (i % 3) * 0.12) * W(), duration: D5 * (0.7 + (i % 4) * 0.1) }, t5 + (i % 5) * 0.12);
    });
    feast.divers.forEach((el, i) => {
      const at = t5 + 0.5 + i * 0.7;
      tl.fromTo(el, { x: () => 0.25 * W(), y: 0, rotation: 0 }, { x: () => -0.05 * W(), y: () => 0.95 * H(), rotation: 18, duration: 0.55, ease: 'power2.in' }, at);
    });
    feast.salmon.forEach((el, i) => {
      [0, 1].forEach((k) => {
        const at = t5 + 0.3 + i * 0.28 + k * 1.6;
        const dir = i % 2 ? -1 : 1;
        tl.set(el, { opacity: 1 }, at);
        tl.fromTo(el, { x: 0, rotation: -35 * dir }, { x: () => dir * 0.12 * W(), rotation: 35 * dir, duration: 0.5, ease: 'none' }, at);
        tl.fromTo(el, { y: 0 }, { y: () => -0.2 * H(), duration: 0.25, ease: 'power2.out' }, at).to(el, { y: 0, duration: 0.25, ease: 'power2.in' }, at + 0.25);
        tl.set(el, { opacity: 0 }, at + 0.5);
      });
    });
    // the hero: dive... miss... dive... EAT
    const hero5 = q(s5, '.s5-hero');
    const splash = q(s5, '.s5-splash');
    tl.fromTo(hero5, { x: () => -0.38 * W(), y: () => -0.62 * H() }, { x: 0, y: 0, duration: 0.5, ease: 'power2.in' }, t5 + 0.25);
    const splashAt = (at) => tl.fromTo(splash, { opacity: 1, scale: 0.3 }, { opacity: 0, scale: 1.25, duration: 0.35, ease: 'power2.out' }, at);
    splashAt(t5 + 0.75);
    tl.to(hero5, { y: () => -0.22 * H(), duration: 0.2, ease: 'power2.out' }, t5 + 1.5).to(hero5, { y: 0, duration: 0.18, ease: 'power2.in' }, t5 + 1.7);
    splashAt(t5 + 1.88);
    // climax: headline slams in with a chromatic flash, the screen shakes, feathers everywhere
    const CLIMAX = t5 + 1.9;
    wordsIn(tl, words(s5), CLIMAX, 0.35);
    ghosts.forEach((g, i) => {
      const dx = i ? 16 : -16;
      tl.fromTo(g, { opacity: 0, x: dx * 1.6 }, { opacity: 0.9, x: dx, duration: 0.05 }, CLIMAX + 0.05).to(g, { opacity: 0, x: 0, duration: 0.3 }, CLIMAX + 0.12);
    });
    $$('.chroma span', s5).forEach((el, i) => {
      tl.to(el, { opacity: 0.35, duration: 0.03 }, CLIMAX + i * 0.05).to(el, { opacity: 0, duration: 0.12 }, CLIMAX + 0.04 + i * 0.05);
    });
    const shakeN = 12, amp = mobile() ? 8 : 14;
    const R = seeded(77);
    for (let k = 0; k < shakeN; k++) {
      const f = 1 - k / shakeN;
      tl.to(cam5, { x: (R() - 0.5) * 2 * amp * f, y: (R() - 0.5) * 2 * amp * f, rotation: (R() - 0.5) * 1.6 * f, duration: 0.035, ease: 'none' }, CLIMAX + k * 0.035);
    }
    tl.to(cam5, { x: 0, y: 0, rotation: 0, duration: 0.08 }, CLIMAX + shakeN * 0.035);
    feast.eaters.forEach((el, i) => {
      tl.to(el, { y: () => -0.05 * H(), duration: 0.08, ease: 'power2.out' }, CLIMAX + i * 0.03).to(el, { y: 0, duration: 0.14, ease: 'bounce.out' }, CLIMAX + 0.08 + i * 0.03);
    });
    feast.feathers.forEach((el, i) => {
      const at = CLIMAX + (i % 12) * 0.03;
      tl.fromTo(el, { y: 0, x: 0, rotation: i * 37 }, { y: () => (1.1 + (i % 5) * 0.06) * H(), x: () => ((i % 7) - 3) * 0.03 * W(), rotation: i * 37 + 540 * (i % 2 ? 1 : -1), duration: 1.3 + (i % 4) * 0.12, ease: 'power1.in' }, at);
    });
    // the counter: how many eagles are on the river (a story number — never a price)
    const counterEl = q(s5, '.counter__n');
    const target = +counterEl.getAttribute('data-count-to') || 0;
    const count = { v: 0 };
    counterEl.textContent = '0';
    tl.fromTo(q(s5, '.counter'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2.5)' }, CLIMAX + 0.2);
    tl.to(count, { v: target, duration: 0.9, ease: 'power2.out', onUpdate: () => { counterEl.textContent = Math.round(count.v).toLocaleString('en-US'); } }, CLIMAX + 0.25);
    ranges.push([s5, t5, t5 + D5, ['feaster']]);
    const HERO5 = [[t5 + 0.75, 'diving'], [t5 + 1.5, 'missing'], [t5 + 1.86, 'diving'], [Infinity, 'eating']];

    tl.set({}, {}, t5 + D5); // room to breathe at the end of the feast

    // Lazy init + pausing off-stage rigs + pose changes, driven by the playhead.
    const mounted = new Set();
    function mountScene(sc) {
      if (mounted.has(sc)) return;
      mounted.add(sc);
      mountRigs(sc, proxies);
    }
    mountScene(s1);
    let lastPose = null;
    function sync() {
      const t = tl.time();
      if (t > t3 - 0.1) setStrips(t);
      ranges.forEach(([sc, a, b]) => {
        if (t > a - 1.2) mountScene(sc);
        const on = t >= a - 0.05 && t <= b + 0.05;
        $$('[data-live-pose]', sc).forEach((h) => h.__eagleRig && h.__eagleRig.setPaused(!on));
      });
      const h5 = hero5.__eagleRig;
      if (h5) {
        const want5 = HERO5.find((p) => t < p[0])[1];
        if (want5 !== h5.pose && !h5.pendingPose) h5.setPose(want5);
      }
      const fh = flyer.__eagleRig;
      if (fh) {
        const want = t >= POSE_TURN ? 'flying-determined' : 'flying-tired';
        if (want !== lastPose) { lastPose = want; fh.setPose(want); }
      }
    }
    tl.eventCallback('onUpdate', sync);

    const ST = window.ScrollTrigger;
    const st = ST.create({
      trigger: '.story',
      start: 'top top',
      end: () => '+=' + tl.duration() * H(),
      pin: '.story__stage',
      scrub: 0.9,
      animation: tl,
      invalidateOnRefresh: true,
    });
    sync();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
    EGE.story = { timeline: tl, trigger: st, starts: S };
  }

  EGE.scenes = {
    init() {
      const scenes = $$('.story .scene');
      if (!scenes.length) return;
      const ok = window.gsap && window.ScrollTrigger && !(EGE.reduceMotion && EGE.reduceMotion.matches);
      ok ? initMotion(scenes) : initStatic(scenes);
    },
  };
})();
