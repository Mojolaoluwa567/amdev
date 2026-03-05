/* =============================================
   A.M — Portfolio · script.js
   ============================================= */

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

/* Parallax hero content on scroll */
lenis.on("scroll", ({ scroll }) => {
  const vh = window.innerHeight;
  if (scroll < vh) {
    const t = scroll / vh;

    const heroName = document.querySelector(".hero-name");
    if (heroName) {
      heroName.style.transform = `translateY(${t * 70}px)`;
      heroName.style.opacity = String(Math.max(0, 1 - t * 1.3));
    }

    const heroEyebrow = document.querySelector(".hero-eyebrow");
    if (heroEyebrow) {
      heroEyebrow.style.opacity = String(Math.max(0, 1 - t * 2));
    }

    const heroMeta = document.querySelector(".hero-meta");
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
   THREE.JS — HERO SCENE
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
  100,
);
camera.position.set(0, 0, 7);

/* Background grid */
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

/* Main wireframe cube */
const mainBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 2.4, 2.4)),
  new THREE.LineBasicMaterial({
    color: 0xece9e3,
    opacity: 0.92,
    transparent: true,
  }),
);
scene.add(mainBox);

/* Inner wireframe cube */
const innerBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 1.2, 1.2)),
  new THREE.LineBasicMaterial({
    color: 0xece9e3,
    opacity: 0.15,
    transparent: true,
  }),
);
scene.add(innerBox);

/* Orbit rings */
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
      opacity: 0.05,
      transparent: true,
    }),
  );
}

const r1 = mkRing(3.2, "x");
const r2 = mkRing(3.8, "y");
const r3 = mkRing(2.9, "z");
scene.add(r1, r2, r3);

/* Floating particles */
const pN = 130;
const pPos = new Float32Array(pN * 3);
const pVel = [];

for (let i = 0; i < pN; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 18;
  pPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
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
    opacity: 0.3,
    transparent: true,
  }),
);
scene.add(pMesh);

/* Mouse tracking */
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

/* Animation loop */
(function animate() {
  requestAnimationFrame(animate);

  /* Smooth mouse */
  currentMX += (targetMX - currentMX) * 0.055;
  currentMY += (targetMY - currentMY) * 0.055;
  hoverSpeed += (targetHoverSpeed - hoverSpeed) * 0.04;

  /* Box rotation — reacts to mouse */
  mainBox.rotation.y += 0.004 * hoverSpeed;
  mainBox.rotation.x = currentMY * 0.28;
  mainBox.rotation.z = currentMX * 0.14;

  innerBox.rotation.x -= 0.007 * hoverSpeed;
  innerBox.rotation.y += 0.009 * hoverSpeed;

  /* Rings */
  r1.rotation.z += 0.0028 * hoverSpeed;
  r2.rotation.y += 0.0045 * hoverSpeed;
  r3.rotation.x += 0.0035 * hoverSpeed;

  /* Particles — drift + mouse repulsion */
  const pos = pGeo.attributes.position.array;
  for (let i = 0; i < pN; i++) {
    pos[i * 3] += pVel[i].x;
    pos[i * 3 + 1] += pVel[i].y;
    pos[i * 3 + 2] += pVel[i].z;

    /* Bounce off boundaries */
    if (Math.abs(pos[i * 3]) > 9) pVel[i].x *= -1;
    if (Math.abs(pos[i * 3 + 1]) > 9) pVel[i].y *= -1;
    if (Math.abs(pos[i * 3 + 2]) > 4) pVel[i].z *= -1;

    /* Mouse repulsion */
    const dx = pos[i * 3] - currentMX * 5;
    const dy = pos[i * 3 + 1] - currentMY * 3.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 3) {
      const force = ((3 - d) / 3) * 0.01 * hoverSpeed;
      pos[i * 3] += (dx / d) * force;
      pos[i * 3 + 1] += (dy / d) * force;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
  pMesh.rotation.y += 0.0004;

  /* Camera parallax */
  camera.position.x += (currentMX * 0.55 - camera.position.x) * 0.045;
  camera.position.y += (currentMY * 0.38 - camera.position.y) * 0.045;
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
  ringY = 0;
let dotX = 0,
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

/**
 * Helper: apply CSS transition properties and values after an optional delay.
 * @param {HTMLElement} el
 * @param {Object} props - CSS properties as camelCase keys
 * @param {number} dur   - transition duration in ms
 * @param {number} delay - setTimeout delay in ms
 */
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

/* 1. Thin rule slides out from centre */
tr(introRule, { width: "50px" }, 900, 150);

/* 2. Letters rise — small, italic, graceful */
tr(letterA, { opacity: "1", transform: "translateY(0)" }, 1000, 700);
tr(letterDot, { opacity: "1", transform: "translateY(0)" }, 1000, 870);
tr(letterM, { opacity: "1", transform: "translateY(0)" }, 1000, 1010);

/* 3. Tagline brightens softly */
setTimeout(() => {
  introSub.style.transition = "color 1.2s ease";
  introSub.style.color = "rgba(236,233,227,0.16)";
}, 1500);

/* 4. Rule widens to full width */
tr(introRule, { width: "100vw" }, 900, 1900);

/* 5. Letters dissolve upward */
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

/* 6. Wipe panel rolls up to reveal main */
setTimeout(() => {
  introWipe.style.transition = "transform 1.1s cubic-bezier(.76,0,.24,1)";
  introWipe.style.transform = "scaleY(0)";
}, 2800);

/* 7. Show main content + animate hero text in */
setTimeout(() => {
  introEl.style.display = "none";

  const mainEl = document.getElementById("main");
  mainEl.style.transition = "opacity .7s ease";
  mainEl.style.opacity = "1";

  const headerEl = document.getElementById("site-header");
  headerEl.style.transition = "opacity .9s ease";
  headerEl.style.opacity = "1";

  /* Hero name lines slide up */
  document.querySelectorAll(".hero-name .hline span").forEach((s, i) => {
    setTimeout(() => {
      s.style.transition = "transform 1.3s cubic-bezier(.16,1,.3,1)";
      s.style.transform = "translateY(0)";
    }, i * 140);
  });

  /* Hero eyebrow slides up */
  document.querySelectorAll(".hero-eyebrow span").forEach((s) => {
    s.style.transition = "transform 1s cubic-bezier(.16,1,.3,1)";
    s.style.transform = "translateY(0)";
  });

  /* Meta items slide up with stagger */
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
