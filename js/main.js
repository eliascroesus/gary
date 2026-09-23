/*!
 * EAGLES GON EAT — js/main.js
 * Shared UI behaviour used by every page (index.html and design-system.html):
 * outlined headlines, elastic buttons, copy contract + toast + feather burst,
 * smooth scroll, section reveals, cursor feathers, sound, and the "EAT" egg.
 */
(function () {
  'use strict';

  const EGE = (window.EGE = window.EGE || {});
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  EGE.reduceMotion = reduceMotion;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* Headlines — split into words so every word gets its own fat ink outline
     (and can animate in later). Screen readers get the plain sentence once. */
  EGE.splitHeadlines = function (root) {
    const tmp = document.createElement('div');
    const plain = (html) => {
      tmp.innerHTML = html;
      return tmp.textContent.replace(/\s+/g, ' ').trim();
    };
    (root || document).querySelectorAll('.hl:not(.is-split)').forEach((el) => {
      // an explicit <br> in the markup is kept as a line break
      const lines = el.innerHTML.split(/<br\s*\/?>/i).map(plain).filter(Boolean);
      const text = lines.join(' ');
      if (!text) return;
      const visual = lines
        .map((line, li) =>
          line
            .split(' ')
            .map((w) => '<span class="w" data-line="' + li + '" data-text="' + esc(w) + '">' + esc(w) + '</span>')
            .join(' ')
        )
        .join('<br>');
      el.innerHTML = '<span class="visually-hidden">' + esc(text) + '</span><span aria-hidden="true">' + visual + '</span>';
      el.classList.add('is-split');
    });
  };

  /* Buttons — CSS handles hover (scale) and press (squash); on release GSAP
     springs the button back with a real elastic ease. CSS keyframes stand in
     if GSAP is missing. Nothing moves under prefers-reduced-motion. */
  EGE.bindButtons = function (root) {
    (root || document).querySelectorAll('.btn:not([data-boing])').forEach((btn) => {
      btn.setAttribute('data-boing', '');
      btn.addEventListener('click', () => {
        if (reduceMotion.matches || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
        const gsap = window.gsap;
        if (!gsap) {
          btn.classList.remove('is-boing');
          void btn.offsetWidth;
          btn.classList.add('is-boing');
          return;
        }
        gsap.killTweensOf(btn);
        btn.classList.add('is-springing');
        gsap.fromTo(
          btn,
          { scaleX: 1.16, scaleY: 0.8, y: 4, transformOrigin: '50% 100%' },
          {
            scaleX: 1,
            scaleY: 1,
            y: 0,
            duration: 0.95,
            ease: 'elastic.out(1.1, 0.32)',
            onComplete() {
              gsap.set(btn, { clearProps: 'transform' });
              btn.classList.remove('is-springing');
            },
          }
        );
      });
    });
  };

  /* Copy contract → clipboard, toast, feather burst. */
  const FEATHER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21C5.5 13.5 9 6.5 18.5 3c1 6.5-3 13-10.5 16.5z" fill="#FFFDF6" stroke="#17110D" stroke-width="2" stroke-linejoin="round"/><path d="M5 22.5L15 9" stroke="#17110D" stroke-width="1.8" stroke-linecap="round"/></svg>';

  EGE.copyText = function (text) {
    const fallback = () =>
      new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
        ok ? resolve() : reject(new Error('copy failed'));
      });
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fallback);
    return fallback();
  };

  let toastTimer = 0;
  EGE.toast = function (message) {
    const region = document.querySelector('.toast-region');
    if (!region) return;
    region.innerHTML = '<span class="toast">' + FEATHER.replace('#17110D', '#FFC83A').replace('#17110D', '#FFC83A') + esc(message) + '</span>';
    const el = region.firstChild;
    const gsap = window.gsap;
    clearTimeout(toastTimer);
    if (gsap && !reduceMotion.matches) {
      gsap.fromTo(el, { opacity: 0, y: 30, scale: 0.6, rotation: -6 }, { opacity: 1, y: 0, scale: 1, rotation: -2, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      toastTimer = setTimeout(() => gsap.to(el, { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in' }), 2200);
    } else {
      el.style.opacity = 1;
      toastTimer = setTimeout(() => { el.style.opacity = 0; }, 2400);
    }
  };

  EGE.featherBurst = function (x, y, count) {
    const gsap = window.gsap;
    if (!gsap || reduceMotion.matches) return;
    count = count || 12;
    for (let i = 0; i < count; i++) {
      const f = document.createElement('span');
      f.className = 'feather-burst';
      f.innerHTML = FEATHER;
      f.style.left = x + 'px';
      f.style.top = y + 'px';
      document.body.appendChild(f);
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const d = 70 + Math.random() * 90;
      gsap.fromTo(
        f,
        { x: 0, y: 0, rotation: Math.random() * 360, scale: 0.4 + Math.random() * 0.6, opacity: 1 },
        {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d + 60,
          rotation: '+=' + (Math.random() * 360 - 180),
          opacity: 0,
          duration: 1 + Math.random() * 0.5,
          ease: 'power2.out',
          onComplete: () => f.remove(),
        }
      );
    }
  };

  EGE.bindCopy = function (root) {
    (root || document).querySelectorAll('[data-copy-contract]:not([data-copy-bound])').forEach((btn) => {
      btn.setAttribute('data-copy-bound', '');
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-contract') || '';
        const r = btn.getBoundingClientRect();
        EGE.copyText(text).then(
          () => {
            EGE.toast('Copied. We eating.');
            EGE.featherBurst(r.left + r.width / 2, r.top + r.height / 2);
          },
          () => EGE.toast('Copy failed — select the address')
        );
      });
    });
  };

  /* Smooth scroll: Lenis drives ScrollTrigger. Without Lenis (or with reduced
     motion) the page keeps native scrolling and everything still works. */
  EGE.initScroll = function () {
    const gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return null;
    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
    if (!window.Lenis || reduceMotion.matches) return null;
    const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
      });
    });
    EGE.lenis = lenis;
    return lenis;
  };

  /* Sections below the story rise in as they arrive (transform + opacity).
     Without JS, or with reduced motion, everything is simply there. */
  EGE.initReveal = function () {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
    const groups = document.querySelectorAll('.section__head, .steps, .facts, .posts, .faq');
    if (!groups.length) return;
    document.documentElement.classList.add('js-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    groups.forEach((g) => {
      const kids = g.matches('.section__head') ? [g] : Array.from(g.children);
      kids.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--delay', (i * 0.08).toFixed(2) + 's');
        io.observe(el);
      });
    });
  };


  /* ------------------------------------------------------------------------
     Cursor feathers — four tiny feathers trail the pointer with staggered lag.
     Mouse/trackpad only; nothing under reduced motion. The real cursor stays.
     ------------------------------------------------------------------------ */
  EGE.initCursor = function () {
    if (reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;
    const layer = document.createElement('div');
    layer.className = 'cursor-feathers';
    layer.setAttribute('aria-hidden', 'true');
    const LAG = [0.34, 0.24, 0.17, 0.12];
    const feathers = LAG.map((k, i) => {
      const f = document.createElement('span');
      f.className = 'cursor-feather';
      f.innerHTML = FEATHER;
      f.style.setProperty('--s', (1 - i * 0.16).toFixed(2));
      layer.appendChild(f);
      return { el: f, k: k, x: -100, y: -100, r: 0 };
    });
    document.body.appendChild(layer);
    let tx = -100, ty = -100, raf = 0, idle = 0;
    function tick() {
      raf = 0;
      let moving = false;
      let px = tx, py = ty;
      feathers.forEach((f, i) => {
        const dx = px - f.x, dy = py - f.y;
        f.x += dx * f.k;
        f.y += dy * f.k;
        const target = Math.max(-60, Math.min(60, dx * 1.2)) + (i % 2 ? 18 : -18);
        f.r += (target - f.r) * 0.2;
        f.el.style.transform = 'translate3d(' + (f.x + 10 + i * 3).toFixed(1) + 'px,' + (f.y + 14 + i * 4).toFixed(1) + 'px,0) rotate(' + f.r.toFixed(1) + 'deg) scale(var(--s))';
        if (Math.abs(dx) + Math.abs(dy) > 0.4) moving = true;
        px = f.x; py = f.y;
      });
      if (moving) raf = requestAnimationFrame(tick);
    }
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      layer.classList.add('is-on');
      clearTimeout(idle);
      idle = setTimeout(() => layer.classList.remove('is-on'), 1400);
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => layer.classList.remove('is-on'));
  };

  /* ------------------------------------------------------------------------
     Sound — muted by default, one corner toggle, never autoplays.
     Synthesised with Web Audio (no files): wind for scenes 1–3, the river and
     eagle calls for scenes 4–5, a soft breeze everywhere else.
     ------------------------------------------------------------------------ */
  const Sound = (EGE.sound = { on: false, ctx: null });

  function buildAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; } // brown-ish noise
    const noise = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; };
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // wind: noise through a slowly wandering band-pass
    const wind = ctx.createGain(); wind.gain.value = 0;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.8;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 320;
    lfo.connect(lfoAmt); lfoAmt.connect(wf.frequency); lfo.start();
    noise().connect(wf); wf.connect(wind); wind.connect(master);

    // river: low rush + a brighter babble
    const river = ctx.createGain(); river.gain.value = 0;
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 900;
    const rb = ctx.createBiquadFilter(); rb.type = 'bandpass'; rb.frequency.value = 1900; rb.Q.value = 1.6;
    const rbg = ctx.createGain(); rbg.gain.value = 0.35;
    const n2 = noise();
    n2.connect(rl); rl.connect(river);
    n2.connect(rb); rb.connect(rbg); rbg.connect(river);
    river.connect(master);

    return { ctx: ctx, master: master, wind: wind, river: river };
  }

  // A high, slightly squeaky eagle chirp: "kleek-kik-ik-ik".
  function chirp(a) {
    const t0 = a.ctx.currentTime + 0.02;
    const n = 3 + Math.floor(Math.random() * 3);
    const base = 2300 + Math.random() * 500;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.13 + Math.random() * 0.03);
      const o = a.ctx.createOscillator();
      const g = a.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(base * (i ? 0.92 : 1.08), t);
      o.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g); g.connect(a.master);
      o.start(t); o.stop(t + 0.13);
    }
  }

  let soundTimer = 0, chirpAt = 0;
  function soundUpdate() {
    const a = Sound.audio;
    if (!a || !Sound.on) return;
    const scene = EGE.currentScene ? EGE.currentScene() : 0;
    const t = a.ctx.currentTime;
    const cold = scene >= 1 && scene <= 3, warm = scene === 4 || scene === 5;
    a.wind.gain.setTargetAtTime(cold ? 0.55 : 0.08, t, 0.8);
    a.river.gain.setTargetAtTime(warm ? 0.5 : scene >= 6 ? 0.08 : 0, t, 0.8);
    if (warm && performance.now() > chirpAt) {
      chirp(a);
      chirpAt = performance.now() + 2500 + Math.random() * 4500;
    }
  }

  Sound.set = function (on) {
    Sound.on = on;
    if (on && !Sound.audio) Sound.audio = buildAudio();
    const a = Sound.audio;
    if (a) {
      if (on && a.ctx.state === 'suspended') a.ctx.resume();
      a.master.gain.setTargetAtTime(on ? 0.6 : 0, a.ctx.currentTime, 0.25);
    }
    clearInterval(soundTimer);
    if (on) { soundUpdate(); soundTimer = setInterval(soundUpdate, 300); }
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Sound is on — turn it off' : 'Sound is off — turn it on');
      b.classList.toggle('is-on', on);
    });
  };

  EGE.initSound = function () {
    document.querySelectorAll('[data-sound-toggle]').forEach((b) => b.addEventListener('click', () => Sound.set(!Sound.on)));
    document.addEventListener('visibilitychange', () => {
      const a = Sound.audio;
      if (!a) return;
      if (document.hidden) a.ctx.suspend();
      else if (Sound.on) a.ctx.resume();
    });
  };

  /* ------------------------------------------------------------------------
     Easter egg — type "EAT" anywhere and every eagle on screen does a hop.
     ------------------------------------------------------------------------ */
  EGE.initEgg = function () {
    let typed = '';
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toUpperCase()).slice(-3);
      if (typed !== 'EAT') return;
      typed = '';
      EGE.hopEverybody();
    });
  };

  EGE.hopEverybody = function () {
    if (window.EagleRig && EagleRig.hopAll) EagleRig.hopAll();
    const gsap = window.gsap;
    if (gsap && !reduceMotion.matches) {
      const vh = window.innerHeight, vw = window.innerWidth;
      const birds = Array.from(document.querySelectorAll('.perch:not(.perch--hero), .feast img, .speck, .s7-young, .river-eagles img, .ms-rider, .step__art, .post__head img, .site-foot__brand img')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      });
      birds.slice(0, 120).forEach((el, i) => {
        gsap.timeline({ delay: (i % 12) * 0.03 })
          .to(el, { y: '-=' + (14 + (i % 3) * 6), duration: 0.16, ease: 'power2.out' })
          .to(el, { y: '+=' + (14 + (i % 3) * 6), duration: 0.22, ease: 'bounce.out' });
      });
    }
    EGE.toast('Everybody eats.');
    if (Sound.on && Sound.audio) chirp(Sound.audio);
  };

  /* Placeholders: once a {{VALUE}} has been replaced with the real thing, drop
     its dashed "placeholder" styling automatically. */
  EGE.settlePlaceholders = function (root) {
    (root || document).querySelectorAll('.ph').forEach((el) => {
      if (el.textContent.indexOf('{{') === -1) el.classList.remove('ph');
    });
  };

  EGE.initUI = function (root) {
    EGE.settlePlaceholders(root);
    EGE.splitHeadlines(root);
    EGE.bindButtons(root);
    EGE.bindCopy(root);
  };

  function boot() {
    EGE.initUI();
    EGE.initScroll();
    if (EGE.scenes && EGE.scenes.init) EGE.scenes.init();
    EGE.initReveal();
    EGE.initCursor();
    EGE.initSound();
    EGE.initEgg();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
