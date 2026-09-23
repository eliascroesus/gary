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
        .map((line) =>
          line
            .split(' ')
            .map((w) => '<span class="w" data-text="' + esc(w) + '">' + esc(w) + '</span>')
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

  EGE.initUI = function (root) {
    EGE.splitHeadlines(root);
    EGE.bindButtons(root);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EGE.initUI());
  } else {
    EGE.initUI();
  }
})();
