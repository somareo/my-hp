(function () {
  const { X, esc, nl, yen, list, reduced } = window.XUI;
  const $ = (s) => document.querySelector(s);
  const body = document.body;

  /* ---------- 共通データの描画 ---------- */
  list($('[data-owner-body]'), X.owner.body, (p) => `<p>${nl(p)}</p>`);
  list($('[data-features]'), X.features, (f) => `
    <article class="feature glass" data-reveal>
      <p class="feature__no">${esc(f.no)}</p>
      <p class="feature__en">${esc(f.en)}</p>
      <h3 class="feature__title">${esc(f.title)}</h3>
      <p class="feature__body">${esc(f.body)}</p>
    </article>`);
  list($('[data-price]'), X.price.items, (p) => `
    <div class="price__row"><dt>${esc(p.label)}<span>${esc(p.en)}</span></dt><dd>${yen(p.price)}<small>円</small></dd></div>`);
  list($('[data-reviews]'), X.reviews, (r) => `
    <figure class="review glass" data-reveal>
      <p class="review__tag">${esc(r.tag)}</p>
      <blockquote class="review__text">${esc(r.text)}</blockquote>
      <figcaption class="review__cap">${esc(X.reviewsNote)}</figcaption>
    </figure>`);
  list($('[data-flow]'), X.flow, (f) => `
    <li class="flow__item glass" data-reveal>
      <p class="flow__no">STEP ${esc(f.no)}</p>
      <h3 class="flow__title">${esc(f.title)}</h3>
      <p class="flow__body">${esc(f.body)}</p>
    </li>`);
  window.XUI.chat($('[data-faq]'));

  /* ---------- 3D オブジェクト ---------- */
  const hero = $('#hero');
  const canvas = $('.hero__canvas');
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 || window.matchMedia('(max-width: 767px)').matches;
  // 毛の根元の方向（球の左上・手前側）
  const D = { x: -0.42, y: 0.34, z: 0.84 };
  { const l = Math.hypot(D.x, D.y, D.z); D.x /= l; D.y /= l; D.z /= l; }

  const fx = { pull: 0, ripple: -1, time: 0 }; // 3Dへ渡す状態
  const motion = reduced ? 0.3 : 1;
  const radiusAt = (x, y, z, t) =>
    1 + motion * (0.035 * Math.sin(3 * x + t * 0.9) * Math.sin(2.6 * y + t * 0.7) +
      0.022 * Math.sin(4.2 * z + t * 1.1) + 0.012 * Math.sin(t * 0.8));

  let orb = null;
  try {
    if (window.THREE) orb = createOrb();
  } catch (e) {
    orb = null;
  }
  if (!orb) document.documentElement.classList.add('no-webgl');

  function createOrb() {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
    renderer.outputEncoding = T.sRGBEncoding;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    const group = new T.Group();
    scene.add(group);

    const seg = lowPower ? 72 : 112;
    const geo = new T.SphereGeometry(1, seg, Math.round(seg * 0.75));
    const pos = geo.attributes.position;
    const base = Float32Array.from(pos.array);
    const mat = new T.MeshPhysicalMaterial({
      color: 0xf6f3fc, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.16,
      emissive: 0xb9a8f0, emissiveIntensity: 0
    });
    const mesh = new T.Mesh(geo, mat);
    group.add(mesh);

    // 輪郭の柔らかな光
    const halo = new T.Mesh(
      new T.SphereGeometry(1.24, 64, 48),
      new T.ShaderMaterial({
        transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
        uniforms: { uColor: { value: new T.Color(0xc8bcf2) }, uPower: { value: 1 } },
        vertexShader:
          'varying vec3 vN; varying vec3 vV;' +
          'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);' +
          'vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader:
          'uniform vec3 uColor; uniform float uPower; varying vec3 vN; varying vec3 vV;' +
          'void main(){ float f = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(uColor, f * 0.5 * uPower); }'
      })
    );
    group.add(halo);

    // ガラスのリングと小さなパール
    const ringMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const ring1 = new T.Mesh(new T.TorusGeometry(1.55, 0.006, 12, 240), ringMat);
    const ring2 = new T.Mesh(new T.TorusGeometry(1.85, 0.004, 12, 240), new T.MeshBasicMaterial({ color: 0xb9a8f0, transparent: true, opacity: 0.45 }));
    ring1.rotation.set(1.15, 0.35, 0);
    ring2.rotation.set(1.35, -0.5, 0.3);
    group.add(ring1, ring2);
    const pearls = [0.07, 0.05, 0.09].map((r, i) => {
      const m = new T.Mesh(new T.SphereGeometry(r, 32, 24), mat);
      m.userData = { a: i * 2.1, speed: 0.18 + i * 0.05, rad: 1.55 + i * 0.15, tilt: 0.4 - i * 0.3 };
      group.add(m);
      return m;
    });

    scene.add(new T.AmbientLight(0xffffff, 0.5));
    scene.add(new T.HemisphereLight(0xffffff, 0xd9d2f2, 0.5));
    const key = new T.DirectionalLight(0xffffff, 0.95);
    key.position.set(2, 3, 4);
    scene.add(key);
    const lav = new T.PointLight(0xb9a8f0, 1.3);
    lav.position.set(-3, -1.5, 2.5);
    const sky = new T.PointLight(0xa9d4f5, 1.0);
    sky.position.set(3, -2, 1.5);
    const flash = new T.PointLight(0xd2c6ff, 0, 3.5);
    scene.add(lav, sky, flash);

    const v = new T.Vector3();
    let w = 1, h = 1;

    function layout() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const halfH = Math.tan(T.MathUtils.degToRad(16)) * 7;
      const halfW = halfH * camera.aspect;
      if (w >= 768) {
        group.position.set(halfW * 0.42, -0.05, 0);
        group.scale.setScalar(Math.min(1.25, halfH * 0.62));
      } else {
        group.position.set(0, halfH * 0.45, 0);
        group.scale.setScalar(Math.min(halfW * 0.6, halfH * 0.42));
      }
    }

    function deform(t) {
      const a = pos.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2];
        let r = radiusAt(x, y, z, t);
        const dd = x * D.x + y * D.y + z * D.z;
        // 毛を引くと根元の肌がわずかに持ち上がる
        if (fx.pull > 0.001) r += Math.exp((dd - 1) * 30) * fx.pull * 0.16;
        // 抜けた瞬間の光の波紋
        if (fx.ripple >= 0) {
          const ang = Math.acos(Math.max(-1, Math.min(1, dd)));
          const front = fx.ripple * 2.2;
          if (ang < front) r += Math.sin((ang - front) * 10) * 0.03 * Math.exp(-fx.ripple * 1.1) * (1 - ang / Math.PI);
        }
        a[i] = x * r;
        a[i + 1] = y * r;
        a[i + 2] = z * r;
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }

    // 毛の根元（球の表面）を画面座標へ
    function root() {
      const r = radiusAt(D.x, D.y, D.z, fx.time) + fx.pull * 0.16;
      v.set(D.x * r, D.y * r, D.z * r);
      mesh.localToWorld(v);
      flash.position.copy(v);
      v.project(camera);
      const p = { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
      v.set(D.x * (r + 0.3), D.y * (r + 0.3), D.z * (r + 0.3));
      mesh.localToWorld(v);
      v.project(camera);
      const q = { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
      const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      return { x: p.x, y: p.y, nx: (q.x - p.x) / l, ny: (q.y - p.y) / l };
    }

    function render(t) {
      deform(t);
      ring1.rotation.z = t * 0.05 * motion;
      ring2.rotation.z = -t * 0.035 * motion;
      pearls.forEach((m) => {
        const d = m.userData, a = d.a + t * d.speed * motion;
        m.position.set(Math.cos(a) * d.rad, Math.sin(a) * d.rad * d.tilt, Math.sin(a) * d.rad * 0.6);
      });
      renderer.render(scene, camera);
    }

    layout();
    return { layout, render, root, mat, flash, halo };
  }

  // WebGLが使えない場合のフォールバック
  function fallbackRoot() {
    const el = $('.hero__fallback');
    const hr = hero.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const R = r.width / 2;
    return { x: r.left - hr.left + R + R * D.x, y: r.top - hr.top + R - R * D.y, nx: D.x / Math.hypot(D.x, D.y), ny: -D.y / Math.hypot(D.x, D.y) };
  }

  /* ---------- ONE HAIR ---------- */
  const hairPath = $('.hair__path');
  const loose = $('.hair__loose');
  const ripples = $('.hair__ripples');
  const hit = $('.hair__hit');
  const NS = 'http://www.w3.org/2000/svg';

  const H = {
    state: 'idle', // idle | drag | auto | plucked
    grow: 1, tip: null, vel: { x: 0, y: 0 },
    ptr: null, hover: null, tension: 0, R: null, keyboard: false
  };
  const restLen = () => (window.innerWidth < 768 ? 20 : 26);
  const pullLen = () => (window.innerWidth < 768 ? 95 : 125);

  function local(e) {
    const r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') H.hover = local(e);
  });
  hero.addEventListener('pointerleave', () => (H.hover = null));

  hit.addEventListener('pointerdown', (e) => {
    if (H.state !== 'idle') return;
    e.preventDefault();
    hit.setPointerCapture(e.pointerId);
    H.state = 'drag';
    H.ptr = local(e);
    H.keyboard = false;
    body.classList.add('is-dragging');
  });
  hit.addEventListener('pointermove', (e) => {
    if (H.state === 'drag') H.ptr = local(e);
  });
  const endDrag = () => {
    if (H.state === 'drag') H.state = 'idle'; // 離すとバネのように戻る
    body.classList.remove('is-dragging');
  };
  hit.addEventListener('pointerup', endDrag);
  hit.addEventListener('pointercancel', endDrag);
  hit.addEventListener('click', (e) => e.preventDefault()); // クリックだけでは抜けない

  // キーボード操作の代替：Enter / Space で自動的に引き抜く
  hit.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && H.state === 'idle') {
      e.preventDefault();
      H.keyboard = true;
      H.state = 'auto';
      const R = H.R, from = { ...H.tip };
      const to = { x: R.x + R.nx * (restLen() + pullLen() * 1.2) - R.ny * 12, y: R.y + R.ny * (restLen() + pullLen() * 1.2) + R.nx * 12 };
      const k = { v: 0 };
      gsap.to(k, {
        v: 1, duration: reduced ? 0.6 : 1.4, ease: 'power1.in',
        onUpdate: () => (H.ptr = { x: from.x + (to.x - from.x) * k.v, y: from.y + (to.y - from.y) * k.v })
      });
    }
  });

  function hairFrame(t) {
    const R = orb ? orb.root() : fallbackRoot();
    H.R = R;
    const L = restLen() * H.grow;
    const n = { x: R.nx, y: R.ny }, p = { x: -R.ny, y: R.nx };
    if (!H.tip) H.tip = { x: R.x + n.x * L, y: R.y + n.y * L };

    if (H.state === 'drag' || H.state === 'auto') {
      H.tip = { ...H.ptr };
    } else if (H.state === 'idle') {
      const sway = reduced ? 0 : Math.sin(t * 1.3) * 0.8 + Math.sin(t * 2.7) * 0.3;
      let tx = R.x + n.x * L * 0.92 + p.x * (L * 0.28 + sway);
      let ty = R.y + n.y * L * 0.92 + p.y * (L * 0.28 + sway);
      // カーソルが近づくと、ほんの少し持ち上がる
      if (H.hover) {
        const d = Math.hypot(H.hover.x - tx, H.hover.y - ty);
        if (d < 80) {
          const k = 1 - d / 80;
          tx += n.x * k * 5 + ((H.hover.x - tx) / (d || 1)) * k * 2.5;
          ty += n.y * k * 5 + ((H.hover.y - ty) / (d || 1)) * k * 2.5;
        }
      }
      H.vel.x = (H.vel.x + (tx - H.tip.x) * 0.14) * 0.74;
      H.vel.y = (H.vel.y + (ty - H.tip.y) * 0.14) * 0.74;
      H.tip.x += H.vel.x;
      H.tip.y += H.vel.y;
    }

    if (H.state === 'plucked') return;

    const dx = H.tip.x - R.x, dy = H.tip.y - R.y;
    const dist = Math.hypot(dx, dy);
    const stretch = Math.max(0, dist - restLen());
    H.tension = Math.min(1, stretch / pullLen());
    fx.pull += ((H.state === 'drag' || H.state === 'auto' ? H.tension : 0) - fx.pull) * 0.25;

    // 根元は表面の向きに固定。張るほどまっすぐに
    const reach = Math.min(dist * 0.5, L * 0.8 + stretch * 0.15);
    const bx = R.x + n.x * reach, by = R.y + n.y * reach;
    const cx = bx + ((R.x + H.tip.x) / 2 - bx) * H.tension * 0.85;
    const cy = by + ((R.y + H.tip.y) / 2 - by) * H.tension * 0.85;
    hairPath.setAttribute('d', `M${R.x.toFixed(1)} ${R.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${H.tip.x.toFixed(1)} ${H.tip.y.toFixed(1)}`);
    hairPath.style.strokeWidth = Math.max(0.7, 1.1 - H.tension * 0.4);
    hairPath.style.opacity = H.grow * (H.hover || H.state !== 'idle' ? 0.85 : 0.7);

    const hx = R.x + (H.tip.x - R.x) * 0.7, hy = R.y + (H.tip.y - R.y) * 0.7;
    hit.style.transform = `translate(${hx}px, ${hy}px)`;

    if ((H.state === 'drag' || H.state === 'auto') && H.tension >= 1) pluck();
  }

  /* ---------- 抜けた瞬間 ---------- */
  const sparks = $('.sparks');
  const secret = $('.secret');
  const card = $('.secret__card');
  const closeBtn = $('.secret__btn');
  let rippleStart = 0;

  function pluck() {
    H.state = 'plucked';
    body.classList.remove('is-dragging');
    gsap.killTweensOf(H);
    const R = H.R, tip = H.tip;
    const dir = { x: (tip.x - R.x) / (Math.hypot(tip.x - R.x, tip.y - R.y) || 1), y: (tip.y - R.y) / (Math.hypot(tip.x - R.x, tip.y - R.y) || 1) };

    // 抜けた毛はふわりと離れて消える
    loose.setAttribute('d', hairPath.getAttribute('d'));
    loose.style.strokeWidth = hairPath.style.strokeWidth;
    hairPath.setAttribute('d', '');
    gsap.fromTo(loose, { opacity: 0.85, x: 0, y: 0, rotation: 0, svgOrigin: `${tip.x} ${tip.y}` },
      { x: dir.x * 50, y: dir.y * 50 - 50, rotation: dir.x > 0 ? 35 : -35, opacity: 0, duration: 1.6, ease: 'power2.out' });

    // 根元から光の波紋
    for (let i = 0; i < 3; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', R.x);
      c.setAttribute('cy', R.y);
      ripples.appendChild(c);
      gsap.fromTo(c, { attr: { r: 2 }, opacity: 0.9, strokeWidth: 1.6 },
        { attr: { r: 150 + i * 40 }, opacity: 0, strokeWidth: 0.2, duration: 1.8, delay: i * 0.18, ease: 'power2.out', onComplete: () => c.remove() });
    }

    // 3Dへ光を伝える
    fx.pull = 0;
    rippleStart = performance.now();
    fx.ripple = 0;
    if (orb) {
      gsap.fromTo(orb.flash, { intensity: 0 }, { intensity: 3, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' });
      gsap.to(orb.mat, { emissiveIntensity: 0.16, duration: 1.4 });
      gsap.to(orb.halo.material.uniforms.uPower, { value: 2.2, duration: 1.4 });
    }
    body.classList.add('is-unlocked');

    gsap.delayedCall(reduced ? 0.4 : 0.8, () => gather(R));
  }

  // 光の粒子が集まり、カードになる
  function gather(R) {
    const hr = hero.getBoundingClientRect();
    const sx0 = hr.left + R.x, sy0 = hr.top + R.y;
    const W = window.innerWidth, Hh = window.innerHeight;
    if (reduced) return showCard();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sparks.width = W * dpr;
    sparks.height = Hh * dpr;
    const ctx = sparks.getContext('2d');
    ctx.scale(dpr, dpr);
    const cw = Math.min(440, W - 40) / 2, ch = 200;
    const N = lowPower ? 55 : 95;
    const ps = Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2, d = Math.random() * 180;
      const s = { x: sx0 + Math.cos(a) * d, y: sy0 + Math.sin(a) * d };
      const e = { x: W / 2 + (Math.random() * 2 - 1) * cw * 0.9, y: Hh / 2 + (Math.random() * 2 - 1) * ch };
      const m = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      const sw = (Math.random() * 2 - 1) * 160;
      const len = Math.hypot(e.x - s.x, e.y - s.y) || 1;
      return { s, e, c: { x: m.x - ((e.y - s.y) / len) * sw, y: m.y + ((e.x - s.x) / len) * sw }, delay: Math.random() * 0.35, size: 1 + Math.random() * 2.2, hue: Math.random() < 0.5 };
    });
    const t0 = performance.now();
    const dur = 1500;
    let shown = false;
    (function frame(now) {
      const t = (now - t0) / dur;
      ctx.clearRect(0, 0, W, Hh);
      const fade = t > 1 ? Math.max(0, 1 - (t - 1) * 2.2) : 1;
      ps.forEach((p) => {
        const k = Math.min(1, Math.max(0, (t - p.delay) / (1 - p.delay)));
        const e = 1 - Math.pow(1 - k, 3);
        const x = (1 - e) * (1 - e) * p.s.x + 2 * (1 - e) * e * p.c.x + e * e * p.e.x;
        const y = (1 - e) * (1 - e) * p.s.y + 2 * (1 - e) * e * p.c.y + e * e * p.e.y;
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
        g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
        g.addColorStop(0.3, p.hue ? `rgba(196,182,245,${0.7 * fade})` : `rgba(200,226,250,${0.7 * fade})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!shown && t > 0.82) {
        shown = true;
        showCard();
      }
      if (fade > 0) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, Hh);
    })(t0);
  }

  function showCard() {
    secret.hidden = false;
    gsap.fromTo(card, { opacity: 0, scale: 0.92, y: 24, filter: 'blur(14px)' },
      { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: reduced ? 0.3 : 1.2, ease: 'expo.out' });
    closeBtn.focus({ preventScroll: true });
  }

  function closeSecret() {
    if (secret.hidden) return;
    gsap.to(card, {
      opacity: 0, scale: 0.96, y: 10, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        secret.hidden = true;
        reset();
      }
    });
  }

  // 初期状態へ戻す（何度でも体験できる）
  function reset() {
    body.classList.remove('is-unlocked');
    if (orb) {
      gsap.to(orb.mat, { emissiveIntensity: 0, duration: 1.4 });
      gsap.to(orb.halo.material.uniforms.uPower, { value: 1, duration: 1.4 });
    }
    gsap.set(loose, { opacity: 0 });
    H.tip = null;
    H.vel = { x: 0, y: 0 };
    H.grow = 0;
    H.state = 'idle';
    gsap.to(H, { grow: 1, duration: reduced ? 0.3 : 1.8, ease: 'power2.out' });
    if (H.keyboard) hit.focus({ preventScroll: true });
  }

  closeBtn.addEventListener('click', closeSecret);
  secret.addEventListener('click', (e) => e.target === secret && closeSecret());
  document.addEventListener('keydown', (e) => {
    if (secret.hidden) return;
    if (e.key === 'Escape') closeSecret();
    if (e.key === 'Tab') {
      e.preventDefault();
      closeBtn.focus();
    }
  });

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
    fx.time = t;
    if (fx.ripple >= 0) {
      fx.ripple = (now - rippleStart) / 1000;
      if (fx.ripple > 4) fx.ripple = -1;
    }
    if (orb) orb.render(t);
    hairFrame(t);
  }
  requestAnimationFrame(loop);

  if (orb) {
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(orb.layout, 120);
    });
  }
})();
