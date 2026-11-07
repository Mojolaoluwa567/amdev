/*
  code-to-live.js v4 — A·M portfolio  (one file, every page)

  As each block scrolls up from the bottom of the screen, a selection box sits on
  it, its real HTML types out inside, then a green scan line wipes the code away
  and the real block is underneath. Scrolling back up reverses it.

  The script detects which page it is on and builds that page's blocks.
  Add to each page, AFTER that page's other scripts:
    <script src="code-to-live.js" defer></script>
*/
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // `find` = an element only that page has. `targets` = the blocks to build.
  const PAGES = [
    {
      // about.html
      find: "#craftfx",
      targets: [
        ".intro-headline",
        ".intro-body",
        ".intro-locations",
        ".approach-label",
        ".approach-image",
        ".approach-text p",
        ".craft-title",
        ".craft-sub",
        ".craft-stage",
        ".dc",
        ".craft-spec .spec",
        ".craft-sign",
        ".archive-left",
        ".archive-mid",
        ".archive-right",
      ],
    },
    {
      // contact.html
      find: "#channels",
      targets: [
        ".channel",
        ".avail-left",
        ".avail-right",
        ".form-header",
        ".form-field",
        ".form-submit",
      ],
    },
    {
      // index.html
      find: "#about",
      targets: [
        "#about .section-label",
        "#about .about-headline",
        "#about .about-body",
        "#about .about-stats",
        "#about .project-btn",
        "#works .works-heading",
        "#works .project-image",
        "#works .project-content",
        "#contact .section-label",
        "#contact .contact-big",
        "#contact .contact-grid",
      ],
    },
    {
      // works.html: one pinned gallery, so instead of blocks scrolling in, the
      // left-hand project panel rebuilds itself every time the project changes.
      find: "#reel",
      live: {
        host: "#stage",
        el: ".project-details",
        watch: "#number",
        dur: 1200,
        max: 22,
      },
    },
  ];

  const page = PAGES.find((p) => document.querySelector(p.find));
  if (!page) return;

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const START = 0.97;
  const END = 0.58;
  const MAX_LINES = 9;
  const LINE_H = 17;
  const VOID = /^(img|br|hr|input|meta|link|source)$/i;

  const st = document.createElement("style");
  st.textContent = `
  #ctl-layer{position:absolute;left:0;top:0;width:100%;height:0;z-index:150;pointer-events:none}

  .ctl-box{pointer-events:none;position:absolute;box-sizing:border-box;visibility:hidden;outline:1px dashed rgba(74,222,128,.55)}

  .ctl-box::before,.ctl-box::after{content:"";position:absolute;width:5px;height:5px;background:#4ade80;z-index:2}

  .ctl-box::before{left:-3px;top:-3px}.ctl-box::after{right:-3px;bottom:-3px}

  .ctl-tag{position:absolute;left:0;bottom:100%;margin-bottom:6px;padding:1px 7px;background:#4ade80;color:#060606;
    font:500 9px/1.6 var(--ui-mono,'DM Mono',monospace);letter-spacing:.1em;white-space:nowrap;z-index:2}

  .ctl-bg{position:absolute;inset:0;overflow:hidden;padding:8px 12px;box-sizing:border-box;
    font:10.5px/${LINE_H}px var(--ui-mono,'DM Mono',ui-monospace,monospace);color:rgba(236,233,227,.7)}

  .ctl-l{white-space:pre;opacity:0;transition:opacity .2s;height:${LINE_H}px}

  .ctl-l.on{opacity:1}

  .ctl-l.cur::after{content:"";display:inline-block;width:6px;height:11px;margin-left:2px;background:#4ade80;
    vertical-align:text-bottom;animation:ctlb 1s steps(1) infinite}

  @keyframes ctlb{50%{opacity:0}}

  .ctl-scan{position:absolute;left:-4px;right:-4px;height:1px;background:#4ade80;box-shadow:0 0 10px #4ade80;opacity:0;z-index:2}

  .ctl-t{color:#4ade80}.ctl-a{color:rgba(236,233,227,.5)}.ctl-s{color:#ece9e3}

  .ctl-c{color:#4a4a4a}.ctl-p{color:rgba(236,233,227,.28)}`;

  document.head.appendChild(st);

  /* ---------- real HTML -> highlighted lines ---------- */

  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function tokensOf(el) {
    const c = el.cloneNode(true);

    // Strip what particles / GSAP / reveal scripts add at runtime
    c.querySelectorAll(".pfx-canvas,.fx-canvas,script").forEach((n) =>
      n.remove(),
    );

    [c, ...c.querySelectorAll("*")].forEach((n) => {
      n.removeAttribute("style");
      n.classList.remove("is-visible", "revealed", "visible");
      if (n.getAttribute("class") === "") n.removeAttribute("class");
    });

    c.querySelectorAll(".project-link").forEach((a) => {
      a.textContent = a.textContent.replace("↗", "").trim();
    });

    const html = c.outerHTML.replace(/\s+/g, " ").replace(/>\s+</g, "><");
    return html.match(/<!--.*?-->|<[^>]+>|[^<]+/g) || [];
  }

  function hlTag(tok) {
    if (tok.startsWith("<!--")) return `<span class="ctl-c">${esc(tok)}</span>`;

    const m = tok.match(/^<(\/?)([\w-]+)([\s\S]*?)(\/?)>$/);
    if (!m) return esc(tok);

    const attrs = esc(m[3]).replace(
      /([\w:-]+)=("[^"]*")/g,
      '<span class="ctl-a">$1</span><span class="ctl-p">=</span><span class="ctl-s">$2</span>',
    );

    return (
      `<span class="ctl-p">&lt;${m[1]}</span><span class="ctl-t">${m[2]}</span>` +
      `${attrs}<span class="ctl-p">${m[4]}&gt;</span>`
    );
  }

  function buildLines(el, max = MAX_LINES) {
    const toks = tokensOf(el);
    const lines = [];
    let depth = 0;

    const short = (t) => {
      t = t.trim();
      return t.length > 64 ? t.slice(0, 61) + "…" : t;
    };

    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];

      if (t.startsWith("<!--")) {
        lines.push([depth, hlTag(t)]);
      } else if (t[0] !== "<") {
        const s = short(t);
        if (s) lines.push([depth, esc(s)]);
      } else if (t[1] === "/") {
        depth = Math.max(0, depth - 1);
        lines.push([depth, hlTag(t)]);
      } else {
        const name = (t.match(/^<([\w-]+)/) || [])[1] || "";
        const selfClose = VOID.test(name) || /\/>$/.test(t);

        if (
          !selfClose &&
          toks[i + 1] &&
          toks[i + 1][0] !== "<" &&
          toks[i + 2] === `</${name}>`
        ) {
          lines.push([
            depth,
            hlTag(t) + esc(short(toks[i + 1])) + hlTag(toks[i + 2]),
          ]);

          i += 2;
          continue;
        }

        lines.push([depth, hlTag(t)]);
        if (!selfClose) depth++;
      }
    }

    if (lines.length > max) {
      lines.length = max - 1;
      lines.push([0, '<span class="ctl-c">…</span>']);
    }

    return lines;
  }

  // Find the nearest solid ancestor background
  function bgOf(el) {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const m = c.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] >= 0.95)) return c;
    }
    return "#060606";
  }

  /* ---------- works page: rebuild project panel ---------- */

  function startLive(cfg) {
    const host = document.querySelector(cfg.host);
    const el = host && host.querySelector(cfg.el);
    if (!el) return;

    const box = document.createElement("div");
    box.className = "ctl-box";

    box.innerHTML =
      `<span class="ctl-tag">${el.tagName.toLowerCase()}.${el.classList[0] || ""}</span>` +
      `<div class="ctl-bg" style="background:${bgOf(host)}"></div><i class="ctl-scan"></i>`;

    host.appendChild(box);

    const t = {
      box,
      bg: box.querySelector(".ctl-bg"),
      tag: box.querySelector(".ctl-tag"),
      scan: box.querySelector(".ctl-scan"),
      rows: [],
      fit: 1,
      n: -1,
      p: -1,
    };

    let t0 = 0,
      raf = 0;

    function setup() {
      const r = el.getBoundingClientRect(),
        s = host.getBoundingClientRect();

      box.style.cssText = `left:${r.left - s.left}px;top:${r.top - s.top}px;width:${r.width}px;height:${r.height}px;z-index:100;`;

      t.bg.innerHTML = buildLines(el, cfg.max || 22)
        .map(
          ([d, h]) =>
            `<div class="ctl-l" style="padding-left:${d * 2}ch">${h}</div>`,
        )
        .join("");

      t.rows = [...t.bg.querySelectorAll(".ctl-l")];

      t.fit = Math.max(
        1,
        Math.min(t.rows.length, Math.floor((r.height - 16) / LINE_H)),
      );

      t.p = -1;
      t.n = -1;
    }

    function tick(now) {
      const p = clamp((now - t0) / (cfg.dur || 1200));
      render(t, p);
      raf = p < 1 ? requestAnimationFrame(tick) : 0;
    }

    function run() {
      setup();
      t0 = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    }

    const watch = document.querySelector(cfg.watch);

    if (watch)
      new MutationObserver(run).observe(watch, {
        childList: true,
        characterData: true,
        subtree: true,
      });

    addEventListener("load", () => requestAnimationFrame(run));

    if (document.readyState === "complete") requestAnimationFrame(run);
  }

  if (page.live) {
    startLive(page.live);
    return;
  }

  /* ---------- one selection box per block ---------- */

  const layer = document.createElement("div");
  layer.id = "ctl-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const items = [];
  const seen = new Set();

  page.targets.forEach((sel) =>
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el)) return;

      seen.add(el);

      const lines = buildLines(el);
      if (!lines.length) return;

      const cls = el.classList[0]
        ? "." + el.classList[0]
        : el.id
          ? "#" + el.id
          : "";

      const box = document.createElement("div");
      box.className = "ctl-box";

      box.innerHTML =
        `<span class="ctl-tag">${el.tagName.toLowerCase()}${cls}</span>` +
        `<div class="ctl-bg" style="background:${bgOf(el)}">${lines
          .map(
            ([d, h]) =>
              `<div class="ctl-l" style="padding-left:${d * 2}ch">${h}</div>`,
          )
          .join("")}</div><i class="ctl-scan"></i>`;

      layer.appendChild(box);

      items.push({
        el,
        box,
        bg: box.querySelector(".ctl-bg"),
        tag: box.querySelector(".ctl-tag"),
        scan: box.querySelector(".ctl-scan"),
        rows: [...box.querySelectorAll(".ctl-l")],
        y: 0,
        fit: 1,
        n: -1,
        p: -1,
        ok: false,
      });
    }),
  );

  if (!items.length) return;

  /* ---------- measure layout position ---------- */

  function measure() {
    const vh = innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);

    items.forEach((t) => {
      let x = 0,
        y = 0;

      for (let n = t.el; n; n = n.offsetParent) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }

      const w = t.el.offsetWidth,
        h = t.el.offsetHeight;

      t.ok = w > 8 && h > 8;
      t.y = y;
      t.s = y - vh * START;
      t.e = Math.min(y - vh * END, max);

      t.box.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;

      t.fit = Math.max(
        1,
        Math.min(t.rows.length, Math.floor((h - 16) / LINE_H)),
      );

      t.p = -1;
      t.n = -1;
    });

    frame();
  }

  /* ---------- scroll-driven render ---------- */

  function render(t, p) {
    if (p === t.p) return;

    t.p = p;

    if (p >= 1) {
      t.box.style.visibility = "hidden";
      return;
    }

    t.box.style.visibility = "visible";

    const n = Math.ceil(clamp((p - 0.08) / 0.5) * t.fit);

    if (n !== t.n) {
      t.n = n;

      t.rows.forEach((r, i) => {
        r.classList.toggle("on", i < n);
        r.classList.toggle("cur", i === n - 1 && p < 0.58);
      });
    }

    const w = clamp((p - 0.62) / 0.38) * 100;

    t.bg.style.clipPath = `inset(${w}% 0 0 0)`;
    t.scan.style.top = w + "%";
    t.scan.style.opacity = w > 0 && w < 100 ? 1 : 0;
    t.tag.style.opacity = 1 - clamp((p - 0.62) / 0.2);
  }

  function frame() {
    const sy = scrollY;

    items.forEach((t) =>
      render(
        t,
        !t.ok
          ? 1
          : t.e > t.s
            ? clamp((sy - t.s) / (t.e - t.s))
            : sy >= t.e
              ? 1
              : 0,
      ),
    );
  }

  let ticking = false;

  addEventListener(
    "scroll",
    () => {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        frame();
      });
    },
    { passive: true },
  );

  let mt = 0;

  const remeasure = () => {
    cancelAnimationFrame(mt);
    mt = requestAnimationFrame(measure);
  };

  addEventListener("resize", remeasure);
  addEventListener("load", remeasure);

  document.fonts && document.fonts.ready.then(remeasure);

  if (window.ResizeObserver)
    new ResizeObserver(remeasure).observe(document.body);

  measure();
})();
