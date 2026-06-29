/* =============================================
   A.M — Portfolio · script.js
   ============================================= */

window.addEventListener("pageshow", (e) => {
  if (e.persisted) window.location.reload();
});

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";
import Lenis from "https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.mjs";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import ScrollTrigger from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   LENIS SMOOTH SCROLL  (registered once)
───────────────────────────────────────────── */
const lenis = new Lenis({
  duration: 1.6,
  easing: (t) => 1 - Math.pow(1 - t, 4),
});

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ─────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;

/* ─────────────────────────────────────────────
   SCROLL PROGRESS — drives the entire scene
───────────────────────────────────────────── */
const heroName = document.querySelector(".hero-name");
const heroEyebrow = document.querySelector(".hero-eyebrow");
const heroMeta = document.querySelector(".hero-meta");

let scrollProgress = 0;

lenis.on("scroll", ({ scroll }) => {
  const totalHeight = document.body.scrollHeight - window.innerHeight;
  scrollProgress = totalHeight > 0 ? scroll / totalHeight : 0;

  const vh = window.innerHeight;
  if (scroll < vh) {
    const t = scroll / vh;
    if (heroName) {
      heroName.style.transform = `translateY(${t * 70}px)`;
      heroName.style.opacity = String(Math.max(0, 1 - t * 1.3));
    }
    if (heroEyebrow) heroEyebrow.style.opacity = String(Math.max(0, 1 - t * 2));
    if (heroMeta) heroMeta.style.opacity = String(Math.max(0, 1 - t * 2.2));
  }
});

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
  { threshold: 0.1 },
);
document
  .querySelectorAll("[data-reveal]")
  .forEach((el) => revealObserver.observe(el));

/* Dark cursor when over the white Works section */
new IntersectionObserver(
  (entries) => {
    entries.forEach((e) =>
      document.body.classList.toggle("cursor-dark", e.isIntersecting),
    );
  },
  { threshold: 0.2 },
).observe(document.getElementById("works"));

/* ─────────────────────────────────────────────
   THREE.JS — PERSISTENT FULL-PAGE SCENE
───────────────────────────────────────────── */
const canvas = document.getElementById("hero-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

/* ── BACKGROUND GRID ── */
const gridMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  opacity: 1,
  transparent: true,
});
for (let i = -22; i <= 22; i += 1.8) {
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-22, i, -4),
        new THREE.Vector3(22, i, -4),
      ]),
      gridMat,
    ),
  );
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, -22, -4),
        new THREE.Vector3(i, 22, -4),
      ]),
      gridMat,
    ),
  );
}

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

window.addEventListener("mousemove", (e) => {
  targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetMY = -(e.clientY / window.innerHeight - 0.5) * 2;
});

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
   SMOOTH SCENE STATE
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

/* ─────────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────────── */
(function animate() {
  requestAnimationFrame(animate);

  currentMX += (targetMX - currentMX) * 0.12;
  currentMY += (targetMY - currentMY) * 0.12;
  hoverSpeed += (targetHoverSpeed - hoverSpeed) * 0.04;

  mainBox.position.x = currentMX * 0.6;
  mainBox.position.y = currentMY * 0.35;
  innerBox.position.x = currentMX * 0.4;
  innerBox.position.y = currentMY * 0.25;

  const target = getPhaseValues(scrollProgress);
  const e = 0.035;
  for (const key in state) {
    if (target[key] !== undefined) {
      state[key] += (target[key] - state[key]) * e;
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

    const repulseStrength = Math.max(0, 1 - scrollProgress * 1.4);
    const dx = pos[i * 3] - currentMX * 5;
    const dy = pos[i * 3 + 1] - currentMY * 3.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.001 && d < 3 && repulseStrength > 0) {
      const force = ((3 - d) / 3) * 0.08 * hoverSpeed * repulseStrength;
      pos[i * 3] += (dx / d) * force;
      pos[i * 3 + 1] += (dy / d) * force;
    }
  }

  pGeo.attributes.position.needsUpdate = true;
  pMesh.rotation.y += 0.0004 * (1 + scrollProgress * 0.5);

  camera.position.z += (state.camZ - camera.position.z) * 0.04;
  camera.position.x +=
    (currentMX * 2.55 * (7 / Math.max(7, state.camZ)) - camera.position.x) *
    0.045;
  camera.position.y +=
    (currentMY * 1.8 * (7 / Math.max(7, state.camZ)) - camera.position.y) *
    0.045;
  camera.lookAt(0, 0, 0);

  scene.rotation.y = currentMX * 0.12;
  scene.rotation.x = currentMY * 0.08;

  renderer.render(scene, camera);
})();

/* ─────────────────────────────────────────────
   CUSTOM CURSOR + VIEW SERVICES
───────────────────────────────────────────── */
const cursorEl = document.getElementById("cursor");

if (cursorEl) {
  const cDot = cursorEl.querySelector(".c-dot");
  const cRing = cursorEl.querySelector(".c-ring");
  const cText = cursorEl.querySelector(".c-text");

  let mouseX = 0;
  let mouseY = 0;
  let ringX = 0;
  let ringY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function cursorTick() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;

    cDot.style.left = `${mouseX}px`;
    cDot.style.top = `${mouseY}px`;

    cRing.style.left = `${ringX}px`;
    cRing.style.top = `${ringY}px`;

    requestAnimationFrame(cursorTick);
  }

  cursorTick();

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
      start: "top 80%",
      onEnter: () => project.classList.add("revealed"),
    },
  });

  if (number)
    tl.from(
      number,
      {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        clearProps: "all",
      },
      0,
    );
  if (title)
    tl.from(
      title,
      {
        y: 60,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        clearProps: "all",
      },
      0.1,
    );
  if (desc)
    tl.from(
      desc,
      {
        y: 60,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        clearProps: "all",
      },
      0.2,
    );
  if (bgNum)
    tl.from(
      bgNum,
      {
        scale: 0.7,
        opacity: 0,
        duration: 1.4,
        ease: "power4.out",
        clearProps: "all",
      },
      0,
    );
});

/* ── Parallax Images ── */
document.querySelectorAll(".project-image img").forEach((img) => {
  gsap.to(img, {
    yPercent: -15,
    ease: "none",
    scrollTrigger: {
      trigger: img.parentElement,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
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

/* ── Image Tilt ── */
document.querySelectorAll(".project").forEach((project) => {
  const imageWrap = project.querySelector(".project-image");
  project.addEventListener("mousemove", (e) => {
    const rect = imageWrap.getBoundingClientRect();
    const rotateY = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const rotateX = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    gsap.to(imageWrap, {
      rotateX,
      rotateY,
      transformPerspective: 1000,
      transformOrigin: "center",
      duration: 0.5,
      ease: "power2.out",
    });
  });
  project.addEventListener("mouseleave", () => {
    gsap.to(imageWrap, {
      rotateX: 0,
      rotateY: 0,
      duration: 1,
      ease: "power4.out",
    });
  });
});

/* ── Stagger Tags + Project Link ── */
// This block is the sole owner of .project-tags and .project-link animation.
// clearProps:"all" ensures opacity/transform inline styles are cleaned up
// after the tween so nothing stays invisible if ScrollTrigger mis-fires.
document.querySelectorAll(".project-tags").forEach((tags) => {
  gsap.from(tags.children, {
    opacity: 0,
    y: 30,
    stagger: 0.08,
    duration: 0.1,
    ease: "power3.out",
    clearProps: "all",
    scrollTrigger: { trigger: tags, start: "top 90%" },
  });
});

document.querySelectorAll(".project-link").forEach((link) => {
  gsap.from(link, {
    opacity: 0,
    y: 20,
    duration: 0.8,
    ease: "power3.out",
    clearProps: "all",
    scrollTrigger: { trigger: link, start: "top 95%" },
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
