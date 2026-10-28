/* A·M — particles-fx.js
   Three NEW effects (separate from particles.js, no dependencies):
     data-fx="text"           particles form a word, scatter from the cursor, then re-form (data-fx-text="WORD WORD")
     data-fx="constellation"  drifting dots joined by lines; the cursor becomes a green node
     (automatic)              cursor spark trail + click burst, desktop mouse only
   Brand colours: white #ece9e3, green #4ade80. */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  const R = (a, b) => a + Math.random() * (b - a);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const D = Math.min(devicePixelRatio || 1, 1.5);
  const INK = "#ece9e3",
    ACC = "#4ade80";
  const insts = [];

  /* shared setup: canvas behind the section's content + pointer + visibility */
  function mk(el) {
    if (getComputedStyle(el).position === "static")
      el.style.position = "relative";
    const cv = document.createElement("canvas");
    cv.className = "fx-canvas";
    cv.setAttribute("aria-hidden", "true");
    el.insertBefore(cv, el.firstChild);
    [...el.children].forEach((ch) => {
      if (ch === cv || /^(SCRIPT|STYLE|CANVAS)$/.test(ch.tagName)) return;
      const cs = getComputedStyle(ch);
      if (cs.position === "static") ch.style.position = "relative";
      if (cs.zIndex === "auto") ch.style.zIndex = "1";
    });
    const o = {
      el,
      cv,
      c: cv.getContext("2d"),
      W: 0,
      H: 0,
      vis: false,
      px: -999,
      py: -999,
      seen: false,
    };
    const fit = () => {
      o.W = el.clientWidth;
      o.H = el.clientHeight;
      cv.width = o.W * D;
      cv.height = o.H * D;
      o.c.setTransform(D, 0, 0, D, 0, 0);
      o.init && o.init();
    };
    const pos = (e) => {
      const r = el.getBoundingClientRect();
      o.px = e.clientX - r.left;
      o.py = e.clientY - r.top;
    };
    const out = () => (o.px = o.py = -999);
    el.addEventListener("pointermove", pos, { passive: true });
    el.addEventListener("pointerdown", pos, { passive: true });
    el.addEventListener("pointerleave", out);
    el.addEventListener("pointercancel", out);
    el.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "mouse") out();
    });
    new ResizeObserver(fit).observe(el);
    new IntersectionObserver(
      (e) => {
        o.vis = e[0].isIntersecting;
        if (o.vis && !o.seen) {
          o.seen = true;
          o.onfirst && o.onfirst();
        }
      },
      { rootMargin: "80px" },
    ).observe(el);
    o.fit = fit;
    insts.push(o);
    return o;
  }

  /* ───────── TEXT: particles form a word ───────── */
  function text(el) {
    const o = mk(el);
    const str = (el.dataset.fxText || "HELLO").toUpperCase();
    const rad = 95;
    o.init = () => {
      const lines = o.W < 600 ? str.split(" ") : [str];
      const off = document.createElement("canvas");
      off.width = o.W;
      off.height = o.H;
      const x = off.getContext("2d");
      const face = '"Bebas Neue", Impact, sans-serif';
      x.font = `100px ${face}`;
      const w100 = Math.max(...lines.map((l) => x.measureText(l).width)) || 1;
      const fs = Math.min(
        ((o.W * 0.86) / w100) * 100,
        (o.H * 0.7) / lines.length,
      );
      x.font = `${fs}px ${face}`;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillStyle = "#fff";
      lines.forEach((l, i) =>
        x.fillText(
          l,
          o.W / 2,
          o.H / 2 + (i - (lines.length - 1) / 2) * fs * 0.95,
        ),
      );
      const data = x.getImageData(0, 0, o.W, o.H).data;
      const g = coarse || o.W < 600 ? 4 : 5;
      o.p = [];
      for (let y = 0; y < o.H; y += g)
        for (let xx = 0; xx < o.W; xx += g)
          if (data[(y * o.W + xx) * 4 + 3] > 128) {
            const home = { hx: xx, hy: y, vx: 0, vy: 0 };
            home.x = reduce ? xx : R(0, o.W);
            home.y = reduce ? y : R(0, o.H);
            o.p.push(home);
          }
      o.idle = reduce;
      o.once = reduce;
    };
    /* when it first scrolls into view, scatter so the word assembles on screen */
    o.onfirst = () => {
      if (reduce) return;
      o.p.forEach((p) => {
        p.x = R(0, o.W);
        p.y = R(0, o.H);
      });
    };
    o.draw = () => {
      const c = o.c;
      c.clearRect(0, 0, o.W, o.H);
      for (const p of o.p) {
        let fx = (p.hx - p.x) * 0.05,
          fy = (p.hy - p.y) * 0.05;
        if (!reduce && o.px > -900) {
          const dx = p.x - o.px,
            dy = p.y - o.py,
            d = Math.hypot(dx, dy) || 1;
          if (d < rad) {
            const f = ((rad - d) / rad) * 6;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }
        p.vx = (p.vx + fx) * 0.86;
        p.vy = (p.vy + fy) * 0.86;
        p.x += p.vx;
        p.y += p.vy;
        const hot = Math.hypot(p.x - p.hx, p.y - p.hy) > 6;
        c.fillStyle = hot ? ACC : INK;
        c.globalAlpha = hot ? 1 : 0.9;
        c.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
      }
      c.globalAlpha = 1;
    };
    /* the font may load after the first measure: refit once it is ready */
    document.fonts && document.fonts.ready.then(() => o.fit());
  }

  /* ───────── CONSTELLATION: dots + lines ───────── */
  function constellation(el) {
    const o = mk(el);
    const L = 120,
      LP = 170;
    o.init = () => {
      const n = Math.round(Math.min(90, Math.max(25, (o.W * o.H) / 14000)));
      const v = reduce ? 0 : 0.25;
      o.p = Array.from({ length: n }, () => ({
        x: R(0, o.W),
        y: R(0, o.H),
        vx: R(-v, v),
        vy: R(-v, v),
      }));
      o.drawn = false;
    };
    o.draw = () => {
      if (reduce && o.drawn) return;
      const c = o.c,
        P = o.p;
      c.clearRect(0, 0, o.W, o.H);
      for (const p of P) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > o.W) p.vx *= -1;
        if (p.y < 0 || p.y > o.H) p.vy *= -1;
      }
      c.lineWidth = 1;
      c.strokeStyle = INK;
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j],
            d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < L) {
            c.globalAlpha = (1 - d / L) * 0.22;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
          }
        }
      }
      c.fillStyle = INK;
      c.globalAlpha = 0.55;
      for (const p of P) c.fillRect(p.x - 1.3, p.y - 1.3, 2.6, 2.6);
      if (o.px > -900) {
        c.strokeStyle = ACC;
        for (const p of P) {
          const d = Math.hypot(p.x - o.px, p.y - o.py);
          if (d < LP) {
            c.globalAlpha = (1 - d / LP) * 0.65;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(o.px, o.py);
            c.stroke();
            p.x += (o.px - p.x) * 0.004;
            p.y += (o.py - p.y) * 0.004;
          }
        }
        c.fillStyle = ACC;
        c.globalAlpha = 1;
        c.fillRect(o.px - 2, o.py - 2, 4, 4);
      }
      c.globalAlpha = 1;
      o.drawn = true;
    };
  }

  /* ───────── CURSOR SPARKS + CLICK BURST (whole page) ───────── */
  function trail() {
    if (reduce || !fine) return;
    const cv = document.createElement("canvas");
    cv.className = "fx-trail";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    const c = cv.getContext("2d");
    let W = 0,
      H = 0,
      run = false,
      lx = 0,
      ly = 0;
    const fit = () => {
      W = innerWidth;
      H = innerHeight;
      cv.width = W * D;
      cv.height = H * D;
      c.setTransform(D, 0, 0, D, 0, 0);
    };
    fit();
    addEventListener("resize", fit);
    const P = [];
    const tick = () => {
      c.clearRect(0, 0, W, H);
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + 0.015;
        p.l -= p.dec;
        if (p.l <= 0) {
          P.splice(i, 1);
          continue;
        }
        c.globalAlpha = p.l;
        c.fillStyle = p.acc ? ACC : INK;
        c.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      c.globalAlpha = 1;
      if (P.length) requestAnimationFrame(tick);
      else {
        run = false;
        c.clearRect(0, 0, W, H);
      }
    };
    const emit = (x, y, n, spd) => {
      for (let i = 0; i < n; i++) {
        const a = R(0, TAU),
          s = R(0.3, spd);
        P.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          l: 1,
          dec: R(0.015, 0.03),
          acc: Math.random() < 0.35,
          r: R(0.9, 2.2),
        });
      }
      if (P.length > 400) P.splice(0, P.length - 400);
      if (!run) {
        run = true;
        requestAnimationFrame(tick);
      }
    };
    addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "mouse") return;
        const d = Math.hypot(e.clientX - lx, e.clientY - ly);
        lx = e.clientX;
        ly = e.clientY;
        if (d > 2) emit(lx, ly, 2, 1.2);
      },
      { passive: true },
    );
    addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") emit(e.clientX, e.clientY, 26, 5);
    });
  }

  const M = { text, constellation };
  const boot = () => {
    document.querySelectorAll("[data-fx]").forEach((el) => {
      const f = M[el.dataset.fx];
      f && f(el);
    });
  };
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", boot)
    : boot();

  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    for (const o of insts) if (o.vis && o.W && o.draw) o.draw();
  })();
})();
