/* =============================================
   A.M — Portfolio · script.js
   ============================================= */

window.addEventListener("pageshow", (e) => {
  if (e.persisted) window.location.reload();
});

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import ScrollTrigger from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/* ─────────────────────────────────────────────
   NATIVE SCROLL
   Lenis removed: its duration/easing kept the page gliding after the wheel
   stopped, which is what felt "slower than my scroll". Native scrolling
   follows the wheel / trackpad / touch exactly, and everything below reads
   the real scroll position.
───────────────────────────────────────────── */
document.documentElement.style.scrollBehavior = "auto";

/* ─────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ─────────────────────────────────────────────
   SCROLL METRICS (cached — never read layout inside a scroll frame)
───────────────────────────────────────────── */
const heroName = document.querySelector(".hero-name");
const heroEyebrow = document.querySelector(".hero-eyebrow");
const heroMeta = document.querySelector(".hero-meta");

const marqueeEl = document.querySelector(".marquee-wrap");

let scrollProgress = 0;
let maxScroll = 1;
let vh = window.innerHeight;
/* The WebGL canvas only shows over the hero + marquee. Everything below is
   opaque, so once that is scrolled past we stop drawing the 3D scene. */
let canvasHideY = Infinity;

const measure = () => {
  vh = window.innerHeight;
  maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  if (marqueeEl) {
    canvasHideY = marqueeEl.getBoundingClientRect().bottom + window.scrollY;
  }
};
measure();

/* bumps whenever cached element rects may be stale */
let layoutStamp = 0;
const bumpLayoutStamp = () => layoutStamp++;
window.addEventListener("scroll", bumpLayoutStamp, { passive: true });
window.addEventListener("resize", bumpLayoutStamp);
window.addEventListener("resize", measure);
window.addEventListener("load", measure);
ScrollTrigger.addEventListener("refresh", measure);

let lastSY = 0;
let heroSettled = false;

function updateHero(sy) {
  if (sy < vh) {
    const t = sy / vh;
    if (heroName) {
      heroName.style.transform = `translateY(${t * 70}px)`;
      heroName.style.opacity = String(Math.max(0, 1 - t * 1.3));
    }
    if (heroEyebrow) heroEyebrow.style.opacity = String(Math.max(0, 1 - t * 2));
    if (heroMeta) heroMeta.style.opacity = String(Math.max(0, 1 - t * 2.2));
    heroSettled = false;
  } else if (!heroSettled) {
    /* past the hero: lock the final state once (fast scrolls skip frames) */
    if (heroName) {
      heroName.style.transform = "translateY(70px)";
      heroName.style.opacity = "0";
    }
    if (heroEyebrow) heroEyebrow.style.opacity = "0";
    if (heroMeta) heroMeta.style.opacity = "0";
    heroSettled = true;
  }
}

/* ─────────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        revealObserver.unobserve(e.target);
      }
    });
  },
  {
    threshold: 0,
    rootMargin: "0px 0px 120px 0px",
  },
);
document
  .querySelectorAll("[data-reveal]")
  .forEach((el) => revealObserver.observe(el));

/* Dark cursor when over the white Works section */
const worksEl = document.getElementById("works");
if (worksEl) {
  new IntersectionObserver(
    (entries) => {
      entries.forEach((e) =>
        document.body.classList.toggle("cursor-dark", e.isIntersecting),
      );
    },
    { threshold: 0.2 },
  ).observe(worksEl);
}

/* ─────────────────────────────────────────────
   THREE.JS — PERSISTENT FULL-PAGE SCENE
───────────────────────────────────────────── */
const canvas = document.getElementById("hero-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance" /* use the real GPU on laptops */,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);
camera.position.set(0, 0, 7);

/* ── BACKGROUND GRID (one draw call instead of ~46) ── */
const gridMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  opacity: 1,
  transparent: true,
});
const gridPts = [];
for (let i = -22; i <= 22; i += 1.8) {
  gridPts.push(new THREE.Vector3(-22, i, -4), new THREE.Vector3(22, i, -4));
  gridPts.push(new THREE.Vector3(i, -22, -4), new THREE.Vector3(i, 22, -4));
}
scene.add(
  new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(gridPts),
    gridMat,
  ),
);

/* ── MAIN WIREFRAME CUBE ── */
const mainBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 2.4, 2.4)),
  new THREE.LineBasicMaterial({
    color: 0xece9e3,
    opacity: 0.92,
    transparent: true,
  }),
);
mainBox.position.x = -0.15;
scene.add(mainBox);

/* ── INNER CUBE ── */
const innerBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 1.2, 1.2)),
  new THREE.LineBasicMaterial({
    color: 0xece9e3,
    opacity: 0.6,
    transparent: true,
  }),
);
innerBox.position.x = -0.15;
scene.add(innerBox);

/* ── ORBIT RINGS ── */
function mkRing(radius, axis) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    if (axis === "x")
      pts.push(
        new THREE.Vector3(0, Math.cos(a) * radius, Math.sin(a) * radius),
      );
    if (axis === "y")
      pts.push(
        new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius),
      );
    if (axis === "z")
      pts.push(
        new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0),
      );
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({
      color: 0xece9e3,
      opacity: 0.2,
      transparent: true,
    }),
  );
}

const ringGroup = new THREE.Group();
scene.add(ringGroup);

const r1 = mkRing(2.0, "x");
const r2 = mkRing(2.0, "y");
const r3 = mkRing(2.0, "z");
const r4 = mkRing(2.0, "x");
const r5 = mkRing(2.0, "y");
const r6 = mkRing(2.0, "z");
ringGroup.add(r1, r2, r3, r4, r5, r6);

/* ── PARTICLES ── */
const pN = 100;
const pPos = new Float32Array(pN * 3);
const pVel = [];

for (let i = 0; i < pN; i++) {
  const x = (Math.random() - 0.5) * 18;
  const y = (Math.random() - 0.5) * 18;
  const z = (Math.random() - 0.5) * 8;
  pPos[i * 3] = x;
  pPos[i * 3 + 1] = y;
  pPos[i * 3 + 2] = z;
  pVel.push({
    x: (Math.random() - 0.5) * 0.003,
    y: (Math.random() - 0.5) * 0.003,
    z: (Math.random() - 0.5) * 0.002,
  });
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
const pMesh = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    color: 0xece9e3,
    size: 0.022,
    opacity: 0.4,
    transparent: true,
  }),
);
scene.add(pMesh);

/* ── MOUSE TRACKING ── */
let targetMX = 0,
  targetMY = 0,
  currentMX = 0,
  currentMY = 0;
let hoverSpeed = 1,
  targetHoverSpeed = 1;

window.addEventListener(
  "mousemove",
  (e) => {
    targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMY = -(e.clientY / window.innerHeight - 0.5) * 2;
  },
  { passive: true },
);

const heroSection = document.getElementById("hero");
if (heroSection) {
  heroSection.addEventListener("mouseenter", () => (targetHoverSpeed = 2.6));
  heroSection.addEventListener("mouseleave", () => (targetHoverSpeed = 1));
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─────────────────────────────────────────────
   PHASE VALUES
───────────────────────────────────────────── */
function getPhaseValues(p) {
  const p0End = 0.15,
    p1End = 0.4,
    p2End = 0.7;
  let t;

  if (p < p0End) {
    t = p / p0End;
    return {
      cubeScale: lerp(1.0, 1.05, t),
      cubeOpacity: lerp(0.92, 0.85, t),
      innerOpacity: lerp(0.15, 0.25, t),
      ringOpacity: lerp(0.05, 0.12, t),
      outerRingOpacity: lerp(0.0, 0.04, t),
      particleOpacity: lerp(0.3, 0.35, t),
      gridOpacity: lerp(0.025, 0.03, t),
      rotationMult: lerp(1.0, 1.1, t),
      camZ: lerp(7.0, 7.5, t),
    };
  } else if (p < p1End) {
    t = (p - p0End) / (p1End - p0End);
    return {
      cubeScale: lerp(1.05, 1.3, t),
      cubeOpacity: lerp(0.85, 0.7, t),
      innerOpacity: lerp(0.25, 0.45, t),
      ringOpacity: lerp(0.12, 0.22, t),
      outerRingOpacity: lerp(0.04, 0.12, t),
      particleOpacity: lerp(0.35, 0.42, t),
      gridOpacity: lerp(0.03, 0.04, t),
      rotationMult: lerp(1.1, 1.4, t),
      camZ: lerp(7.5, 9.5, t),
    };
  } else if (p < p2End) {
    t = (p - p1End) / (p2End - p1End);
    return {
      cubeScale: lerp(1.3, 1.8, t),
      cubeOpacity: lerp(0.7, 0.45, t),
      innerOpacity: lerp(0.45, 0.6, t),
      ringOpacity: lerp(0.22, 0.35, t),
      outerRingOpacity: lerp(0.12, 0.28, t),
      particleOpacity: lerp(0.42, 0.5, t),
      gridOpacity: lerp(0.04, 0.055, t),
      rotationMult: lerp(1.4, 1.8, t),
      camZ: lerp(9.5, 13.0, t),
    };
  } else {
    t = (p - p2End) / (1.0 - p2End);
    return {
      cubeScale: lerp(1.8, 2.8, t),
      cubeOpacity: lerp(0.45, 0.18, t),
      innerOpacity: lerp(0.6, 0.75, t),
      ringOpacity: lerp(0.35, 0.5, t),
      outerRingOpacity: lerp(0.28, 0.45, t),
      particleOpacity: lerp(0.5, 0.55, t),
      gridOpacity: lerp(0.055, 0.07, t),
      rotationMult: lerp(1.8, 2.4, t),
      camZ: lerp(13.0, 19.0, t),
    };
  }
}

/* ─────────────────────────────────────────────
   SCENE STATE
   Follows the scroll closely (0.18 per frame ≈ settles in ~15 frames).
   It used to be 0.035, which trailed the page by a full second or more.
───────────────────────────────────────────── */
let state = {
  cubeScale: 1.0,
  cubeOpacity: 0.92,
  innerOpacity: 0.15,
  ringOpacity: 0.05,
  outerRingOpacity: 0.0,
  particleOpacity: 0.3,
  gridOpacity: 0.025,
  rotationMult: 1.0,
  camZ: 7.0,
};

const SCENE_FOLLOW = 0.18;

/* ─────────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────────── */
let canvasCovered = false;

(function animate() {
  requestAnimationFrame(animate);

  /* read the real scroll position once per frame (no layout reads) */
  const sy = window.scrollY;
  if (sy !== lastSY) {
    lastSY = sy;
    scrollProgress = clamp(sy / maxScroll, 0, 1);
    updateHero(sy);
  }

  /* Past the hero + marquee the canvas is fully covered by opaque sections:
     hide it and skip every bit of 3D / particle work until we scroll back. */
  const covered = sy >= canvasHideY;
  if (covered !== canvasCovered) {
    canvasCovered = covered;
    canvas.style.visibility = covered ? "hidden" : "visible";
  }
  if (covered) return;

  currentMX += (targetMX - currentMX) * 0.12;
  currentMY += (targetMY - currentMY) * 0.12;
  hoverSpeed += (targetHoverSpeed - hoverSpeed) * 0.04;

  mainBox.position.x = currentMX * 0.6;
  mainBox.position.y = currentMY * 0.35;
  innerBox.position.x = currentMX * 0.4;
  innerBox.position.y = currentMY * 0.25;

  const target = getPhaseValues(scrollProgress);
  for (const key in state) {
    if (target[key] !== undefined) {
      state[key] += (target[key] - state[key]) * SCENE_FOLLOW;
    }
  }

  const expand = (state.cubeScale - 1) / 2;

  mainBox.scale.setScalar(state.cubeScale);
  mainBox.material.opacity = state.cubeOpacity;
  innerBox.material.opacity = state.innerOpacity;
  innerBox.scale.setScalar(state.cubeScale * 0.88);

  gridMat.opacity = state.gridOpacity;

  const rm = state.rotationMult * hoverSpeed;
  mainBox.rotation.y += 0.004 * rm;
  mainBox.rotation.x =
    currentMY * 0.9 * (1 / Math.max(1, state.cubeScale * 0.6));
  mainBox.rotation.z =
    currentMX * 0.6 * (1 / Math.max(1, state.cubeScale * 0.6));
  innerBox.rotation.x -= 0.007 * rm;
  innerBox.rotation.y += 0.009 * rm;

  pMesh.material.opacity = state.particleOpacity;
  const spread = 1 + expand * 3;
  const pos = pGeo.attributes.position.array;
  const repulseStrength = Math.max(0, 1 - scrollProgress * 1.4);

  for (let i = 0; i < pN; i++) {
    pos[i * 3] += pVel[i].x;
    pos[i * 3 + 1] += pVel[i].y;
    pos[i * 3 + 2] += pVel[i].z;

    const bx = 9 * spread,
      by = 9 * spread,
      bz = 4 * spread;
    if (Math.abs(pos[i * 3]) > bx) pVel[i].x *= -1;
    if (Math.abs(pos[i * 3 + 1]) > by) pVel[i].y *= -1;
    if (Math.abs(pos[i * 3 + 2]) > bz) pVel[i].z *= -1;

    if (repulseStrength > 0) {
      const dx = pos[i * 3] - currentMX * 5;
      const dy = pos[i * 3 + 1] - currentMY * 3.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.001 && d < 3) {
        const force = ((3 - d) / 3) * 0.08 * hoverSpeed * repulseStrength;
        pos[i * 3] += (dx / d) * force;
        pos[i * 3 + 1] += (dy / d) * force;
      }
    }
  }

  pGeo.attributes.position.needsUpdate = true;
  pMesh.rotation.y += 0.0004 * (1 + scrollProgress * 0.5);

  camera.position.z += (state.camZ - camera.position.z) * SCENE_FOLLOW;
  camera.position.x +=
    (currentMX * 2.55 * (7 / Math.max(7, state.camZ)) - camera.position.x) *
    0.1;
  camera.position.y +=
    (currentMY * 1.8 * (7 / Math.max(7, state.camZ)) - camera.position.y) * 0.1;
  camera.lookAt(0, 0, 0);

  scene.rotation.y = currentMX * 0.12;
  scene.rotation.x = currentMY * 0.08;

  renderer.render(scene, camera);
})();

/* ─────────────────────────────────────────────
   CUSTOM CURSOR + VIEW SERVICES
   Moved with transforms (no layout work) and the loop sleeps when the
   mouse is still, instead of running every frame forever.
───────────────────────────────────────────── */
const cursorEl = document.getElementById("cursor");

if (cursorEl) {
  const cDot = cursorEl.querySelector(".c-dot");
  const cRing = cursorEl.querySelector(".c-ring");
  const cText = cursorEl.querySelector(".c-text");

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let cursorRunning = false;

  const putCursor = () => {
    cDot.style.transform = `translate3d(${mouseX}px,${mouseY}px,0) translate(-50%,-50%)`;
    cRing.style.transform = `translate3d(${ringX}px,${ringY}px,0) translate(-50%,-50%)`;
  };

  function cursorTick() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    putCursor();
    if (Math.abs(mouseX - ringX) > 0.1 || Math.abs(mouseY - ringY) > 0.1) {
      requestAnimationFrame(cursorTick);
    } else {
      cursorRunning = false;
    }
  }

  document.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursorRunning) {
        cursorRunning = true;
        requestAnimationFrame(cursorTick);
      }
    },
    { passive: true },
  );

  putCursor();

  document.querySelectorAll(".service").forEach((card) => {
    const title = card.querySelector("h3");

    card.addEventListener("mouseenter", () => {
      document.body.classList.add("cursor-view");
      cText.innerHTML = title
        ? `CLICK TO VIEW<br>${title.textContent}`
        : "VIEW";
    });

    card.addEventListener("mouseleave", () => {
      document.body.classList.remove("cursor-view");
      cText.textContent = "";
    });

    card.addEventListener("click", () => {
      const page = card.dataset.page;
      if (page) window.location.href = page;
    });
  });
}

/* ─────────────────────────────────────────────
   INTRO ANIMATION
───────────────────────────────────────────── */
const introEl = document.getElementById("intro");
const mainEl = document.getElementById("main");
const headerEl = document.getElementById("site-header");

if (sessionStorage.getItem("introPlayed")) {
  introEl.style.display = "none";
  mainEl.style.opacity = "1";
  headerEl.style.opacity = "1";

  document
    .querySelectorAll(
      ".hero-name .hline span, .hero-eyebrow span, .meta-item span",
    )
    .forEach((s) => {
      s.style.transition = "none";
      s.style.transform = "translateY(0)";
    });
} else {
  sessionStorage.setItem("introPlayed", "true");

  const introRule = document.getElementById("intro-rule");
  const introSub = document.getElementById("intro-sub");
  const introWipe = document.getElementById("intro-wipe");
  const letterA = document.getElementById("il-a");
  const letterDot = document.getElementById("il-dot");
  const letterM = document.getElementById("il-m");

  function tr(el, props, dur, delay = 0) {
    setTimeout(() => {
      el.style.transition = Object.keys(props)
        .map(
          (k) =>
            `${k.replace(/([A-Z])/g, "-$1").toLowerCase()} ${dur}ms cubic-bezier(.16,1,.3,1)`,
        )
        .join(", ");
      Object.assign(el.style, props);
    }, delay);
  }

  tr(introRule, { width: "50px" }, 900, 150);
  tr(letterA, { opacity: "1", transform: "translateY(0)" }, 1000, 700);
  tr(letterDot, { opacity: "1", transform: "translateY(0)" }, 1000, 870);
  tr(letterM, { opacity: "1", transform: "translateY(0)" }, 1000, 1010);

  setTimeout(() => {
    introSub.style.transition = "color 1.2s ease";
    introSub.style.color = "rgba(236,233,227,0.16)";
  }, 1500);

  tr(introRule, { width: "100vw" }, 900, 1900);

  setTimeout(() => {
    [letterA, letterDot, letterM].forEach((l, i) => {
      setTimeout(() => {
        l.style.transition =
          "opacity .55s ease, transform .55s cubic-bezier(.76,0,.24,1)";
        l.style.opacity = "0";
        l.style.transform = "translateY(-10px)";
      }, i * 55);
    });
    introSub.style.transition = "opacity .5s ease";
    introSub.style.opacity = "0";
  }, 2400);

  setTimeout(() => {
    introWipe.style.transition = "transform 1.1s cubic-bezier(.76,0,.24,1)";
    introWipe.style.transform = "scaleY(0)";
  }, 2800);

  setTimeout(() => {
    introEl.style.display = "none";

    mainEl.style.transition = "opacity .7s ease";
    mainEl.style.opacity = "1";

    headerEl.style.transition = "opacity .9s ease";
    headerEl.style.opacity = "1";

    document.querySelectorAll(".hero-name .hline span").forEach((s, i) => {
      setTimeout(() => {
        s.style.transition = "transform 1.3s cubic-bezier(.16,1,.3,1)";
        s.style.transform = "translateY(0)";
      }, i * 140);
    });

    document.querySelectorAll(".hero-eyebrow span").forEach((s) => {
      s.style.transition = "transform 1s cubic-bezier(.16,1,.3,1)";
      s.style.transform = "translateY(0)";
    });

    document.querySelectorAll(".meta-item span").forEach((s, i) => {
      setTimeout(
        () => {
          s.style.transition = "transform .9s cubic-bezier(.16,1,.3,1)";
          s.style.transform = "translateY(0)";
        },
        200 + i * 50,
      );
    });
  }, 3950);
}

/* ─────────────────────────────────────────────
   GSAP SCROLL ANIMATIONS
───────────────────────────────────────────── */

/* ── Reveal Projects ── */
document.querySelectorAll(".project").forEach((project) => {
  const content = project.querySelector(".project-main");
  const number = project.querySelector(".project-number");
  const bgNum = project.querySelector(".project-bg-num");
  const title = project.querySelector("h3");
  const desc = content && content.querySelector("p");
  // tags and link are intentionally excluded here — the dedicated
  // Stagger Tags block below owns those elements. Animating them
  // in two places simultaneously leaves them stuck at opacity:0.

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: project,
      start: "top 95%",
      onEnter: () => project.classList.add("revealed"),
    },
  });

  if (number)
    tl.from(
      number,
      {
        y: 30,
        opacity: 0,
        duration: 0.45,
        ease: "power3.out",
        clearProps: "all",
      },
      0,
    );

  if (title)
    tl.from(
      title,
      {
        y: 30,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "all",
      },
      0,
    );

  if (desc)
    tl.from(
      desc,
      {
        y: 25,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "all",
      },
      0,
    );

  if (bgNum)
    tl.from(
      bgNum,
      {
        scale: 0.85,
        opacity: 0,
        duration: 0.7,
        ease: "power4.out",
        clearProps: "all",
      },
      0,
    );
});

/* ── Parallax Images ── */
document.querySelectorAll(".project-image img").forEach((img) => {
  gsap.fromTo(
    img,
    { yPercent: 7 },
    {
      yPercent: -7,
      ease: "none",
      scrollTrigger: {
        trigger: img.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    },
  );
});

/* ── Project Hover ── */
document.querySelectorAll(".project").forEach((project) => {
  const image = project.querySelector("img");
  const title = project.querySelector("h3");
  project.addEventListener("mouseenter", () => {
    gsap.to(title, { x: 20, duration: 0.5, ease: "power3.out" });
    gsap.to(image, { scale: 1.08, duration: 1, ease: "power4.out" });
  });
  project.addEventListener("mouseleave", () => {
    gsap.to(title, { x: 0, duration: 0.5, ease: "power3.out" });
    gsap.to(image, { scale: 1, duration: 1, ease: "power4.out" });
  });
});

/* ── View Project Button — hover animation ── */
document.querySelectorAll(".project-link").forEach((link) => {
  // Wrap the text so we can animate it independently
  const originalText = link.textContent.trim();
  link.innerHTML = `<span class="pl-line"></span><span class="pl-text">${originalText}</span><span class="pl-arrow">↗</span>`;

  const line = link.querySelector(".pl-line");
  const text = link.querySelector(".pl-text");
  const arrow = link.querySelector(".pl-arrow");

  // ── Enter ──
  link.addEventListener("mouseenter", () => {
    // Line expands
    gsap.to(line, {
      width: "30px",
      backgroundColor: "#4ade80",
      duration: 0.35,
      ease: "power3.out",
    });

    // Text shifts right + slight letter-spacing open
    gsap.to(text, {
      x: 8,
      letterSpacing: "0.18em",
      color: "#4ade80",
      duration: 0.4,
      ease: "power3.out",
    });

    // Arrow launches out then drops back in from top
    gsap
      .timeline()
      .to(arrow, {
        x: 14,
        y: -14,
        opacity: 0,
        duration: 0.28,
        ease: "power2.in",
      })
      .set(arrow, { x: -10, y: 10, color: "#4ade80" })
      .to(arrow, {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 0.32,
        ease: "power3.out",
      });

    // Magnetic pull on the whole link
    link.addEventListener("mousemove", onMouseMove);
  });

  // ── Leave ──
  link.addEventListener("mouseleave", () => {
    link.removeEventListener("mousemove", onMouseMove);

    gsap.to(line, { width: "24px", duration: 0.4, ease: "power3.out" });
    gsap.to(text, {
      x: 0,
      letterSpacing: "0.12em",
      color: "#ece9e3",
      duration: 0.4,
      ease: "power3.out",
    });
    gsap.to(arrow, {
      x: 0,
      y: 0,
      color: "#ece9e3",
      duration: 0.55,
      ease: "elastic.out(1, 0.5)",
    });
    gsap.to(link, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  });

  function onMouseMove(e) {
    const rect = link.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    gsap.to(link, {
      x: mx * 0.09,
      y: my * 0.09,
      duration: 0.4,
      ease: "power3.out",
    });
  }
});

/* ── Floating Background Numbers ── */
document.querySelectorAll(".project-bg-num").forEach((num) => {
  gsap.to(num, {
    yPercent: 30,
    ease: "none",
    scrollTrigger: {
      trigger: num.parentElement,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
});

/* ── Section Title ── */
gsap.from(".works-heading p", {
  y: 50,
  opacity: 0,
  duration: 1,
  ease: "power4.out",
  scrollTrigger: { trigger: ".works-heading", start: "top 80%" },
});
gsap.from(".works-heading h2", {
  y: 100,
  opacity: 0,
  duration: 1.2,
  ease: "power4.out",
  scrollTrigger: { trigger: ".works-heading", start: "top 80%" },
});

/* ── Image Tilt (quickTo reuses one tween instead of creating a new one
      on every mousemove event) ── */
document.querySelectorAll(".project").forEach((project) => {
  const imageWrap = project.querySelector(".project-image");
  if (!imageWrap) return;

  gsap.set(imageWrap, {
    transformPerspective: 1000,
    transformOrigin: "center",
  });
  const tiltX = gsap.quickTo(imageWrap, "rotateX", {
    duration: 0.5,
    ease: "power2.out",
  });
  const tiltY = gsap.quickTo(imageWrap, "rotateY", {
    duration: 0.5,
    ease: "power2.out",
  });

  let rect = null;
  let rectStamp = -1;

  project.addEventListener(
    "mousemove",
    (e) => {
      /* only re-measure after a scroll / resize, not on every mouse event */
      if (!rect || rectStamp !== layoutStamp) {
        rect = imageWrap.getBoundingClientRect();
        rectStamp = layoutStamp;
      }
      tiltY(((e.clientX - rect.left) / rect.width - 0.5) * 8);
      tiltX(((e.clientY - rect.top) / rect.height - 0.5) * -8);
    },
    { passive: true },
  );
  project.addEventListener("mouseleave", () => {
    rect = null;
    tiltX(0);
    tiltY(0);
  });
});

/* ── Stagger Tags + Project Link ── */
// This block is the sole owner of .project-tags and .project-link animation.
// clearProps:"all" ensures opacity/transform inline styles are cleaned up
// after the tween so nothing stays invisible if ScrollTrigger mis-fires.

document.querySelectorAll(".project-link").forEach((link) => {
  gsap.from(link, {
    opacity: 0,
    y: 10,
    duration: 0.4,
    ease: "power2.out",
    clearProps: "all",
    scrollTrigger: {
      trigger: link,
      start: "top 90%",
    },
  });
});

/* ── Mobile Menu ── */
const menuToggle = document.getElementById("menu-toggle");
const mobileClose = document.getElementById("mobile-close");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    document.body.classList.toggle("menu-open");
  });
}

if (mobileClose) {
  mobileClose.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
  });
}

document.querySelectorAll(".mobile-nav-list a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
  });
});

window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});
