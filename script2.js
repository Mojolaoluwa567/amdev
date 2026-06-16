/* =============================================
   A.M — Portfolio · script.js
   ============================================= */

window.addEventListener("pageshow", (e) => {
  if (e.persisted) window.location.reload();
});

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";

/* ─────────────────────────────────────────────
   LENIS SMOOTH SCROLL
───────────────────────────────────────────── */
const lenis = new Lenis({
  duration: 1.6,
  easing: (t) => 1 - Math.pow(1 - t, 4),
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

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

    if (heroEyebrow) {
      heroEyebrow.style.opacity = String(Math.max(0, 1 - t * 2));
    }

    if (heroMeta) {
      heroMeta.style.opacity = String(Math.max(0, 1 - t * 2.2));
    }
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
  opacity: 0.025,
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
scene.add(mainBox);
mainBox.position.x = -0.15;

/* ── INNER CUBE ── */
const innerBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 1.2, 1.2)),
  new THREE.LineBasicMaterial({
    color: 0xece9e3,
    opacity: 0.6,
    transparent: true,
  }),
);
scene.add(innerBox);
innerBox.position.x = -0.15;

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
      opacity: 0.5,
      transparent: true,
    }),
  );
}

const r1 = mkRing(3.2, "x");
const r2 = mkRing(3.8, "y");
const r3 = mkRing(2.9, "z");
scene.add(r1, r2, r3);

/* ── SECOND RING SET (expands in on scroll) ── */
const r4 = mkRing(6.0, "x");
const r5 = mkRing(7.2, "y");
const r6 = mkRing(5.5, "z");
r4.material.opacity = 0.5;
r5.material.opacity = 0.5;
r6.material.opacity = 0.5;
scene.add(r4, r5, r6);

/* ── PARTICLES ── */
const pN = 100;
const pPos = new Float32Array(pN * 3);
const pVel = [];
const pBasePos = new Float32Array(pN * 3); // store originals for lerp

for (let i = 0; i < pN; i++) {
  const x = (Math.random() - 0.5) * 18;
  const y = (Math.random() - 0.5) * 18;
  const z = (Math.random() - 0.5) * 8;
  pPos[i * 3] = x;
  pPos[i * 3 + 1] = y;
  pPos[i * 3 + 2] = z;
  pBasePos[i * 3] = x;
  pBasePos[i * 3 + 1] = y;
  pBasePos[i * 3 + 2] = z;
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
    opacity: 0.7,
    transparent: true,
  }),
);
scene.add(pMesh);

/* ── MOUSE TRACKING ── */
let targetMX = 0,
  targetMY = 0;
let currentMX = 0,
  currentMY = 0;
let hoverSpeed = 1,
  targetHoverSpeed = 1;

window.addEventListener("mousemove", (e) => {
  targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetMY = -(e.clientY / window.innerHeight - 0.5) * 2;
});

const heroSection = document.getElementById("hero");
heroSection.addEventListener("mouseenter", () => (targetHoverSpeed = 2.6));
heroSection.addEventListener("mouseleave", () => (targetHoverSpeed = 1));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─────────────────────────────────────────────
   SCENE PHASES — driven by scrollProgress
   0.00–0.15  Phase 0: Hero        — cube tight, rings close, particles calm
   0.15–0.40  Phase 1: About       — cube scales up, rings spread, camera pulls back
   0.40–0.70  Phase 2: Works       — cube fragmented feel, outer rings appear, particles scatter
   0.70–1.00  Phase 3: Contact     — cube dissolves opacity, rings dominate, particles sparse
───────────────────────────────────────────── */
function getPhaseValues(p) {
  // p = scrollProgress 0→1
  // Returns interpolated target values for all scene properties

  // Phase boundaries
  const p0End = 0.15,
    p1End = 0.4,
    p2End = 0.7;

  let cubeScale,
    cubeOpacity,
    innerOpacity,
    ringOpacity,
    outerRingOpacity,
    particleSpread,
    particleOpacity,
    camZ,
    gridOpacity,
    rotationMult;

  if (p < p0End) {
    const t = p / p0End;
    cubeScale = lerp(1.0, 1.15, t);
    cubeOpacity = lerp(0.92, 0.8, t);
    innerOpacity = lerp(0.15, 0.22, t);
    ringOpacity = lerp(0.05, 0.09, t);
    outerRingOpacity = lerp(0.0, 0.01, t);
    particleSpread = lerp(1.0, 1.1, t);
    particleOpacity = lerp(0.3, 0.28, t);
    camZ = lerp(7.0, 8.0, t);
    gridOpacity = lerp(0.025, 0.02, t);
    rotationMult = lerp(1.0, 1.2, t);
  } else if (p < p1End) {
    const t = (p - p0End) / (p1End - p0End);
    cubeScale = lerp(1.15, 1.5, t);
    cubeOpacity = lerp(0.8, 0.55, t);
    innerOpacity = lerp(0.22, 0.45, t);
    ringOpacity = lerp(0.09, 0.14, t);
    outerRingOpacity = lerp(0.01, 0.04, t);
    particleSpread = lerp(1.1, 1.5, t);
    particleOpacity = lerp(0.28, 0.22, t);
    camZ = lerp(8.0, 11.0, t);
    gridOpacity = lerp(0.02, 0.015, t);
    rotationMult = lerp(1.2, 0.7, t);
  } else if (p < p2End) {
    const t = (p - p1End) / (p2End - p1End);
    cubeScale = lerp(1.5, 2.2, t);
    cubeOpacity = lerp(0.55, 0.25, t);
    innerOpacity = lerp(0.45, 0.6, t);
    ringOpacity = lerp(0.14, 0.06, t);
    outerRingOpacity = lerp(0.04, 0.1, t);
    particleSpread = lerp(1.5, 2.5, t);
    particleOpacity = lerp(0.22, 0.12, t);
    camZ = lerp(11.0, 16.0, t);
    gridOpacity = lerp(0.015, 0.008, t);
    rotationMult = lerp(0.7, 0.35, t);
  } else {
    const t = (p - p2End) / (1.0 - p2End);
    cubeScale = lerp(2.2, 3.2, t);
    cubeOpacity = lerp(0.25, 0.06, t);
    innerOpacity = lerp(0.6, 0.8, t);
    ringOpacity = lerp(0.06, 0.02, t);
    outerRingOpacity = lerp(0.1, 0.18, t);
    particleSpread = lerp(2.5, 4.0, t);
    particleOpacity = lerp(0.12, 0.05, t);
    camZ = lerp(16.0, 22.0, t);
    gridOpacity = lerp(0.008, 0.003, t);
    rotationMult = lerp(0.35, 0.15, t);
  }

  return {
    cubeScale,
    cubeOpacity,
    innerOpacity,
    ringOpacity,
    outerRingOpacity,
    particleSpread,
    particleOpacity,
    camZ,
    gridOpacity,
    rotationMult,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/* ─────────────────────────────────────────────
   SMOOTH SCENE STATE (eased toward targets)
───────────────────────────────────────────── */
let state = {
  cubeScale: 1.0,
  cubeOpacity: 0.92,
  innerOpacity: 0.15,
  ringOpacity: 0.05,
  outerRingOpacity: 0.0,
  particleSpread: 1.0,
  particleOpacity: 0.3,
  camZ: 7.0,
  gridOpacity: 0.025,
  rotationMult: 1.0,
};
