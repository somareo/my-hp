(function () {
  const { X, esc, nl, yen, list, reduced } = window.XUI;
  const $ = (s) => document.querySelector(s);

  list($('[data-owner-body]'), X.owner.body, (p) => `<p data-reveal>${nl(p)}</p>`);

  list($('[data-features]'), X.features, (f) => `
    <article class="feature" data-reveal>
      <p class="feature__no">${esc(f.no)}</p>
      <p class="feature__en">${esc(f.en)}</p>
      <h3 class="feature__title">${esc(f.title)}</h3>
      <p class="feature__body">${esc(f.body)}</p>
    </article>`);

  list($('[data-price]'), X.price.items, (p) => `
    <div class="price__row">
      <dt>${esc(p.label)}<span>${esc(p.en)}</span></dt>
      <dd>${yen(p.price)}<small>円</small></dd>
    </div>`);

  list($('[data-reviews]'), X.reviews, (r) => `
    <figure class="review">
      <p class="review__tag">${esc(r.tag)}</p>
      <blockquote class="review__text">${esc(r.text)}</blockquote>
      <figcaption class="review__cap">${esc(X.reviewsNote)}</figcaption>
    </figure>`);

  list($('[data-flow]'), X.flow, (f) => `
    <li class="flow__item" data-reveal>
      <p class="flow__no">STEP ${esc(f.no)}</p>
      <h3 class="flow__title">${esc(f.title)}</h3>
      <p class="flow__body">${esc(f.body)}</p>
    </li>`);

  window.XUI.chat($('[data-faq]'));

  // 口コミカルーセル：横スクロール＋ボタン
  const track = $('[data-reviews]');
  const step = () => (track.firstElementChild ? track.firstElementChild.offsetWidth + 24 : 300);
  $('[data-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('[data-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  // ヘッダーの背景（スクロール後）＋柔らかなパララックス
  const header = $('.header');
  const para = document.querySelectorAll('[data-parallax]');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (!reduced) para.forEach((el) => (el.style.transform = `translate3d(0, ${y * el.dataset.parallax}px, 0)`));
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();
})();
