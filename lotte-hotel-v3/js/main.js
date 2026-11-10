/* Lotte Hotels & Resorts — fullpage motion flow
   One wheel / swipe / key press = one step. Text enters and leaves with a blur. */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const TOTAL = 12; // 0 intro · 1-3 moments · 4-7 brands · 8 offers · 9 rewards · 10 experience · 11 footer

  /* ---------- 1. scale the 1920×1080 canvas to the viewport ---------- */
  // Desktop: 1920×1080 canvas. Mobile (portrait / narrow): 430-wide canvas, height follows the screen.
  function fit() {
    const W = window.innerWidth, H = window.innerHeight;
    const mobile = W < 768 && H > W * 1.1;
    body.classList.toggle('is-mobile', mobile);
    const s = mobile ? W / 430 : Math.min(W / 1920, H / 1080);
    const sw = W / s, sh = H / s;
    root.style.setProperty('--s', s);
    root.style.setProperty('--sw', sw);
    root.style.setProperty('--sh', sh);
    root.style.setProperty('--ox', mobile ? 0 : (sw - 1920) / 2);
    root.style.setProperty('--oy', mobile ? 0 : (sh - 1080) / 2);
  }
  fit();
  window.addEventListener('resize', fit);

  /* ---------- 2. split text into blur pieces ---------- */
  function splitChars(el) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...child.textContent].forEach(c => {
            if (c === '\n') return;
            const sp = document.createElement('span');
            sp.className = 'ch bp';
            sp.textContent = c;
            sp.style.setProperty('--i', i++);
            frag.appendChild(sp);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
  }
  document.querySelectorAll('[data-split]').forEach(el => {
    const mode = el.dataset.split;
    if (mode === 'chars') splitChars(el);
    else if (mode === 'lines') el.querySelectorAll('.ln').forEach((l, i) => { l.classList.add('bp'); l.style.setProperty('--i', i); });
    else if (mode === 'items') [...el.children].forEach((c, i) => { c.classList.add('bp'); c.style.setProperty('--i', i); });
    else if (mode === 'self') el.classList.add('bp');
    // data-random: every piece gets its own random delay instead of left-to-right order
    if (el.hasAttribute('data-random')) {
      el.querySelectorAll('.bp').forEach(p => {
        if (p.textContent.trim()) p.style.setProperty('--i', (Math.random() * 30).toFixed(2));
      });
    }
  });

  /* ---------- 3. which steps each .anim belongs to ---------- */
  const parseSteps = str => {
    const set = new Set();
    str.split(',').forEach(part => {
      const [a, b] = part.split('-').map(Number);
      for (let n = a; n <= (isNaN(b) ? a : b); n++) set.add(n);
    });
    return set;
  };
  const anims = [...document.querySelectorAll('.anim')].map(el => ({ el, steps: parseSteps(el.dataset.steps) }));

  /* ---------- 4. clock: a remembered moment for every scene ---------- */
  const TIMES = ['20:45:02', '20:45:15', '22:49:28', '22:52:50', '22:54:51', '23:12:07',
                 '23:36:40', '23:58:19', '08:12:33', '09:40:27', '11:05:52', '11:05:52'];
  const cells = [];
  document.querySelectorAll('.clock .cg').forEach(g => {
    for (let k = 0; k < 2; k++) {
      const cd = document.createElement('span');
      cd.className = 'cd';
      g.appendChild(cd);
      cells.push(cd);
    }
  });
  function setDigit(cd, ch) {
    const cur = cd.querySelector('span:not(.out)');
    if (cur && cur.textContent === ch) return;
    if (cur) {
      cur.classList.add('out');
      setTimeout(() => cur.remove(), 750);
    }
    const sp = document.createElement('span');
    sp.className = 'in';
    sp.textContent = ch;
    cd.appendChild(sp);
    requestAnimationFrame(() => requestAnimationFrame(() => sp.classList.remove('in')));
  }
  let clockBase = 0, clockStart = 0;
  const toSec = t => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + s; };
  function renderClock() {
    const total = (clockBase + Math.floor((Date.now() - clockStart) / 1000)) % 86400;
    const str = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
      .map(n => String(n).padStart(2, '0')).join('');
    [...str].forEach((c, i) => setDigit(cells[i], c));
  }
  function startClock(step) {
    clockBase = toSec(TIMES[step]);
    clockStart = Date.now();
    renderClock();
  }
  setInterval(renderClock, 1000);

  /* ---------- 5. step machine ---------- */
  let cur = -1, locked = false;

  function enterDelay(prev, next) {
    if (prev < 0) return .25;
    if (prev === 0 && next === 1) return 1.05;  // intro groups lift away first
    if (prev <= 3 && next === 4) return 1.6;    // panel expands → blurs → dark + card slide in, then copy
    if (prev === 4 && next === 3) return .75;
    if (next === 11) return 0;
    if (prev === 11) return .2;
    if (next >= 8 || prev >= 8) return .55;
    return .45;
  }

  function go(next) {
    next = Math.max(0, Math.min(TOTAL - 1, next));
    if (next === cur || locked) return;
    const prev = cur;
    cur = next;

    root.style.setProperty('--enter', enterDelay(prev, next) + 's');
    body.className = body.className.replace(/\b(s-\d+|g-\w+)\b/g, '').trim();
    body.classList.add('s-' + next,
      next === 0 ? 'g-intro' : next <= 3 ? 'g-moment' : next <= 7 ? 'g-brand' : 'g-pages');
    body.dataset.dir = next > prev ? 'down' : 'up';
    // one-off entrance choreographies
    body.classList.toggle('enter-moment', prev === 0 && next === 1);
    body.classList.toggle('enter-brand', prev >= 0 && prev <= 3 && next === 4);
    // leaving the brand section back to the light scenes (scroll up or menu jump):
    // the card must exit with the dark wipe instead of lingering over the light page
    body.classList.toggle('leave-brand', prev >= 4 && prev <= 7 && next <= 3);

    anims.forEach(({ el, steps }) => {
      if (steps.has(next)) { el.classList.remove('off'); el.classList.add('on'); }
      else if (el.classList.contains('on')) { el.classList.remove('on'); el.classList.add('off'); }
    });

    startClock(next);
    resetLists();

    const big = (prev === 3 && next === 4) || (prev === 4 && next === 3);
    locked = true;
    setTimeout(() => { locked = false; }, prev < 0 ? 600 : big ? 2100 : (prev === 0 && next === 1) ? 1900 : 1350);
  }
  const next = () => go(cur + 1);
  const prevStep = () => go(cur - 1);

  /* ---------- 6. input: wheel (one gesture = one step), touch, keys ---------- */
  let lastWheel = 0;
  window.addEventListener('wheel', e => {
    if (body.classList.contains('menu-open')) return;
    const list = e.target.closest && e.target.closest('.b-list');
    if (list && list.classList.contains('on') && list.scrollHeight > list.clientHeight + 2) {
      const atTop = list.scrollTop <= 0, atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return; // let the hotel list scroll
    }
    e.preventDefault();
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    if (Math.abs(e.deltaY) < 4 || gap < 160) return; // inertia tail of the same gesture
    e.deltaY > 0 ? next() : prevStep();
  }, { passive: false });

  let ty = null, tx = null, tList = null;
  window.addEventListener('touchstart', e => {
    ty = e.touches[0].clientY; tx = e.touches[0].clientX;
    const l = e.target.closest && e.target.closest('.b-list');
    tList = l && l.classList.contains('on') && l.scrollHeight > l.clientHeight + 2 ? l : null;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (!tList) e.preventDefault(); // stop pull-to-refresh / rubber-band
  }, { passive: false });
  window.addEventListener('touchend', e => {
    if (ty === null || body.classList.contains('menu-open')) { ty = null; return; }
    const dy = ty - e.changedTouches[0].clientY;
    const dx = tx - e.changedTouches[0].clientX;
    ty = null;
    if (tList) {
      // a swipe inside the hotel list scrolls the list; only page-turn once it hits its end
      const atTop = tList.scrollTop <= 0, atBottom = tList.scrollTop + tList.clientHeight >= tList.scrollHeight - 1;
      if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) return;
    }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && cur >= 4 && cur <= 7) {
      return dx > 0 ? go(Math.min(7, cur + 1)) : go(Math.max(4, cur - 1)); // swipe between brands
    }
    if (Math.abs(dy) > 50) dy > 0 ? next() : prevStep();
  }, { passive: true });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') return toggleMenu(false);
    if (body.classList.contains('menu-open')) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prevStep(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(TOTAL - 1);
    else if (cur >= 4 && cur <= 7 && e.key === 'ArrowRight') go(Math.min(7, cur + 1));
    else if (cur >= 4 && cur <= 7 && e.key === 'ArrowLeft') go(Math.max(4, cur - 1));
  });

  /* ---------- 7. UI bits ---------- */
  document.querySelector('.down').addEventListener('click', next);
  document.querySelector('.b-prev').addEventListener('click', () => cur > 4 && go(cur - 1));
  document.querySelector('.b-next').addEventListener('click', () => go(cur < 7 ? cur + 1 : 8));
  document.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // hotel list scroll indicator
  const thumb = document.querySelector('.b-scroll i');
  const lists = [...document.querySelectorAll('.b-list:not(.b-list--center)')];
  lists.forEach(list => list.addEventListener('scroll', () => {
    const max = list.scrollHeight - list.clientHeight;
    thumb.style.top = (30 + (max > 0 ? list.scrollTop / max : 0) * (458 - 36 - 30)) + 'px';
  }));
  function resetLists() { lists.forEach(l => { if (!l.classList.contains('on')) l.scrollTop = 0; }); thumb.style.top = '30px'; }

  // menu
  const ham = document.querySelector('.ham');
  const menu = document.querySelector('.menu');
  menu.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', i));
  function toggleMenu(open = !body.classList.contains('menu-open')) {
    body.classList.toggle('menu-open', open);
    ham.setAttribute('aria-expanded', open);
    ham.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    menu.setAttribute('aria-hidden', !open);
  }
  ham.addEventListener('click', () => toggleMenu());
  menu.querySelector('.menu-dim').addEventListener('click', () => toggleMenu(false));
  document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    toggleMenu(false);
    locked = false;
    setTimeout(() => go(+a.dataset.go), body.classList.contains('menu-open') ? 350 : 0);
  }));

  /* ---------- 8. start once fonts are ready (no flash of fallback glyphs) ---------- */
  const startAt = Math.max(0, Math.min(TOTAL - 1, parseInt(location.hash.slice(1), 10) || 0));
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))])
    .then(() => requestAnimationFrame(() => go(startAt)));
})();
