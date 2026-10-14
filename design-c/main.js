(function () {
  const { X, esc, nl, yen, list, reduced } = window.XUI;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;

  /* ---------- 共通データの描画 ---------- */
  const ICONS = [
    '<path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />',
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5" />',
    '<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z" />'
  ];
  list($('[data-owner-body]'), X.owner.body, (p) => `<p>${nl(p)}</p>`);
  list($('[data-features]'), X.features, (f, i) => `
    <li class="feature" data-reveal>
      <span class="feature__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[i % ICONS.length]}</svg></span>
      <h3 class="feature__title">${esc(f.title)}</h3>
      <p class="feature__body">${esc(f.body)}</p>
    </li>`);
  list($('[data-price]'), X.price.items, (p) => `
    <div class="price__row"><dt>${esc(p.label)}</dt><dd>${yen(p.price)}<small>円</small></dd></div>`);
  list($('[data-flow]'), X.flow, (f) => `
    <li class="flow__item" data-reveal>
      <span class="flow__no" aria-hidden="true">${Number(f.no)}</span>
      <h3 class="flow__title"><span class="sr-only">STEP ${esc(f.no)}　</span>${esc(f.title)}</h3>
      <p class="flow__body">${esc(f.body)}</p>
    </li>`);
  window.XUI.chat($('[data-faq]'));
  window.XUI.carousel($('[data-rv]'));


  /* ---------- 隠しギミック：シールをはがす ---------- */
  const hero = $('#hero');
  const visual = $('[data-visual]');
  const photoImg = $('.hero__photo img');
  const mqWide = window.matchMedia('(min-width: 768px)');
  const stk = $('[data-stk]');
  const front = $('[data-stk-front]');
  const flapclip = $('[data-stk-flapclip]');
  const back = $('[data-stk-back]');
  const hit = $('[data-stk-hit]');
  const peek = $('[data-peek]');
  const confetti = $('[data-confetti]');

  const P = {
    state: 'idle', // idle | drag | auto | gone
    q: { x: 0, y: 0 }, // めくった端がいまある位置（シール内の座標）
    lift: 7, // 何もしていないときのめくれ具合
    pointer: null, hover: false, keyboard: false, progress: 0, dir: { x: -1, y: 0 }
  };
  let S = 120, r = 60, C0 = { x: 0, y: 0 }, uIn = { x: 0, y: 0 };

  function measure() {
    // めくれている端：スマホは左上（写真の内側）、広い画面は右上
    const ANGLE = (mqWide.matches ? -40 : -140) * Math.PI / 180;
    S = stk.offsetWidth;
    r = S / 2;
    C0 = { x: r + r * Math.cos(ANGLE), y: r + r * Math.sin(ANGLE) };
    uIn = { x: -Math.cos(ANGLE), y: -Math.sin(ANGLE) };
  }
  const restQ = (lift) => ({ x: C0.x + uIn.x * lift, y: C0.y + uIn.y * lift });

  // 折り目を計算して描く。q はめくった端の位置
  function render(q) {
    let vx = q.x - C0.x, vy = q.y - C0.y;
    const along = vx * uIn.x + vy * uIn.y;
    if (along < 0) { vx -= 2 * along * uIn.x; vy -= 2 * along * uIn.y; } // 外向きに引いても、内向きにめくれる
    let d = Math.hypot(vx, vy);
    if (d < 0.5) { vx = uIn.x * 0.5; vy = uIn.y * 0.5; d = 0.5; }
    const n = { x: vx / d, y: vy / d };
    const m = { x: C0.x + vx / 2, y: C0.y + vy / 2 }; // 折り目の通る点
    const t = { x: -n.y, y: n.x };
    const L = S * 4;
    const pt = (a, b) => `${(m.x + t.x * a + n.x * b).toFixed(1)}px ${(m.y + t.y * a + n.y * b).toFixed(1)}px`;
    const poly = `polygon(${pt(L, 0)}, ${pt(L, L)}, ${pt(-L, L)}, ${pt(-L, 0)})`;
    front.style.clipPath = poly;
    flapclip.style.clipPath = poly;
    // 折り目に対して鏡うつしにした「裏面」
    const k = 2 * (m.x * n.x + m.y * n.y);
    back.style.transform = `matrix(${(1 - 2 * n.x * n.x).toFixed(4)}, ${(-2 * n.x * n.y).toFixed(4)}, ${(-2 * n.x * n.y).toFixed(4)}, ${(1 - 2 * n.y * n.y).toFixed(4)}, ${(k * n.x).toFixed(2)}, ${(k * n.y).toFixed(2)})`;
    P.progress = d / (2 * r);
    P.dir = { x: -n.x, y: -n.y };
    const tip = { x: C0.x + vx, y: C0.y + vy };
    hit.style.transform = `translate(${(stk.offsetLeft + tip.x).toFixed(1)}px, ${(stk.offsetTop + tip.y).toFixed(1)}px)`;
  }

  function local(e) {
    const b = stk.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  // カーソルが近づくと、端が少しだけ持ち上がる
  visual.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || P.state !== 'idle') return;
    const p = local(e);
    const near = Math.hypot(p.x - C0.x, p.y - C0.y) < 70;
    if (near !== P.hover) {
      P.hover = near;
      gsap.to(P, { lift: near ? 15 : 7, duration: 0.5, ease: 'power3.out' });
    }
  });
  visual.addEventListener('pointerleave', () => {
    if (P.hover) { P.hover = false; gsap.to(P, { lift: 7, duration: 0.5, ease: 'power3.out' }); }
  });

  hit.addEventListener('pointerdown', (e) => {
    if (P.state !== 'idle') return;
    e.preventDefault();
    hit.setPointerCapture(e.pointerId);
    gsap.killTweensOf(P.q);
    P.state = 'drag';
    P.keyboard = false;
    P.q = local(e);
    body.classList.add('is-peeling');
  });
  hit.addEventListener('pointermove', (e) => {
    if (P.state === 'drag') P.q = local(e);
  });
  const endDrag = () => {
    body.classList.remove('is-peeling');
    if (P.state !== 'drag') return;
    P.state = 'idle';
    // 途中で離すと、ぺたっと元に戻る
    const to = restQ(P.lift);
    gsap.to(P.q, { x: to.x, y: to.y, duration: reduced ? 0.2 : 0.7, ease: 'power3.out' });
  };
  hit.addEventListener('pointerup', endDrag);
  hit.addEventListener('pointercancel', endDrag);
  hit.addEventListener('click', (e) => e.preventDefault());

  // キーボード：Enter / Space で自動的にはがす
  hit.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && P.state === 'idle') {
      e.preventDefault();
      P.keyboard = true;
      P.state = 'auto';
      gsap.to(P.q, { x: C0.x + uIn.x * 2.4 * r, y: C0.y + uIn.y * 2.4 * r + 10, duration: reduced ? 0.5 : 1.4, ease: 'power1.inOut' });
    }
  });

  /* ---------- はがし切ったとき ---------- */
  const secret = $('.secret');
  const card = $('.secret__card');
  const closeBtn = $('.secret__btn');

  function release() {
    P.state = 'gone';
    body.classList.remove('is-peeling');
    gsap.killTweensOf(P.q);
    hero.classList.add('is-unlocked');

    // シールは、はがした勢いのまま飛んでいく
    const fly = stk.querySelector('.stk__face').cloneNode(true);
    fly.style.cssText = `position:absolute;left:${stk.offsetLeft}px;top:${stk.offsetTop}px;width:${S}px;height:${S}px;z-index:6;pointer-events:none;`;
    visual.appendChild(fly);
    stk.classList.add('is-gone');
    gsap.to(fly, {
      x: P.dir.x * -60, y: -180, rotation: -200, scale: 0.6, opacity: 0,
      duration: reduced ? 0.3 : 1.3, ease: 'power2.in', onComplete: () => fly.remove()
    });
    gsap.fromTo(peek, { opacity: 0.4 }, { opacity: 1, duration: 1.2, ease: 'power2.out' });
    if (!reduced) burst();
    gsap.delayedCall(reduced ? 0.4 : 1.3, showCard);
  }

  // 金の粒がきらめきながら舞い上がる
  function burst() {
    const colors = ['#F3E3BC', '#C9A96E', '#E9D3A2', '#A5844C', '#FFFFFF'];
    const cx = stk.offsetLeft + r, cy = stk.offsetTop + r;
    for (let i = 0; i < 26; i++) {
      const el = document.createElement('i');
      const size = 2 + Math.random() * 4;
      el.style.cssText = `width:${size}px;height:${size}px;background:${colors[i % colors.length]};box-shadow:0 0 ${size * 2}px rgba(233,211,162,.9);`;
      confetti.appendChild(el);
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 110;
      gsap.set(el, { x: cx, y: cy, opacity: 0 });
      gsap.timeline({ onComplete: () => el.remove() })
        .to(el, { opacity: 1, duration: 0.2 })
        .to(el, { x: cx + Math.cos(a) * v, y: cy + Math.sin(a) * v * 0.6 - 90 - Math.random() * 80, duration: 1.6 + Math.random() * 0.8, ease: 'power2.out' }, 0)
        .to(el, { opacity: 0, duration: 0.8 }, '-=0.8');
    }
  }

  function showCard() {
    secret.hidden = false;
    if (reduced) gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    else gsap.fromTo(card, { y: 30, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out' });
    closeBtn.focus({ preventScroll: true });
  }

  function closeSecret() {
    if (secret.hidden) return;
    gsap.to(card, {
      y: 16, opacity: 0, duration: reduced ? 0.2 : 0.4, ease: 'power2.in',
      onComplete: () => { secret.hidden = true; reset(); }
    });
  }

  // 初期状態へ（シールは「ぺたっ」と貼り直される。状態は保存しない）
  function reset() {
    hero.classList.remove('is-unlocked');
    confetti.innerHTML = '';
    P.lift = 7;
    P.hover = false;
    const to = restQ(P.lift);
    P.q = { x: to.x, y: to.y };
    render(P.q);
    stk.classList.remove('is-gone');
    gsap.fromTo(stk, { y: -60, rotation: 18, scale: 1.12, opacity: 0 },
      { y: 0, rotation: 0, scale: 1, opacity: 1, duration: reduced ? 0.2 : 0.9, ease: 'power3.out', clearProps: 'transform,opacity',
        onComplete: () => { P.state = 'idle'; if (P.keyboard) hit.focus({ preventScroll: true }); } });
  }

  closeBtn.addEventListener('click', closeSecret);
  secret.addEventListener('click', (e) => e.target === secret && closeSecret());
  document.addEventListener('keydown', (e) => {
    if (secret.hidden) return;
    if (e.key === 'Escape') closeSecret();
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
  });

  /* ---------- ループ ---------- */
  let visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(hero);
  const start = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (P.state === 'idle' && !gsap.isTweening(P.q)) P.q = restQ(P.lift);
    if (P.state !== 'gone') render(P.q);
    const pull = P.state === 'drag' || P.state === 'auto' ? Math.min(1, P.progress) : 0;
    // めくる力に合わせて、写真がわずかに寄る
    photoImg.style.scale = (1 + pull * 0.035).toFixed(4);
    if ((P.state === 'drag' || P.state === 'auto') && P.progress >= 1.08) release();
  }

  function init() {
    measure();
    P.q = restQ(P.lift);
    render(P.q);
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else window.addEventListener('load', init);
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { measure(); if (P.state === 'idle') { P.q = restQ(P.lift); render(P.q); } }, 150);
  });
  mqWide.addEventListener('change', () => { measure(); if (P.state === 'idle') { P.q = restQ(P.lift); render(P.q); }
  });

  // ヘッダー：スクロールしたら少しだけ影を濃く
  const header = $('.header');
  window.addEventListener('scroll', () => header.classList.toggle('is-scrolled', window.scrollY > 20), { passive: true });
})();
