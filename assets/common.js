/*
 * 全案共通の小さなヘルパー（data.js の後に読み込む）
 * - [data-text="owner.title"] に data.js の値を流し込む
 * - [data-link="line"] に正しいURLを設定する
 * - [data-map] に Google マップを埋め込む
 * - ハンバーガーメニュー、スクロール表示、構造化データ、モック用の戻るボタン
 */
(function () {
  const X = window.XAVIL;
  const root = document.documentElement.dataset.root || '';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nl = (s) => esc(s).replace(/\n/g, '<br>');
  const yen = (n) => n.toLocaleString('ja-JP');
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), X);

  function bind(scope) {
    const s = scope || document;
    s.querySelectorAll('[data-text]').forEach((el) => {
      const v = get(el.dataset.text);
      if (v != null) el.innerHTML = nl(v);
    });
    s.querySelectorAll('[data-link]').forEach((el) => {
      const key = el.dataset.link;
      const href = key === 'privacy' ? root + X.links.privacy : X.links[key];
      el.href = href;
      if (/^https?:/.test(href)) {
        el.target = '_blank';
        el.rel = 'noopener';
      }
    });
    s.querySelectorAll('[data-map]').forEach((el) => {
      el.innerHTML =
        '<iframe src="' + X.links.mapEmbed + '" title="Salon Xavil 周辺の地図" loading="lazy" ' +
        'referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
    });
    s.querySelectorAll('[data-draft]').forEach((el) => {
      el.hidden = !X.mock.showDraftNotes;
    });
  }

  // 一覧を描画：XUI.list(el, items, item => html)
  function list(el, items, tpl) {
    if (el) el.innerHTML = items.map(tpl).join('');
  }

  function menu() {
    const btn = document.querySelector('[data-menu-toggle]');
    if (!btn) return;
    const set = (open) => {
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    document.querySelectorAll('[data-menu] a').forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  }

  function reveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -10% 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  function jsonLd() {
    const a = X.address;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      name: X.name,
      alternateName: X.nameKana,
      description: X.description,
      url: location.href.split('#')[0],
      sameAs: [X.links.instagram],
      address: {
        '@type': 'PostalAddress',
        postalCode: a.postal,
        addressRegion: a.region,
        addressLocality: a.locality,
        streetAddress: a.street + ' ' + a.building,
        addressCountry: 'JP'
      }
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function mockNav() {
    if (!X.mock.showProposalNav || document.body.dataset.page === 'proposals' || window.self !== window.top) return;
    const a = document.createElement('a');
    a.className = 'x-mock-back';
    a.href = root + 'index.html';
    a.innerHTML = '<span aria-hidden="true">←</span> 比較ページへ';
    document.body.appendChild(a);
  }

  // よくあるご質問：チャットの会話形式で描画
  // お客様の質問は右、サロンの回答は左の吹き出し。カテゴリーは会話の区切りとして表示
  function chat(el) {
    if (!el) return;
    const draft = X.mock.showDraftNotes;
    const groups = X.faq
      .map((g) => ({ ...g, items: g.items.filter((it) => it.a || draft) }))
      .filter((g) => g.items.length);
    const nav = groups.map((g) => `<a class="chat-nav__chip" href="#faq-${esc(g.id)}">${esc(g.label)}</a>`).join('');
    const body = groups.map((g) => `
      <div class="chat__group" id="faq-${esc(g.id)}">
        <h3 class="chat__day"><span>${esc(g.label)}</span></h3>
        <dl class="chat__list">${g.items.map((it) => `
          <div class="chat__pair">
            <dt class="chat__q"><span class="sr-only">質問：</span><span class="chat__bubble">${esc(it.q)}</span></dt>
            <dd class="chat__a">
              <span class="chat__avatar" aria-hidden="true">X</span>
              <span class="chat__who"><span class="chat__name">Salon Xavil</span>
                <span class="sr-only">回答：</span>${it.a
                  ? `<span class="chat__bubble">${nl(it.a)}</span>${it.todo && draft ? `<span class="chat__todo" data-draft>MEMO　${esc(it.todo)}</span>` : ''}`
                  : `<span class="chat__bubble chat__bubble--pending">${esc(X.faqPending)}</span>`}
              </span>
            </dd>
          </div>`).join('')}
        </dl>
      </div>`).join('');
    el.innerHTML = `<nav class="chat-nav" aria-label="質問のカテゴリー">${nav}</nav><div class="chat">${body}</div>`;

    // 会話が順番に届くように表示（動きを減らす設定では即表示）
    const pairs = el.querySelectorAll('.chat__pair');
    if (reduced || !('IntersectionObserver' in window)) {
      pairs.forEach((p) => p.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    pairs.forEach((p) => io.observe(p));
  }

  // 口コミのカルーセル（[data-rv] の中に track / now / total / progress / pause / prev / next を用意しておく）
  // スワイプ・前後ボタン・矢印キー・6秒ごとの自動送り（一時停止ボタン、ホバー・フォーカス・タッチ中と動きを減らす設定では停止）
  function carousel(root) {
    if (!root) return;
        const track = root.querySelector('[data-rv-track]');
    const now = root.querySelector('[data-rv-now]');
    const bar = root.querySelector('[data-rv-progress]');
    const pauseBtn = root.querySelector('[data-rv-pause]');
    const n = X.reviews.length;
    const DELAY = 6000;
    root.querySelector('[data-rv-total]').textContent = n;
    list(track, X.reviews, (r, i) => `
      <figure class="rv__slide" role="group" aria-roledescription="スライド" aria-label="${i + 1} / ${n}">
        <span class="rv__mark" aria-hidden="true">“</span>
        <p class="rv__tag">${esc(r.tag)}</p>
        <blockquote class="rv__quote">${esc(r.text)}</blockquote>
        <figcaption class="rv__cap">${esc(X.reviewsNote)}</figcaption>
      </figure>`);
    const slides = Array.from(track.children);
    let idx = 0;
    let userPaused = reduced; // 動きを減らす設定では自動再生しない
    let hold = false; // ホバー・フォーカス・タッチ中
    let visibleNow = false;
    let timer = null;

    const offset = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
    function go(i) {
      i = (i + n) % n;
      track.scrollTo({ left: offset(i), behavior: reduced ? 'auto' : 'smooth' });
      setActive(i);
    }
    function setActive(i) {
      if (i === idx && slides[i].classList.contains('is-active')) return;
      idx = i;
      now.textContent = i + 1;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      restart();
    }
    function restart() {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
      schedule();
    }
    function running() { return !userPaused && !hold && visibleNow; }
    function schedule() {
      clearTimeout(timer);
      root.classList.toggle('is-running', running());
      if (running()) timer = setTimeout(() => go(idx + 1), DELAY);
    }
    // スワイプ後は、いちばん近いスライドを「現在」にする
    let st;
    track.addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => {
        let best = 0, d = Infinity;
        slides.forEach((s, k) => { const v = Math.abs(offset(k) - track.scrollLeft); if (v < d) { d = v; best = k; } });
        setActive(best);
      }, 90);
    }, { passive: true });
    root.querySelector('[data-rv-prev]').addEventListener('click', () => go(idx - 1));
    root.querySelector('[data-rv-next]').addEventListener('click', () => go(idx + 1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });
    pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.setAttribute('aria-label', userPaused ? '自動再生を再開' : '自動再生を一時停止');
      root.classList.toggle('is-paused', userPaused);
      restart();
    });
    const holdOn = () => { hold = true; schedule(); };
    const holdOff = () => { hold = false; restart(); };
    root.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && holdOn());
    root.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && holdOff());
    root.addEventListener('focusin', holdOn);
    root.addEventListener('focusout', (e) => !root.contains(e.relatedTarget) && holdOff());
    track.addEventListener('touchstart', holdOn, { passive: true });
    track.addEventListener('touchend', () => setTimeout(holdOff, 2500), { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visibleNow = es[0].isIntersecting; schedule(); }, { threshold: 0.4 }).observe(root);
    }
    root.classList.toggle('is-paused', userPaused);
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    if (userPaused) pauseBtn.setAttribute('aria-label', '自動再生を再開');
    setActive(0);
    slides[0].classList.add('is-active');
  }

  window.XUI = { X, esc, nl, yen, bind, list, chat, carousel, reduced };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    menu();
    reveal();
    jsonLd();
    mockNav();
    const y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
