/* ── DEVICE DETECTION ── */
const touch =
  window.matchMedia("(hover:none),(pointer:coarse)").matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;

/* ── INJECT WORDS + SPLIT INTO CHARS ── */
document.querySelectorAll(".hero-line").forEach((line) => {
  const word = line.dataset.word || "";
  const h1 = line.querySelector("h1");
  h1.innerHTML = word
    .split("")
    .map((ch) => `<span class="char">${ch}</span>`)
    .join("");
});

/* ── BG VIDEO ── */
(function () {
  const vid = document.getElementById("bg-video");
  const btn = document.getElementById("play-btn");

  vid.muted = true;
  vid.defaultMuted = true;

  function showBtn() {
    btn.classList.add("visible");
    setTimeout(() => btn.classList.add("show"), 600);
  }

  function hideBtn() {
    btn.classList.remove("show");
    setTimeout(() => btn.classList.remove("visible"), 500);
  }

  vid.play().catch(() => {
    showBtn();

    const events = ["touchstart", "touchend", "click"];
    function onGesture() {
      vid
        .play()
        .then(() => hideBtn())
        .catch(() => {});
      events.forEach((e) => document.removeEventListener(e, onGesture));
    }
    events.forEach((e) =>
      document.addEventListener(e, onGesture, {
        once: true,
        passive: true,
      }),
    );
  });

  btn.addEventListener("click", () => {
    vid
      .play()
      .then(() => hideBtn())
      .catch(() => {});
  });
})();

/* ── HINT TEXT ── */
const hintEl = document.getElementById("bottom-hint");
hintEl.textContent = touch
  ? "Tap a profile to enter"
  : "Hover a profile · click to enter";

/* ── INTRO WIPE ── */
const introEl = document.getElementById("intro");
introEl.classList.add("ready");
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    introEl.classList.add("slide-up");
    revealContent();
  });
});

function revealContent() {
  document
    .querySelectorAll(
      ".hero-line, .corner-tl, .corner-tr, .corner-bl, .marquee-bar, .bottom-hint",
    )
    .forEach((el, i) => {
      setTimeout(() => el.classList.add("revealed"), 600 + i * 110);
    });
}

/* ── CUSTOM CURSOR ── */
const cur = document.getElementById("cur");
const ringEl = document.getElementById("ring");
const vline = document.getElementById("vline");
let mx = 0,
  my = 0,
  rx = 0,
  ry = 0;

if (!touch) {
  let moved = false;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cur.style.left = mx + "px";
    cur.style.top = my + "px";
    vline.style.left = mx + "px";
    moved = true;
  });

  (function raf() {
    if (moved) {
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;
      ringEl.style.left = rx + "px";
      ringEl.style.top = ry + "px";
      if (Math.abs(mx - rx) < 0.5 && Math.abs(my - ry) < 0.5) moved = false;
    }
    requestAnimationFrame(raf);
  })();

  document.addEventListener("mousedown", () => {
    cur.style.transform = "translate(-50%,-50%) scale(3)";
    cur.style.opacity = "0.3";
  });
  document.addEventListener("mouseup", () => {
    cur.style.transform = "translate(-50%,-50%) scale(1)";
    cur.style.opacity = "1";
  });
}

/* ── IMAGE ANIMATION ENGINE ── */
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const DUR = 700;

function makeSlotAnim(wrap, img) {
  function apply(p) {
    wrap.style.clipPath = "none";
    img.style.transform = "scale(1)";
    wrap.style.opacity = p;
  }

  return {
    prog: 0,
    reveal() {
      this.prog = 1;
      apply(1);
    },
    retrace() {
      this.prog = 0;
      apply(0);
    },
    hide() {
      this.prog = 0;
      apply(0);
    },
  };
}
const sL = [
  makeSlotAnim(
    document.getElementById("slotL-a"),
    document.getElementById("imgLA"),
  ),
  makeSlotAnim(
    document.getElementById("slotL-b"),
    document.getElementById("imgLB"),
  ),
];
const sR = [
  makeSlotAnim(
    document.getElementById("slotR-a"),
    document.getElementById("imgRA"),
  ),
  makeSlotAnim(
    document.getElementById("slotR-b"),
    document.getElementById("imgRB"),
  ),
];
const imgEls = {
  L: [document.getElementById("imgLA"), document.getElementById("imgLB")],
  R: [document.getElementById("imgRA"), document.getElementById("imgRB")],
};

sL[0].hide();
sL[1].hide();
sR[0].hide();
sR[1].hide();

let aL = 0,
  aR = 0,
  imVis = false;

/* ── showImages — fixed image decode race condition ── */
function showImages(lSrc, rSrc) {
  if (!imVis) {
    imVis = true;
    const imgL = imgEls.L[aL];
    const imgR = imgEls.R[aR];
    imgL.src = lSrc;
    imgR.src = rSrc;

    // Wait for both images to fully decode before starting clip-path animation
    // This prevents the wrong/old image from showing during the reveal
    Promise.all([
      imgL.decode().catch(() => {}),
      imgR.decode().catch(() => {}),
    ]).then(() => {
      sL[aL].reveal();
      sR[aR].reveal();
    });
    return;
  }

  const nL = 1 - aL,
    nR = 1 - aR;
  const imgL = imgEls.L[nL];
  const imgR = imgEls.R[nR];

  // Set z-index BEFORE decode to avoid z-fighting during transition
  ["slotL-a", "slotL-b"].forEach((id, i) => {
    document.getElementById(id).style.zIndex = i === nL ? 202 : 200;
  });
  ["slotR-a", "slotR-b"].forEach((id, i) => {
    document.getElementById(id).style.zIndex = i === nR ? 202 : 200;
  });

  imgL.src = lSrc;
  imgR.src = rSrc;

  // Retrace old slots immediately
  sL[aL].retrace();
  sR[aR].retrace();

  // Reveal new slots only after images are decoded
  Promise.all([
    imgL.decode().catch(() => {}),
    imgR.decode().catch(() => {}),
  ]).then(() => {
    sL[nL].reveal();
    sR[nR].reveal();
  });

  aL = nL;
  aR = nR;
}

function hideImages() {
  if (!imVis) return;
  imVis = false;
  sL[aL].retrace();
  sR[aR].retrace();
}

/* ── SLOT LAYOUT ── */
function applySlotLayout(line) {
  if (touch) {
    ["slotL-a", "slotL-b"].forEach((id) => {
      const el = document.getElementById(id);
      el.style.display = "block";
      el.style.width = line.dataset.mobLw || "40vw";
      el.style.height = line.dataset.mobLh || "50vw";
      el.style.left = line.dataset.mobLleft || "0px";
      el.style.top = "50%";
      el.style.marginTop = line.dataset.mobLmt || "-25vw";
      el.style.right = "auto";
    });
    ["slotR-a", "slotR-b"].forEach((id) => {
      const el = document.getElementById(id);
      el.style.display = "block";
      el.style.width = line.dataset.mobRw || "40vw";
      el.style.height = line.dataset.mobRh || "50vw";
      el.style.right = line.dataset.mobRright || "0px";
      el.style.top = "50%";
      el.style.marginTop = line.dataset.mobRmt || "-25vw";
      el.style.left = "auto";
    });
    return;
  }
  ["slotL-a", "slotL-b"].forEach((id) => {
    const el = document.getElementById(id);
    el.style.width = line.dataset.lw + "px";
    el.style.height = line.dataset.lh + "px";
    el.style.left = line.dataset.lleft;
    el.style.top = line.dataset.ltop;
    el.style.marginTop = line.dataset.lmt + "px";
    el.style.right = "auto";
  });
  ["slotR-a", "slotR-b"].forEach((id) => {
    const el = document.getElementById(id);
    el.style.width = line.dataset.rw + "px";
    el.style.height = line.dataset.rh + "px";
    el.style.right = line.dataset.rright;
    el.style.top = line.dataset.rtop;
    el.style.marginTop = line.dataset.rmt + "px";
    el.style.left = "auto";
  });
}

/* ── HINT DISMISS ── */
let hintDismissed = false;
function dismissHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  hintEl.classList.add("dismissed");
}

/* ── RESET ALL LINES ── */
const body = document.body;
const lines = document.querySelectorAll(".hero-line");

function resetAllLines() {
  body.classList.remove("hover-design", "hover-play", "hover-universe");
  lines.forEach((l) => {
    l.classList.remove("active", "touch-active");
    l._activated = false;
    l.querySelectorAll(".char").forEach((c) => {
      c.style.transitionDelay = "0s";
      c.style.transform = "translateY(0)";
    });
  });
  hideImages();
}

/* ── LINE INTERACTIONS ── */
lines.forEach((line) => {
  const hc = line.dataset.hoverClass;
  const url = line.dataset.url;
  const chars = line.querySelectorAll(".char");
  line._activated = false;

  if (!touch) {
    /* DESKTOP */
    line.addEventListener("mouseenter", () => {
      dismissHint();
      body.classList.remove("hover-design", "hover-play", "hover-universe");
      if (hc) body.classList.add(hc);
      vline.style.opacity = "1";
      chars.forEach((c, i) => {
        c.style.transitionDelay = i * 0.032 + "s";
        c.style.transform = "translateY(-5px)";
      });
      applySlotLayout(line);
      showImages(line.dataset.left, line.dataset.right);
    });

    line.addEventListener("mouseleave", () => {
      body.classList.remove("hover-design", "hover-play", "hover-universe");
      vline.style.opacity = "0";
      chars.forEach((c) => {
        c.style.transitionDelay = "0s";
        c.style.transform = "translateY(0)";
      });
      hideImages();
    });

    line.addEventListener("click", () => {
      lines.forEach((l) => l.classList.remove("active"));
      line.classList.add("active");
      setTimeout(() => (window.location.href = url), 300);
    });
  } else {
    /* MOBILE — first tap previews, second navigates */
    let moved = false;
    line.addEventListener(
      "touchstart",
      () => {
        moved = false;
      },
      { passive: true },
    );
    line.addEventListener(
      "touchmove",
      () => {
        moved = true;
      },
      { passive: true },
    );
    line.addEventListener(
      "touchend",
      () => {
        if (moved) return;
        if (!line._activated) {
          line._activated = true;
          dismissHint();
          lines.forEach((l) => {
            if (l !== line) {
              l._activated = false;
              l.classList.remove("active", "touch-active");
              l.querySelectorAll(".char").forEach((c) => {
                c.style.transitionDelay = "0s";
                c.style.transform = "translateY(0)";
              });
            }
          });
          body.classList.remove("hover-design", "hover-play", "hover-universe");
          if (hc) body.classList.add(hc);
          chars.forEach((c, i) => {
            c.style.transitionDelay = i * 0.025 + "s";
            c.style.transform = "translateY(-4px)";
          });
          line.classList.add("active", "touch-active");
          applySlotLayout(line);
          showImages(line.dataset.left, line.dataset.right);
        } else {
          setTimeout(() => (window.location.href = url), 240);
        }
      },
      { passive: true },
    );
  }
});

/* ── TAP OUTSIDE — RESET ── */
document.addEventListener(
  "touchend",
  (e) => {
    if (!e.target.closest(".hero-line")) resetAllLines();
  },
  { passive: true },
);
