(function () {
  const sec = document.getElementById("craftfx");
  if (!sec) return;
  const g = document.createElement("div");
  g.className = "craft-glow";
  g.setAttribute("aria-hidden", "true");
  sec.insertBefore(g, sec.firstChild);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let x = 0,
    y = 0,
    vx = 0,
    vy = 0,
    tx = 0,
    ty = 0,
    run = false;

  /* resting spot: behind the heading */
  const home = () => {
    const r = sec.getBoundingClientRect();
    const t = sec.querySelector(".craft-title");
    const b = t ? t.getBoundingClientRect() : r;
    tx = r.width / 2;
    ty = b.top - r.top + b.height / 2;
  };
  const paint = () => {
    g.style.transform = "translate3d(" + x + "px," + y + "px,0)";
  };
  /* spring: pulled toward the target, then damped */
  const tick = () => {
    vx = (vx + (tx - x) * 0.06) * 0.84;
    vy = (vy + (ty - y) * 0.06) * 0.84;
    x += vx;
    y += vy;
    paint();
    const e = Math.abs(vx) + Math.abs(vy) + Math.abs(tx - x) + Math.abs(ty - y);
    if (e > 0.2) requestAnimationFrame(tick);
    else run = false;
  };
  const go = () => {
    if (!run) {
      run = true;
      requestAnimationFrame(tick);
    }
  };

  home();
  x = tx;
  y = ty;
  paint();
  if (document.fonts)
    document.fonts.ready.then(() => {
      if (!sec.classList.contains("glow-on")) {
        home();
        go();
      }
    });
  addEventListener("resize", () => {
    if (!sec.classList.contains("glow-on")) {
      home();
      go();
    }
  });

  if (reduce) return;
  sec.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      const r = sec.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      sec.classList.add("glow-on");
      go();
    },
    { passive: true },
  );
  sec.addEventListener("pointerleave", () => {
    sec.classList.remove("glow-on");
    home();
    go();
  });
})();
