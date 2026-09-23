/*!
 * EAGLES GON EAT — js/main.js
 * Shared UI behaviour used by every page (index.html and design-system.html).
 * Later stages add the story boot (Lenis + ScrollTrigger scenes), cursor
 * feathers, copy-contract, sound and the "EAT" easter egg here.
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

  EGE.initUI = function (root) {
    EGE.splitHeadlines(root);
    EGE.bindButtons(root);
    EGE.bindCopy(root);
  };

  function boot() {
    EGE.initUI();
    EGE.initScroll();
    if (EGE.scenes && EGE.scenes.init) EGE.scenes.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
