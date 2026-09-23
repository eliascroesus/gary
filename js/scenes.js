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
    const words = (sc, line) => $$('.scene__copy .w' + (line != null ? '[data-line="' + line + '"]' : ''), sc);

    gsap.set([s2, s3], { autoAlpha: 0 });

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

    tl.set({}, {}, t3 + D3); // scroll room for the final beat

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
