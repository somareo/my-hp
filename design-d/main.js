(function () {
  const { X, esc, nl, yen, list, reduced } = window.XUI;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;
  const mqMobile = window.matchMedia('(max-width: 767px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 共通データの描画 ---------- */
  list($('[data-owner-body]'), X.owner.body, (p) => `<p data-reveal>${nl(p)}</p>`);
  list($('[data-features]'), X.features, (f) => `
    <li class="feature" data-reveal>
      <h3 class="feature__title">${esc(f.title)}</h3>
      <p class="feature__body">${esc(f.body)}</p>
    </li>`);
  list($('[data-price]'), X.price.items, (p) => `
    <div class="price__row"><dt>${esc(p.label)}</dt><dd>${yen(p.price)}<small>円</small></dd></div>`);
  list($('[data-flow]'), X.flow, (f) => `
    <li class="flow__item" data-reveal>
      <span class="flow__no" aria-hidden="true"><span>${Number(f.no)}</span></span>
      <h3 class="flow__title"><span class="sr-only">STEP ${esc(f.no)}　</span>${esc(f.title)}</h3>
      <p class="flow__body">${esc(f.body)}</p>
    </li>`);
  window.XUI.chat($('[data-faq]'));

  /* ---------- よくある質問：途中まで表示して「続きを読む」 ---------- */
  (function faqMore() {
    const chatEl = $('[data-faq]');
    if (!chatEl) return;
    const box = document.createElement('div');
    box.className = 'faq__more';
    chatEl.parentNode.insertBefore(box, chatEl);
    box.appendChild(chatEl);
    chatEl.id = chatEl.id || 'faq-chat';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'faq__toggle';
    btn.setAttribute('aria-controls', chatEl.id);
    box.appendChild(btn);

    const peek = () => parseFloat(getComputedStyle(box).getPropertyValue('--faq-peek')) || 760;
    const label = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.innerHTML = `${open ? '閉じる' : '続きを読む'}<span class="faq__toggle-icon" aria-hidden="true"></span>`;
    };
    const setOpen = (open, { scroll = false } = {}) => {
      if (open) {
        chatEl.style.maxHeight = peek() + 'px';
        box.classList.add('is-animating');
        box.classList.remove('is-collapsed');
        requestAnimationFrame(() => { chatEl.style.maxHeight = chatEl.scrollHeight + 'px'; });
        const done = () => { chatEl.style.maxHeight = ''; box.classList.remove('is-animating'); chatEl.removeEventListener('transitionend', done); };
        if (reduced) done(); else chatEl.addEventListener('transitionend', done);
      } else {
        chatEl.style.maxHeight = '';
        box.classList.add('is-collapsed');
        if (scroll) $('#faq').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
      label(open);
    };

    // 全部が収まる長さなら折りたたまない
    if (chatEl.scrollHeight <= peek() + 120) { btn.remove(); return; }
    setOpen(false);
    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true', { scroll: true }));
    // カテゴリーのボタンで隠れた部分に飛ぶときは先に開く
    chatEl.addEventListener('click', (e) => {
      if (e.target.closest('.chat-nav__chip') && box.classList.contains('is-collapsed')) setOpen(true);
    });
  })();

  /* ---------- 口コミ：カルーセル（共通部品） ---------- */
  window.XUI.carousel($('[data-rv]'));

  // 料金カード：ポインターに合わせてわずかに傾く
  const priceCard = $('[data-price-card]');
  if (finePointer && !reduced) {
    priceCard.addEventListener('pointermove', (e) => {
      const r = priceCard.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      priceCard.classList.add('is-tilting');
      priceCard.style.rotate = `${(-1.5 + dx * 2.4).toFixed(2)}deg`;
    });
    priceCard.addEventListener('pointerleave', () => {
      priceCard.classList.remove('is-tilting');
      priceCard.style.rotate = '';
    });
  }

  /* ---------- HERO：組版 ---------- */
  const hero = $('#hero');
  const typeEl = $('[data-type]');
  const jaEl = $('[data-hero-ja]');
  const srEl = $('[data-hero-sr]');
  const insert = $('[data-insert]');
  const insertTilt = $('[data-insert-tilt]');
  const tag = $('[data-tag]');
  const tagTilt = $('[data-tag-tilt]');
  const flood = $('.hero__flood');
  const arcs = $('.hero__arcs');
  const arcsG = $('.hero__arcs-g');
  const rulePath = $('[data-rule]');

  const JA = 'あなたらしい美しさに、<br class="sp">そっと寄り添う。';
  const COPY = {
    base: { ja: JA, sr: 'もっと、自分を好きになる。あなたらしい美しさに、そっと寄り添う。' },
    free: { ja: JA, sr: 'もっと、自由な自分へ。あなたらしい美しさに、そっと寄り添う。' }
  };
  // [文字列, 揃え]  r = 右揃え / c = 字下げ。同じ文字は組み替え時に移動して再利用される
  function lines(mode) {
    if (mode === 'free') return [['もっと、', 'r'], ['自由な', ''], ['自分へ。', 'c']];
    return mqMobile.matches
      ? [['もっと、', ''], ['自分を', ''], ['好きに', 'c'], ['なる。', '']]
      : [['もっと、', ''], ['自分を好きに', ''], ['なる。', 'c']];
  }

  let mode = 'base';
  let chars = [];
  let knot = null;

  function build(m) {
    typeEl.innerHTML = '';
    const out = [];
    knot = null;
    lines(m).forEach(([txt, al]) => {
      const ln = document.createElement('span');
      ln.className = 'ln' + (al ? ' ln--' + al : '');
      for (const c of txt) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.dataset.c = c;
        s.textContent = c;
        if (c === '。') {
          // 句点のベースライン位置を測るための目印
          knot = document.createElement('i');
          knot.style.cssText = 'display:inline-block;width:0;height:0;';
          s.appendChild(knot);
        }
        ln.appendChild(s);
        out.push(s);
      }
      typeEl.appendChild(ln);
    });
    jaEl.innerHTML = COPY[m].ja;
    srEl.textContent = COPY[m].sr;
    springs.chars = out.map(() => mkSpring());
    return out;
  }

  /* ---------- バネ ---------- */
  function mkSpring() { return { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 }; }
  function stepSpring(s, tx, ty, tr, k, d) {
    s.vx = (s.vx + (tx - s.x) * k) * d;
    s.vy = (s.vy + (ty - s.y) * k) * d;
    s.vr = (s.vr + (tr - s.r) * k) * d;
    s.x += s.vx; s.y += s.vy; s.r += s.vr;
    return Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.r) + Math.abs(s.vx) + Math.abs(s.vy) > 0.02;
  }
  const springs = { chars: [], insert: mkSpring(), tag: mkSpring(), ja: mkSpring() };

  chars = build(mode);

  /* ---------- THE HIDDEN THREAD ---------- */
  const threadPath = $('.thread__path');
  const rings = $('.thread__rings');
  const hit = $('.thread__hit');
  const NS = 'http://www.w3.org/2000/svg';
  const N = 18;
  const T = {
    state: 'idle', // idle | drag | auto | falling | gone
    pts: [], prev: [], ptr: null, hover: null,
    grow: 1, alpha: 1, tension: 0, smooth: 0, keyboard: false, dir: { x: 0.6, y: 0.8 }
  };
  const restLen = () => (mqMobile.matches ? 56 : 78);
  const pullMax = () => (mqMobile.matches ? 120 : 170);
  let heroRect = hero.getBoundingClientRect();

  function anchor() {
    if (!knot) return { x: 0, y: 0 };
    const k = knot.getBoundingClientRect();
    const dot = knot.parentElement.getBoundingClientRect();
    // 「。」の丸の下端から糸を垂らす（丸は字面の左下寄り）
    return { x: dot.left - heroRect.left + dot.width * 0.3, y: k.top - heroRect.top - dot.height * 0.04 };
  }

  function seedThread() {
    const a = anchor();
    const seg = (restLen() * T.grow) / (N - 1);
    T.pts = [];
    T.prev = [];
    for (let i = 0; i < N; i++) {
      const p = { x: a.x + Math.sin(i * 0.35) * i * 0.6, y: a.y + i * seg };
      T.pts.push(p);
      T.prev.push({ ...p });
    }
  }

  function local(e) { return { x: e.clientX - heroRect.left, y: e.clientY - heroRect.top }; }

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') T.hover = local(e);
  });
  hero.addEventListener('pointerleave', () => (T.hover = null));

  hit.addEventListener('pointerdown', (e) => {
    if (T.state !== 'idle') return;
    e.preventDefault();
    hit.setPointerCapture(e.pointerId);
    T.state = 'drag';
    T.keyboard = false;
    T.ptr = local(e);
    body.classList.add('is-pulling');
  });
  hit.addEventListener('pointermove', (e) => {
    if (T.state === 'drag') T.ptr = local(e);
  });
  const endDrag = () => {
    if (T.state === 'drag') T.state = 'idle'; // 途中で離すと、すべてがバネで戻る
    body.classList.remove('is-pulling');
  };
  hit.addEventListener('pointerup', endDrag);
  hit.addEventListener('pointercancel', endDrag);
  hit.addEventListener('click', (e) => e.preventDefault()); // クリックだけでは外れない

  // キーボード：Enter / Space で糸を引き抜く代替操作
  hit.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && T.state === 'idle') {
      e.preventDefault();
      T.keyboard = true;
      T.state = 'auto';
      const a = anchor();
      const tip = T.pts[N - 1];
      const L = restLen() + pullMax() * 1.5;
      const to = { x: a.x + L * 0.55, y: a.y + L * 0.83 };
      T.ptr = { ...tip };
      const k = { v: 0 };
      gsap.to(k, {
        v: 1, duration: reduced ? 0.6 : 1.6, ease: 'power1.in',
        onUpdate: () => (T.ptr = { x: tip.x + (to.x - tip.x) * k.v, y: tip.y + (to.y - tip.y) * k.v })
      });
    }
  });

  function simulate(t) {
    const a = anchor();
    const pinned = T.state !== 'falling';
    const dragging = T.state === 'drag' || T.state === 'auto';
    const L = restLen() * T.grow;
    let seg = L / (N - 1);
    let dist = 0;
    if (dragging) {
      dist = Math.hypot(T.ptr.x - a.x, T.ptr.y - a.y);
      if (dist > L) seg = dist / (N - 1); // 引っ張るほど、まっすぐ張る
    }

    const g = T.state === 'falling' ? 0.6 : 0.16;
    for (let i = 1; i < N; i++) {
      const p = T.pts[i], q = T.prev[i];
      const vx = (p.x - q.x) * 0.95, vy = (p.y - q.y) * 0.95;
      q.x = p.x; q.y = p.y;
      const sway = reduced ? 0 : Math.sin(t * 1.1 + i * 0.25) * 0.012 * i;
      p.x += vx + 0.035 + sway;
      p.y += vy + g;
      // カーソルが近づくと、ほんの少しだけ持ち上がる
      if (T.state === 'idle' && T.hover) {
        const d = Math.hypot(T.hover.x - p.x, T.hover.y - p.y);
        if (d < 70) {
          const k = (1 - d / 70) * (i / N);
          p.x += (T.hover.x - p.x) * 0.0035 * k;
          p.y -= 0.13 * k;
        }
      }
    }
    if (pinned) { T.pts[0].x = a.x; T.pts[0].y = a.y; }
    if (dragging) { T.pts[N - 1].x = T.ptr.x; T.pts[N - 1].y = T.ptr.y; }

    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < N - 1; i++) {
        const p = T.pts[i], q = T.pts[i + 1];
        const dx = q.x - p.x, dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - seg) / d;
        const fixP = i === 0 && pinned;
        const fixQ = i + 1 === N - 1 && dragging;
        const wp = fixP ? 0 : fixQ ? 1 : 0.5;
        const wq = fixQ ? 0 : fixP ? 1 : 0.5;
        p.x += dx * diff * wp; p.y += dy * diff * wp;
        q.x -= dx * diff * wq; q.y -= dy * diff * wq;
      }
      // 髪の毛のようなしなり（2つ先の点との距離を保つ）
      if (!dragging) {
        for (let i = 0; i < N - 2; i++) {
          const p = T.pts[i], q = T.pts[i + 2];
          const dx = q.x - p.x, dy = q.y - p.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const diff = ((d - seg * 1.85) / d) * 0.12;
          if (!(i === 0 && pinned)) { p.x += dx * diff; p.y += dy * diff; }
          q.x -= dx * diff; q.y -= dy * diff;
        }
      }
    }

    if (dragging) {
      T.tension = Math.min(1, Math.max(0, dist - L) / pullMax());
      const tip = T.pts[N - 1];
      const l = Math.hypot(tip.x - a.x, tip.y - a.y) || 1;
      T.dir = { x: (tip.x - a.x) / l, y: (tip.y - a.y) / l };
    } else {
      T.tension = 0;
    }
    T.smooth += (T.tension - T.smooth) * 0.3;
    return a;
  }

  function drawThread() {
    const P = T.pts;
    let d = `M${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;
    for (let i = 1; i < N - 1; i++) {
      const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2;
      d += ` Q${P[i].x.toFixed(1)} ${P[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += ` L${P[N - 1].x.toFixed(1)} ${P[N - 1].y.toFixed(1)}`;
    threadPath.setAttribute('d', d);
    const near = T.hover && Math.hypot(T.hover.x - P[N - 1].x, T.hover.y - P[N - 1].y) < 80;
    threadPath.style.opacity = (T.alpha * (T.state === 'idle' && !near ? 0.62 : 0.9)).toFixed(2);
    threadPath.style.strokeWidth = (1.15 - T.smooth * 0.35).toFixed(2);
    const tip = T.state === 'drag' ? T.ptr : P[N - 1];
    hit.style.transform = `translate(${tip.x.toFixed(1)}px, ${tip.y.toFixed(1)}px)`;
  }

  /* ---------- 連鎖反応：糸の張力で各要素が動く ---------- */
  const mint = [239, 232, 223], coral = [185, 166, 154];
  let scrollRot = 0;
  let settled = true;

  function chain(a) {
    const t = T.smooth;
    const u = T.dir;
    const k = 0.14, d = 0.74;
    let moving = t > 0.001;
    const last = chars.length - 1;

    chars.forEach((s, i) => {
      const sp = springs.chars[i];
      const w = 0.3 + 0.7 * Math.exp(-(last - i) / 3.2);
      const tx = u.x * t * 26 * w;
      const ty = u.y * t * 26 * w;
      const tr = (u.x * 9 + Math.sin(i * 1.7) * 4) * t * w;
      if (stepSpring(sp, tx, ty, tr, k, d)) moving = true;
      s.style.translate = `${sp.x.toFixed(2)}px ${sp.y.toFixed(2)}px`;
      s.style.rotate = `${sp.r.toFixed(2)}deg`;
    });

    const baseIns = mode === 'free' ? -4 : 3;
    if (stepSpring(springs.insert, u.x * t * 30, u.y * t * 30, u.x * t * 8, 0.1, 0.78)) moving = true;
    insertTilt.style.translate = `${springs.insert.x.toFixed(2)}px ${springs.insert.y.toFixed(2)}px`;
    insertTilt.style.rotate = `${(baseIns + springs.insert.r).toFixed(2)}deg`;

    if (stepSpring(springs.tag, u.x * t * 44, u.y * t * 40, u.x * t * 16, 0.09, 0.8)) moving = true;
    tagTilt.style.translate = `${springs.tag.x.toFixed(2)}px ${springs.tag.y.toFixed(2)}px`;
    tagTilt.style.rotate = `${(-6 + springs.tag.r).toFixed(2)}deg`;

    if (stepSpring(springs.ja, u.x * t * 10, u.y * t * 8, 0, 0.12, 0.76)) moving = true;
    jaEl.style.translate = `${springs.ja.x.toFixed(2)}px ${springs.ja.y.toFixed(2)}px`;

    // 罫線：糸に引っかかったように曲がる
    const tr = typeEl.getBoundingClientRect();
    const ry = tr.bottom - heroRect.top + Math.max(10, (jaEl.getBoundingClientRect().top - tr.bottom) / 2);
    const x0 = parseFloat(getComputedStyle(hero).paddingLeft);
    const x1 = heroRect.width - x0;
    const tip = T.pts[N - 1] || a;
    const cx = a.x + (tip.x - a.x) * 0.5 * t;
    const cy = ry + (tip.y - ry) * 0.7 * t;
    rulePath.setAttribute('d', `M${x0.toFixed(1)} ${ry.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${ry.toFixed(1)}`);

    // 背景の幾何学模様
    arcsG.style.transform = `rotate(${(scrollRot + t * 32).toFixed(2)}deg) scale(${(1 + t * 0.1).toFixed(3)})`;
    if (mode === 'base') {
      const c = mint.map((m, j) => Math.round(m + (coral[j] - m) * Math.min(1, t * 1.4)));
      arcs.style.stroke = `rgb(${c.join(',')})`;
      arcs.style.strokeWidth = (1.5 + t * 1.5).toFixed(2);
    }
    settled = !moving;
  }

  /* ---------- 糸が外れた瞬間 ---------- */
  const secret = $('.secret');
  const card = $('.secret__card');
  const closeBtn = $('.secret__btn');

  function release(a) {
    T.state = 'falling';
    body.classList.remove('is-pulling');
    gsap.killTweensOf(T);
    // 文字は反動で一度だけ跳ねる
    springs.chars.forEach((sp, i) => { sp.vx -= T.dir.x * 6 * (0.4 + Math.random() * 0.6); sp.vy -= T.dir.y * 6; sp.vr += (i % 2 ? 1 : -1) * 3; });
    gsap.to(T, { alpha: 0, duration: 1.2, ease: 'power1.in', onComplete: () => { T.state = 'gone'; threadPath.setAttribute('d', ''); } });

    for (let i = 0; i < 3; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', a.x);
      c.setAttribute('cy', a.y);
      c.setAttribute('r', 2);
      rings.appendChild(c);
      gsap.fromTo(c, { attr: { r: 2 }, opacity: 1, strokeWidth: 2 },
        { attr: { r: 90 + i * 50 }, opacity: 0, strokeWidth: 0.3, duration: 1.3, delay: i * 0.12, ease: 'expo.out', onComplete: () => c.remove() });
    }

    const R = Math.hypot(Math.max(a.x, heroRect.width - a.x), Math.max(a.y, heroRect.height - a.y)) + 40;
    gsap.fromTo(flood, { clipPath: `circle(0px at ${a.x}px ${a.y}px)` },
      { clipPath: `circle(${R}px at ${a.x}px ${a.y}px)`, duration: reduced ? 0.4 : 1.3, ease: 'expo.inOut' });
    gsap.to(arcs, { stroke: 'rgba(248, 247, 243, .85)', strokeWidth: 1.5, duration: 1 });

    gsap.delayedCall(reduced ? 0.1 : 0.45, () => recompose('free'));
    gsap.delayedCall(reduced ? 0.6 : 2.1, showCard);
  }

  // 大きな文字の組み替え（FLIP）：同じ文字は移動し、足りない文字は現れ、余った文字は飛び去る
  function recompose(next) {
    const font = getComputedStyle(typeEl);
    const old = chars.map((s) => ({ c: s.dataset.c, r: s.getBoundingClientRect() }));
    const insR = insert.getBoundingClientRect();
    const tagR = tag.getBoundingClientRect();

    mode = next;
    hero.classList.toggle('is-free', mode === 'free');
    chars = build(mode);

    if (reduced) {
      gsap.fromTo([typeEl, jaEl], { opacity: 0 }, { opacity: 1, duration: 0.3 });
      return;
    }

    const used = old.map(() => false);
    chars.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const j = old.findIndex((o, k) => !used[k] && o.c === s.dataset.c);
      if (j >= 0) {
        used[j] = true;
        const o = old[j].r;
        gsap.fromTo(s, { x: o.left - r.left, y: o.top - r.top, scale: o.height / r.height, transformOrigin: '0 0' },
          { x: 0, y: 0, scale: 1, duration: 1.25, delay: i * 0.03, ease: 'expo.inOut', clearProps: 'transform' });
      } else {
        gsap.fromTo(s, { opacity: 0, y: '0.6em', rotation: i % 2 ? 24 : -24 },
          { opacity: 1, y: 0, rotation: 0, duration: 1, delay: 0.45 + i * 0.04, ease: 'expo.out', clearProps: 'transform,opacity' });
      }
    });
    old.forEach((o, k) => {
      if (used[k]) return;
      const g = document.createElement('span');
      g.textContent = o.c;
      g.setAttribute('aria-hidden', 'true');
      g.style.cssText = `position:fixed;left:${o.r.left}px;top:${o.r.top}px;z-index:5;pointer-events:none;` +
        `font:${font.fontWeight} ${font.fontSize}/${font.lineHeight} ${font.fontFamily};` +
        `font-variation-settings:${font.fontVariationSettings};letter-spacing:${font.letterSpacing};color:${font.color};`;
      document.body.appendChild(g);
      gsap.to(g, { y: -140, x: k % 2 ? 60 : -60, rotation: k % 2 ? 40 : -40, opacity: 0, duration: 1.1, ease: 'power3.in', onComplete: () => g.remove() });
    });

    const flip = (el, from) => {
      const to = el.getBoundingClientRect();
      gsap.fromTo(el, { x: from.left - to.left, y: from.top - to.top }, { x: 0, y: 0, duration: 1.3, ease: 'expo.inOut', clearProps: 'transform' });
    };
    flip(insert, insR);
    flip(tag, tagR);
    gsap.fromTo(jaEl, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, delay: 0.5, ease: 'expo.out', clearProps: 'clipPath' });
  }

  function showCard() {
    secret.hidden = false;
    if (reduced) gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    else gsap.fromTo(card, { yPercent: 70, rotation: -9, opacity: 0 }, { yPercent: 0, rotation: -1.5, opacity: 1, duration: 1.2, ease: 'expo.out' });
    closeBtn.focus({ preventScroll: true });
  }

  function closeSecret() {
    if (secret.hidden) return;
    gsap.to(card, {
      yPercent: 30, rotation: 5, opacity: 0, duration: reduced ? 0.2 : 0.45, ease: 'power2.in',
      onComplete: () => { secret.hidden = true; reset(); }
    });
  }

  // 初期状態へ戻す（何度でも体験できる。状態は保存しない）
  function reset() {
    recompose('base');
    settled = false; // 傾き・位置のバネを初期値まで戻す
    chain(anchor());
    heroRect = hero.getBoundingClientRect();
    const a = anchor();
    gsap.to(flood, { clipPath: `circle(0px at ${a.x}px ${a.y}px)`, duration: reduced ? 0.3 : 1.1, ease: 'expo.inOut' });
    gsap.to(arcs, { stroke: 'rgb(239, 232, 223)', strokeWidth: 1.5, duration: 1, onComplete: () => gsap.set(arcs, { clearProps: 'stroke,strokeWidth' }) });
    T.grow = 0.05;
    T.alpha = 1;
    T.hover = null;
    gsap.delayedCall(reduced ? 0.3 : 1.2, () => {
      seedThread();
      T.state = 'idle';
      gsap.to(T, { grow: 1, duration: reduced ? 0.3 : 1.6, ease: 'power2.out' });
      if (T.keyboard) hit.focus({ preventScroll: true });
    });
  }

  closeBtn.addEventListener('click', closeSecret);
  secret.addEventListener('click', (e) => e.target === secret && closeSecret());
  document.addEventListener('keydown', (e) => {
    if (secret.hidden) return;
    if (e.key === 'Escape') closeSecret();
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
  });

  /* ---------- スクロール連動（パララックス・タイポグラフィ・模様） ---------- */
  const header = $('.header');
  const drifts = $$('[data-drift]');
  const flowPath = $('.flow__thread path');
  const flowWrap = $('.flow__wrap');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    header.classList.toggle('is-scrolled', y > 40);
    if (reduced) return;
    scrollRot = y * 0.04;
    if (y < vh * 1.2) {
      typeEl.style.translate = `0 ${(-y * 0.08).toFixed(1)}px`;
      insert.style.translate = `0 ${(-y * 0.2).toFixed(1)}px`;
      if (settled && T.state !== 'drag') chain(anchor());
    }
    drifts.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      el.style.translate = `${((r.top + r.height / 2 - vh / 2) * -0.06).toFixed(1)}px 0`;
    });
    const fr = flowWrap.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.85 - fr.top) / (fr.height + vh * 0.3)));
    flowPath.style.setProperty('--draw', (1 - p).toFixed(3));
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- ループ ---------- */
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(hero);
  }
  const start = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const t = (now - start) / 1000;
    heroRect = hero.getBoundingClientRect();
    if (T.state === 'gone') {
      if (!settled || mode === 'base') chain(anchor());
      return;
    }
    const a = simulate(t);
    drawThread();
    if (T.state === 'idle' && !settled) chain(a);
    else if (T.state !== 'idle') chain(a);
    else if (T.hover) chain(a);
    if ((T.state === 'drag' || T.state === 'auto') && T.tension >= 1) release(a);
  }

  function init() {
    heroRect = hero.getBoundingClientRect();
    seedThread();
    chain(anchor());
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  else window.addEventListener('load', init);

  // 画面幅が変わったら組み直す（アニメーションなし）
  let rt;
  let wasMobile = mqMobile.matches;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (mqMobile.matches !== wasMobile && mode === 'base') {
        wasMobile = mqMobile.matches;
        chars = build(mode);
      }
      heroRect = hero.getBoundingClientRect();
      if (T.state === 'idle') seedThread();
      chain(anchor());
    }, 150);
  });
})();
