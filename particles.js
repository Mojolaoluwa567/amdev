/* A·M — particles.js
   Three effects, no dependencies. Add data attributes, include this file once.
     data-pfx="spring"   dot grid that pushes away from cursor / finger and springs back
     data-pfx="terrain"  particles fall and pile on real page elements (data-pfx-obstacles="css selector")
     data-pfx="morph"    particle cloud that morphs between shapes (data-pfx-labels="A|B|C|D")
   Optional: data-pfx-ink, data-pfx-acc (colours), data-pfx-alpha (spring base opacity). */
(() => {
  "use strict";
  const TAU = Math.PI * 2,
    R = (a, b) => a + Math.random() * (b - a),
    cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const D = Math.min(devicePixelRatio || 1, 1.5);
  const INK = "#ece9e3", ACC = "#4ade80"; /* brand white + brand green */
  const insts = [];
  let sdy = 0, lastY = scrollY;

  function lift(el, cv) { /* keep page content above background canvases */
    [...el.children].forEach((ch) => {
      if (ch === cv || /^(SCRIPT|STYLE|CANVAS|IMG|VIDEO|PICTURE)$/.test(ch.tagName)) return;
      const cs = getComputedStyle(ch);
      if (cs.position === "static") ch.style.position = "relative";
      if (cs.zIndex === "auto") ch.style.zIndex = "1";
    });
  }

  function base(el, mode) {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const cv = document.createElement("canvas");
    cv.className = "pfx-canvas " + mode;
    cv.setAttribute("aria-hidden", "true");
    if (mode === "over") el.appendChild(cv);
    else { el.insertBefore(cv, el.firstChild); lift(el, cv); }
    const o = { el, cv, c: cv.getContext("2d"), W: 0, H: 0, vis: false, px: -999, py: -999, idle: false,
      ink: el.dataset.pfxInk || INK, acc: el.dataset.pfxAcc || ACC };
    const fit = () => {
      o.W = el.clientWidth; o.H = el.clientHeight;
      cv.width = o.W * D; cv.height = o.H * D;
      o.c.setTransform(D, 0, 0, D, 0, 0);
      o.idle = false; o.init && o.init();
    };
    const pos = (e) => { const r = el.getBoundingClientRect(); o.px = e.clientX - r.left; o.py = e.clientY - r.top; o.idle = false; o.moved && o.moved(e); };
    const out = () => { o.px = o.py = -999; o.idle = false; o.left && o.left(); };
    el.addEventListener("pointermove", pos, { passive: true });
    el.addEventListener("pointerdown", pos, { passive: true });
    el.addEventListener("pointerleave", out);
    el.addEventListener("pointercancel", out);
    el.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") out(); });
    new ResizeObserver(fit).observe(el);
    new IntersectionObserver((e) => (o.vis = e[0].isIntersecting), { rootMargin: "80px" }).observe(el);
    o.fit = fit; insts.push(o);
    return o;
  }

  /* ───────── SPRING GRID ───────── */
  function spring(el) {
    const o = base(el, "under"), alpha = +el.dataset.pfxAlpha || 0.22;
    o.init = () => {
      const g = coarse || o.W < 600 ? 22 : 18; o.p = [];
      for (let x = g / 2; x < o.W; x += g) for (let y = g / 2; y < o.H; y += g) o.p.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
    };
    o.draw = () => {
      if (o.idle) return;
      const c = o.c, rad = 95; let energy = 0;
      c.clearRect(0, 0, o.W, o.H);
      for (const p of o.p) {
        let fx = (p.hx - p.x) * 0.06, fy = (p.hy - p.y) * 0.06;
        if (o.px > -900) {
          const dx = p.x - o.px, dy = p.y - o.py, d = Math.hypot(dx, dy) || 1;
          if (d < rad) { const f = ((rad - d) / rad) * 4.2; fx += (dx / d) * f; fy += (dy / d) * f; }
        }
        p.vx = (p.vx + fx) * 0.9; p.vy = (p.vy + fy) * 0.9; p.x += p.vx; p.y += p.vy;
        const m = Math.hypot(p.x - p.hx, p.y - p.hy), hot = m > 3, s = 1 + Math.min(m, 12) * 0.08;
        energy += m + Math.abs(p.vx) + Math.abs(p.vy);
        c.globalAlpha = hot ? Math.min(1, alpha + 0.55) : alpha;
        c.fillStyle = hot ? o.acc : o.ink;
        c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      }
      c.globalAlpha = 1;
      if (o.px < -900 && energy < 0.5) o.idle = true; /* settled: stop redrawing until touched */
    };
  }

  /* ───────── PAGE TERRAIN ───────── */
  function terrain(el) {
    if (reduce) return;
    const o = base(el, "over"), sel = el.dataset.pfxObstacles || ".pfx-solid";
    o.rects = []; o.tilt = 0; o.tgt = 0; o.jolt = 0; o.f = 0;
    o.moved = () => { o.tgt = cl((o.px / o.W - 0.5) * 2.4, -1.2, 1.2); };
    o.left = () => { o.tgt = 0; };
    o.scan = () => {
      const b = el.getBoundingClientRect();
      o.rects = [...el.querySelectorAll(sel)].filter((n) => { const cs = getComputedStyle(n); return +cs.opacity > 0.3 && cs.visibility !== "hidden"; })
        .map((n) => { const r = n.getBoundingClientRect(); return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height }; })
        .filter((r) => r.w > 8 && r.h > 6);
    };
    o.init = () => {
      const n = Math.round(cl((o.W * o.H) / 2600, 120, coarse ? 300 : 520));
      o.p = Array.from({ length: n }, () => ({ x: R(0, o.W), y: R(-o.H * 0.7, 0), vx: 0, vy: 0 }));
      o.scan();
    };
    o.draw = () => {
      if (++o.f % 20 === 0) o.scan();
      const P = o.p, rr = 2.2, c = o.c;
      o.tilt += (o.tgt - o.tilt) * 0.08;
      o.jolt = o.jolt * 0.8 + cl(-sdy * 0.03, -1.5, 1.5) * 0.2;
      const gx = Math.sin(o.tilt) * 0.2, gy = Math.cos(o.tilt) * 0.2;
      for (const p of P) {
        p.vx = (p.vx + gx) * 0.995; p.vy = (p.vy + gy + o.jolt * R(0.1, 1)) * 0.995;
        p.x += p.vx; p.y += p.vy;
        for (const r of o.rects) {
          if (p.x > r.x - rr && p.x < r.x + r.w + rr && p.y > r.y - rr && p.y < r.y + r.h + rr) {
            const a = p.x - (r.x - rr), b = r.x + r.w + rr - p.x, u = p.y - (r.y - rr), d = r.y + r.h + rr - p.y, m = Math.min(a, b, u, d);
            if (m === u) { p.y = r.y - rr; p.vy *= -0.15; p.vx *= 0.96; }
            else if (m === d) { p.y = r.y + r.h + rr; p.vy = Math.abs(p.vy) * 0.1; }
            else if (m === a) { p.x = r.x - rr; p.vx *= -0.15; }
            else { p.x = r.x + r.w + rr; p.vx *= -0.15; }
          }
        }
        if (p.y > o.H + 10 || p.x < -10 || p.x > o.W + 10) { p.x = R(0, o.W); p.y = -R(6, 60); p.vx = p.vy = 0; }
      }
      const G = new Map(), cs = 5, key = (x, y) => (Math.floor(x / cs) + 60) * 8192 + Math.floor(y / cs) + 800;
      P.forEach((p, i) => { const k = key(p.x, p.y); (G.get(k) || G.set(k, []).get(k)).push(i); });
      P.forEach((p, i) => {
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          const l = G.get(key(p.x + a * cs, p.y + b * cs)); if (!l) continue;
          for (const j of l) {
            if (j <= i) continue;
            const q = P[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 0.01;
            if (d < rr * 2) { const k = (rr * 2 - d) / 2 / d; p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k; }
          }
        }
      });
      c.clearRect(0, 0, o.W, o.H);
      for (const p of P) { c.fillStyle = Math.hypot(p.vx, p.vy) > 2.2 ? o.acc : o.ink; c.globalAlpha = 0.9; c.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2); }
      c.globalAlpha = 1;
    };
  }

  /* ───────── MORPH ───────── */
  function morph(el) {
    const o = base(el, "under");
    o.cv.style.pointerEvents = "auto"; o.cv.style.touchAction = "pan-y"; o.cv.style.cursor = "pointer";
    const labels = (el.dataset.pfxLabels || "").split("|"), lab = el.querySelector("[data-pfx-label]");
    let down = null, drag = 0;
    const setL = () => { if (lab && labels[o.i]) { lab.textContent = labels[o.i]; lab.classList.remove("swap"); void lab.offsetWidth; lab.classList.add("swap"); } };
    const next = () => { o.i = (o.i + 1) % 4; o.last = performance.now(); setL(); };
    o.init = () => {
      const N = coarse || o.W < 700 ? 1300 : 1800, sh = [[], [], [], []];
      for (let i = 0; i < N; i++) {
        const y = 1 - (2 * i) / (N - 1), r = Math.sqrt(1 - y * y), a = i * 2.399963;
        sh[0].push([Math.cos(a) * r, y, Math.sin(a) * r]);
        const u = i * 2.399963, v = ((i / N) * TAU) * 17;
        sh[1].push([(1 + 0.4 * Math.cos(v)) * Math.cos(u) * 0.7, 0.4 * Math.sin(v) * 0.84, (1 + 0.4 * Math.cos(v)) * Math.sin(u) * 0.7]);
        const q = [R(-0.75, 0.75), R(-0.75, 0.75), R(-0.75, 0.75)]; q[i % 3] = (Math.floor(i / 3) % 2 ? 1 : -1) * 0.75; sh[2].push(q);
        const h = (i / N) * TAU * 5; sh[3].push([Math.cos(h) * 0.6, (i / N) * 2 - 1, Math.sin(h) * 0.6]);
      }
      o.sh = sh; o.p = sh[0].map((q) => q.slice()); o.i = 0; o.last = performance.now(); setL();
    };
    o.cv.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, d: 0 }; });
    o.cv.addEventListener("pointermove", (e) => { if (down && e.pointerType !== "mouse") { drag += (e.clientX - down.x) * 0.01; down.d += Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down.x = e.clientX; down.y = e.clientY; } });
    o.cv.addEventListener("pointerup", () => { if (down && down.d < 8) next(); down = null; });
    o.cv.addEventListener("pointercancel", () => { down = null; });
    o.draw = () => {
      const now = performance.now(), c = o.c, hov = o.px > -900;
      if (!reduce && now - o.last > 3500) next();
      const T = o.sh[o.i], t = reduce ? 0 : now,
        a = t * 4e-4 + drag + (hov ? (o.px / o.W - 0.5) * 3 : 0), b = hov ? (o.py / o.H - 0.5) : 0,
        ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b),
        k = Math.min(o.W, o.H) * 0.34, cx = o.W * (o.W > 900 ? 0.64 : 0.5), cy = o.H * 0.46;
      c.clearRect(0, 0, o.W, o.H);
      for (let i = 0; i < o.p.length; i++) {
        const p = o.p[i], q = T[i];
        for (let j = 0; j < 3; j++) p[j] += (q[j] - p[j]) * 0.06;
        const x = p[0] * ca - p[2] * sa, z0 = p[0] * sa + p[2] * ca, y = p[1] * cb - z0 * sb, z = p[1] * sb + z0 * cb, s = 1 / (1 + z * 0.25);
        c.fillStyle = i % 40 === 0 ? o.acc : o.ink; c.globalAlpha = 0.35 + (0.65 * s) / 1.3;
        const r = 0.9 * s + 0.3; c.fillRect(cx + x * k * s - r, cy + y * k * s - r, r * 2, r * 2);
      }
      c.globalAlpha = 1;
    };
  }

  const M = { spring, terrain, morph };
  const boot = () => document.querySelectorAll("[data-pfx]").forEach((el) => { const f = M[el.dataset.pfx]; f && f(el); });
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();

  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const y = scrollY; sdy = y - lastY; lastY = y;
    for (const o of insts) if (o.vis && o.W && o.draw) o.draw();
  })();
})();
