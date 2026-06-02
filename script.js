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
  smooth: true,
  smoothTouch: false,
});

(function raf(t) {
  lenis.raf(t);
  requestAnimationFrame(raf);
})(0);

/* ─────────────────────────────────────────────
   SCROLL PROGRESS — drives the entire scene
───────────────────────────────────────────── */
let scrollProgress = 0; // 0 = hero top, 1 = contact bottom

lenis.on("scroll", ({ scroll }) => {
  const totalHeight = document.body.scrollHeight - window.innerHeight;
  scrollProgress = totalHeight > 0 ? scroll / totalHeight : 0;

  /* Parallax hero content */
  const vh = window.innerHeight;
  if (scroll < vh) {
    const t = scroll / vh;

    const heroName = document.querySelector(".hero-name");
    if (heroName) {
      heroName.style.transform = `translateY(${t * 70}px)`;
      heroName.style.opacity = String(Math.max(0, 1 - t * 1.3));
    }
    const heroEyebrow = document.querySelector(".hero-eyebrow");
    if (heroEyebrow) heroEyebrow.style.opacity = String(Math.max(0, 1 - t * 2));
    const heroMeta = document.querySelector(".hero-meta");
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
    opacity: 0.3,
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
const pN = 180;
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

/* ─────────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────────── */
(function animate() {
  requestAnimationFrame(animate);

  /* ── Mouse smoothing ── */
  currentMX += (targetMX - currentMX) * 0.055;
  currentMY += (targetMY - currentMY) * 0.055;
  hoverSpeed += (targetHoverSpeed - hoverSpeed) * 0.04;

  /* ── Get target phase values ── */
  const target = getPhaseValues(scrollProgress);

  /* ── Ease current state toward targets ── */
  const e = 0.035; // easing factor — lower = smoother/slower
  for (const key in state) {
    state[key] += (target[key] - state[key]) * e;
  }

  /* ── Apply cube ── */
  mainBox.scale.setScalar(state.cubeScale);
  mainBox.material.opacity = state.cubeOpacity;
  innerBox.material.opacity = state.innerOpacity;
  innerBox.scale.setScalar(state.cubeScale * 0.88);

  /* ── Apply rings ── */
  r1.material.opacity = state.ringOpacity;
  r2.material.opacity = state.ringOpacity * 1.1;
  r3.material.opacity = state.ringOpacity * 0.9;
  r4.material.opacity = state.outerRingOpacity;
  r5.material.opacity = state.outerRingOpacity * 1.15;
  r6.material.opacity = state.outerRingOpacity * 0.9;

  /* ── Scale outer rings slightly with progress ── */
  const outerScale = 1 + scrollProgress * 0.5;
  r4.scale.setScalar(outerScale);
  r5.scale.setScalar(outerScale * 1.05);
  r6.scale.setScalar(outerScale * 0.95);

  /* ── Apply grid ── */
  gridMat.opacity = state.gridOpacity;

  /* ── Rotation ── */
  const rm = state.rotationMult * hoverSpeed;
  mainBox.rotation.y += 0.004 * rm;
  mainBox.rotation.x =
    currentMY * 0.28 * (1 / Math.max(1, state.cubeScale * 0.6));
  mainBox.rotation.z =
    currentMX * 0.14 * (1 / Math.max(1, state.cubeScale * 0.6));

  innerBox.rotation.x -= 0.007 * rm;
  innerBox.rotation.y += 0.009 * rm;

  r1.rotation.z += 0.0028 * rm;
  r2.rotation.y += 0.0045 * rm;
  r3.rotation.x += 0.0035 * rm;
  r4.rotation.z -= 0.0018 * rm;
  r5.rotation.y -= 0.0022 * rm;
  r6.rotation.x -= 0.0015 * rm;

  /* ── Particles ── */
  pMesh.material.opacity = state.particleOpacity;
  const spread = state.particleSpread;
  const pos = pGeo.attributes.position.array;

  for (let i = 0; i < pN; i++) {
    pos[i * 3] += pVel[i].x;
    pos[i * 3 + 1] += pVel[i].y;
    pos[i * 3 + 2] += pVel[i].z;

    /* Soft boundary — expands with scroll spread */
    const bx = 9 * spread,
      by = 9 * spread,
      bz = 4 * spread;
    if (Math.abs(pos[i * 3]) > bx) pVel[i].x *= -1;
    if (Math.abs(pos[i * 3 + 1]) > by) pVel[i].y *= -1;
    if (Math.abs(pos[i * 3 + 2]) > bz) pVel[i].z *= -1;

    /* Mouse repulsion (diminishes as scene expands) */
    const repulseStrength = Math.max(0, 1 - scrollProgress * 1.4);
    const dx = pos[i * 3] - currentMX * 5;
    const dy = pos[i * 3 + 1] - currentMY * 3.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 3 && repulseStrength > 0) {
      const force = ((3 - d) / 3) * 0.01 * hoverSpeed * repulseStrength;
      pos[i * 3] += (dx / d) * force;
      pos[i * 3 + 1] += (dy / d) * force;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
  pMesh.rotation.y += 0.0004 * (1 + scrollProgress * 0.5);

  /* ── Camera ── */
  const targetCamZ = state.camZ;
  camera.position.z += (targetCamZ - camera.position.z) * 0.04;
  camera.position.x +=
    (currentMX * 0.55 * (7 / Math.max(7, state.camZ)) - camera.position.x) *
    0.045;
  camera.position.y +=
    (currentMY * 0.38 * (7 / Math.max(7, state.camZ)) - camera.position.y) *
    0.045;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
})();

/* ─────────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────────── */
const cursorEl = document.getElementById("cursor");
const cDot = cursorEl.querySelector(".c-dot");
const cRing = cursorEl.querySelector(".c-ring");

let ringX = 0,
  ringY = 0,
  dotX = 0,
  dotY = 0;

document.addEventListener("mousemove", (e) => {
  dotX = e.clientX;
  dotY = e.clientY;
});

(function cursorTick() {
  ringX += (dotX - ringX) * 0.1;
  ringY += (dotY - ringY) * 0.1;
  cDot.style.left = dotX + "px";
  cDot.style.top = dotY + "px";
  cRing.style.left = ringX + "px";
  cRing.style.top = ringY + "px";
  requestAnimationFrame(cursorTick);
})();

document.querySelectorAll("a, button, .proj-card").forEach((el) => {
  el.addEventListener("mouseenter", () =>
    document.body.classList.add("cursor-hover"),
  );
  el.addEventListener("mouseleave", () =>
    document.body.classList.remove("cursor-hover"),
  );
});

/* ─────────────────────────────────────────────
   INTRO ANIMATION
───────────────────────────────────────────── */
const introEl = document.getElementById("intro");
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

  const mainEl = document.getElementById("main");
  mainEl.style.transition = "opacity .7s ease";
  mainEl.style.opacity = "1";

  const headerEl = document.getElementById("site-header");
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

/* ─────────────────────────────────────────────
   GSAP
───────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

/* ── Reveal Projects ── */
const projects = document.querySelectorAll(".project");

projects.forEach((project) => {
  const content = project.querySelector(".project-main");
  const number = project.querySelector(".project-number");
  const bgNum = project.querySelector(".project-bg-num");

  const tl = gsap.timeline({
    scrollTrigger: { trigger: project, start: "top 75%", once: true },
  });

  tl.add(() => project.classList.add("revealed"));
  tl.from(number, { y: 60, opacity: 0, duration: 0.8, ease: "power3.out" }, 0);
  tl.from(
    content.children,
    { y: 80, opacity: 0, stagger: 0.12, duration: 1, ease: "power4.out" },
    0.15,
  );
  tl.from(
    bgNum,
    { scale: 0.7, opacity: 0, duration: 1.4, ease: "power4.out" },
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
projects.forEach((project) => {
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

/* ── Magnetic Buttons ── */
document.querySelectorAll(".project-link").forEach((link) => {
  link.addEventListener("mousemove", (e) => {
    const rect = link.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(link, {
      x: x * 0.25,
      y: y * 0.25,
      duration: 0.4,
      ease: "power3.out",
    });
  });
  link.addEventListener("mouseleave", () => {
    gsap.to(link, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
  });
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
projects.forEach((project) => {
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

/* ── Stagger Tags ── */
document.querySelectorAll(".project-tags").forEach((tags) => {
  gsap.from(tags.children, {
    opacity: 0,
    y: 30,
    stagger: 0.08,
    duration: 0.8,
    ease: "power3.out",
    scrollTrigger: { trigger: tags, start: "top 90%" },
  });
});
