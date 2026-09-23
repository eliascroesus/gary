/*!
 * EAGLES GON EAT — js/milestones.js
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ EDIT THE MILESTONES HERE. This is the only file you need to touch.  │
 * │ Each entry:                                                          │
 * │   id           unique, lowercase-with-dashes                         │
 * │   label        the story beat (shown as the title)                   │
 * │   caption      one or two short lines                                │
 * │   timestamp    shown once unlocked (e.g. "12 Oct 2026")              │
 * │   state        'locked' | 'unlocked'                                 │
 * │   plumageStage 1–6: how white his head is at this milestone          │
 * │ Numbers go in the {{MILESTONE_N_LABEL}} placeholders. Story beats    │
 * │ only — never prices, targets or returns.                             │
 * └─────────────────────────────────────────────────────────────────────┘
 */
(function () {
  'use strict';

  const MILESTONES = [
    {
      id: 'first-branch',
      label: 'The first branch',
      caption: 'Somewhere to sit that isn’t mud. {{MILESTONE_1_LABEL}}',
      timestamp: '{{MILESTONE_1_DATE}}',
      state: 'unlocked',
      plumageStage: 1,
    },
    {
      id: 'flock-forms',
      label: 'The flock forms',
      caption: 'Brown specks on every horizon, all flying the same way. {{MILESTONE_2_LABEL}}',
      timestamp: '{{MILESTONE_2_DATE}}',
      state: 'unlocked',
      plumageStage: 2,
    },
    {
      id: 'river-opens',
      label: 'The river opens',
      caption: 'Everybody finds the water at once. {{MILESTONE_3_LABEL}}',
      timestamp: '{{MILESTONE_3_DATE}}',
      state: 'unlocked',
      plumageStage: 3,
    },
    {
      id: 'six-to-a-branch',
      label: 'Six to a branch',
      caption: 'No room left on the tree. Nobody minds. {{MILESTONE_4_LABEL}}',
      timestamp: '{{MILESTONE_4_DATE}}',
      state: 'locked',
      plumageStage: 4,
    },
    {
      id: 'the-feast',
      label: 'The feast',
      caption: 'Salmon in the shallows. Eagles gon eat. {{MILESTONE_5_LABEL}}',
      timestamp: '{{MILESTONE_5_DATE}}',
      state: 'locked',
      plumageStage: 5,
    },
    {
      id: 'head-turns',
      label: 'The head turns',
      caption: 'Five years of brown. Then white. {{MILESTONE_6_LABEL}}',
      timestamp: '{{MILESTONE_6_DATE}}',
      state: 'locked',
      plumageStage: 6,
    },
  ];

  /* ------------------------------------------------------------------------
     The timeline component. Everything below reads MILESTONES; no edits needed.
     ------------------------------------------------------------------------ */
  const EGE = (window.EGE = window.EGE || {});
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isVertical = () => window.matchMedia('(max-width: 700px)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const DOTS = 56;

  // The flight path, in % of the track box. u runs 0 → 1 along the path.
  function pathPoint(u, vertical) {
    if (vertical) return { x: 9 + 5 * Math.sin(u * Math.PI * 2 * 2.5), y: 5 + 90 * u };
    return { x: 5 + 90 * u, y: 50 + 8 * Math.sin(u * Math.PI * 2 * 1.5) };
  }

  function mount(root, opts) {
    opts = opts || {};
    const data = opts.data || MILESTONES;
    const n = data.length;
    const nodeU = data.map((_, i) => (i + 0.5) / n);
    let lastUnlocked = -1;
    data.forEach((m, i) => { if (m.state === 'unlocked') lastUnlocked = i; });
    // The rider only flies as far as the last unlocked milestone.
    const maxU = lastUnlocked < 0 ? 0 : nodeU[lastUnlocked];

    let vertical = isVertical();
    let reached = new Array(n).fill(false);
    let progress = 0;
    let box = null;

    function build() {
      vertical = isVertical();
      root.classList.add('ms-timeline');
      root.classList.toggle('is-vertical', vertical);
      let dots = '';
      for (let k = 0; k < DOTS; k++) {
        const u = k / (DOTS - 1);
        const p = pathPoint(u, vertical);
        dots += '<span class="ms-dot" style="left:' + p.x.toFixed(2) + '%;top:' + p.y.toFixed(2) + '%"></span>';
      }
      let items = '';
      data.forEach((m, i) => {
        const p = pathPoint(nodeU[i], vertical);
        const open = m.state === 'unlocked';
        items +=
          '<li class="ms ' + (open ? 'is-unlocked' : 'is-locked') + (i % 2 ? ' is-low' : '') + '" data-id="' + esc(m.id) + '" style="--x:' + p.x.toFixed(2) + '%;--y:' + p.y.toFixed(2) + '%">' +
          '<span class="ms__node"><img src="assets/characters/plumage/stage-' + (+m.plumageStage || 0) + '.svg" alt="" width="232" height="236"></span>' +
          '<div class="ms__card">' +
          '<span class="ms__time">' + (open ? esc(m.timestamp) : 'Locked') + '</span>' +
          '<h3 class="ms__label">' + esc(m.label) + '</h3>' +
          '<p class="ms__cap">' + esc(m.caption) + '</p>' +
          '<span class="visually-hidden">' + (open ? 'Unlocked. Plumage stage ' + m.plumageStage + ' of 6.' : 'Locked.') + '</span>' +
          '</div></li>';
      });
      root.innerHTML =
        '<div class="ms-track" aria-hidden="true">' + dots + '<img class="ms-rider" src="assets/sprites/speck.svg" alt="" width="160" height="110"></div>' +
        '<ol class="ms-list">' + items + '</ol>';
      box = null;
      reached = new Array(n).fill(false);
      const p = progress;
      progress = -1;
      setProgress(p, true);
    }

    function measure() {
      const t = root.querySelector('.ms-track');
      box = t ? { w: t.offsetWidth, h: t.offsetHeight } : { w: 0, h: 0 };
    }

    // p: 0..1 of the whole timeline. `silent` skips pops (initial render / jumps).
    function setProgress(p, silent) {
      p = Math.max(0, Math.min(1, p));
      if (p === progress) return;
      const forward = p > progress;
      progress = p;
      if (!box) measure();
      const u = Math.min(p, maxU);
      const dots = root.querySelectorAll('.ms-dot');
      dots.forEach((d, k) => d.classList.toggle('is-on', k / (DOTS - 1) <= u + 0.0001));
      const rider = root.querySelector('.ms-rider');
      if (rider) {
        const a = pathPoint(u, vertical), b = pathPoint(Math.min(1, u + 0.01), vertical);
        const ang = (Math.atan2(((b.y - a.y) / 100) * box.h, ((b.x - a.x) / 100) * box.w) * 180) / Math.PI;
        rider.style.transform = 'translate3d(' + ((a.x / 100) * box.w).toFixed(1) + 'px,' + ((a.y / 100) * box.h).toFixed(1) + 'px,0) translate(-50%,-70%) rotate(' + ang.toFixed(1) + 'deg)';
      }
      const items = root.querySelectorAll('.ms');
      data.forEach((m, i) => {
        const now = m.state === 'unlocked' && nodeU[i] <= u + 0.0001;
        if (now === reached[i]) return;
        reached[i] = now;
        items[i].classList.toggle('is-reached', now);
        if (now && forward && !silent) pop(items[i]);
        if (opts.onChange) opts.onChange(stage(), i, now, forward && !silent);
      });
    }

    // How white his head is: the highest plumage stage among reached milestones.
    function stage() {
      let s = 0;
      data.forEach((m, i) => { if (reached[i]) s = Math.max(s, +m.plumageStage || 0); });
      return s;
    }

    function pop(li) {
      const node = li.querySelector('.ms__node');
      const gsap = window.gsap;
      if (gsap && !reduce.matches) {
        gsap.fromTo(node, { scale: 0.5 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1.1, 0.35)' });
        gsap.fromTo(li.querySelector('.ms__card'), { y: 12, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
      }
      if (EGE.featherBurst) {
        const r = node.getBoundingClientRect();
        if (r.width) EGE.featherBurst(r.left + r.width / 2, r.top + r.height / 2, 8);
      }
    }

    build();
    let lastV = vertical;
    window.addEventListener('resize', () => {
      box = null;
      if (isVertical() !== lastV) { lastV = isVertical(); build(); }
      else { const p = progress; progress = -1; setProgress(p, true); }
    });

    const api = { setProgress: setProgress, stage: stage, data: data, maxProgress: maxU, el: root };

    // Standalone: scrub the flight path with scroll wherever the component sits.
    if (!opts.controlled) {
      if (reduce.matches || !window.ScrollTrigger) setProgress(1, true);
      else {
        window.ScrollTrigger.create({
          trigger: root,
          start: 'top 85%',
          end: 'bottom 45%',
          scrub: 0.6,
          onUpdate: (self) => setProgress(self.progress),
        });
      }
    }
    return api;
  }

  EGE.MILESTONES = MILESTONES;
  EGE.Milestones = { mount: mount, data: MILESTONES };
})();
