import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";
import Lenis from "https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.mjs";
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import ScrollTrigger from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";
gsap.registerPlugin(ScrollTrigger);

window.addEventListener("pageshow", (e) => {
  if (e.persisted) window.location.reload();
});

const lenis = new Lenis({
  duration: 1.6,
  easing: (t) => 1 - Math.pow(1 - t, 4),
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

const revealObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        revealObs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 },
);
document
  .querySelectorAll("[data-reveal]")
  .forEach((el) => revealObs.observe(el));

/* CURSOR */
const curEl = document.getElementById("cursor");
if (curEl) {
  const cd = curEl.querySelector(".c-dot"),
    cr = curEl.querySelector(".c-ring");
  let rx = 0,
    ry = 0,
    dx = 0,
    dy = 0;
  document.addEventListener("mousemove", (e) => {
    dx = e.clientX;
    dy = e.clientY;
  });
  document.querySelectorAll(".channel,.social-link").forEach((el) => {
    el.addEventListener("mouseenter", () =>
      document.body.classList.add("cursor-hover"),
    );
    el.addEventListener("mouseleave", () =>
      document.body.classList.remove("cursor-hover"),
    );
  });
  (function ct() {
    rx += (dx - rx) * 0.1;
    ry += (dy - ry) * 0.1;
    cd.style.left = dx + "px";
    cd.style.top = dy + "px";
    cr.style.left = rx + "px";
    cr.style.top = ry + "px";
    requestAnimationFrame(ct);
  })();
}

/* FORM */
document.getElementById("cform").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector(".form-submit");
  const msg = document.getElementById("form-msg");
  btn.style.opacity = ".5";
  btn.style.pointerEvents = "none";
  await new Promise((r) => setTimeout(r, 1200));
  msg.style.display = "block";
  msg.textContent = "✓  Message sent — I'll be in touch within 24 hours.";
  btn.style.opacity = "1";
  btn.style.pointerEvents = "auto";
  e.target.reset();
});

/* REVEAL HERO TEXT */
document.querySelectorAll(".page-title .chline span").forEach((s, i) => {
  setTimeout(() => {
    s.style.transition = "transform 1.3s cubic-bezier(.16,1,.3,1)";
    s.style.transform = "translateY(0)";
  }, i * 140);
});
document
  .querySelectorAll(".chero-eyebrow span, .chero-sub span")
  .forEach((s) => {
    s.style.transition = "transform 1s cubic-bezier(.16,1,.3,1)";
    s.style.transform = "translateY(0)";
  });

/* ── THREE.JS PHYSICS HERO ── */
const heroEl = document.getElementById("chero");
const canvas = document.getElementById("contact-canvas");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(heroEl.offsetWidth, heroEl.offsetHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  heroEl.offsetWidth / heroEl.offsetHeight,
  0.1,
  200,
);
camera.position.set(0, 0, 28);

/* Lighting */
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xece9e3, 1.2);
dirLight.position.set(5, 10, 8);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x8888aa, 0.4);
fillLight.position.set(-8, -4, 4);
scene.add(fillLight);

/* Particle config */
const PARTICLE_COUNT = 90;
const BOUNDS = 18;
const particles = [];

const matWhite = new THREE.MeshStandardMaterial({
  color: 0xece9e3,
  roughness: 0.35,
  metalness: 0.1,
});
const matDim = new THREE.MeshStandardMaterial({
  color: 0x3a3a3a,
  roughness: 0.6,
  metalness: 0.05,
});
const matAccent = new THREE.MeshStandardMaterial({
  color: 0x888880,
  roughness: 0.4,
  metalness: 0.2,
});

const geoSphere = new THREE.SphereGeometry(1, 16, 12);
const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoTorus = new THREE.TorusGeometry(0.6, 0.22, 10, 24);
const geos = [geoSphere, geoBox, geoTorus];
const mats = [matWhite, matDim, matAccent];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const geo = geos[Math.floor(Math.random() * geos.length)];
  const mat = mats[Math.floor(Math.random() * mats.length)];
  const mesh = new THREE.Mesh(geo, mat);

  const scale = 0.12 + Math.random() * 0.55;
  mesh.scale.setScalar(scale);

  mesh.position.set(
    (Math.random() - 0.5) * BOUNDS * 2,
    (Math.random() - 0.5) * BOUNDS * 1.4,
    (Math.random() - 0.5) * 12,
  );

  mesh.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  );

  mesh.userData = {
    vx: (Math.random() - 0.5) * 0.022,
    vy: (Math.random() - 0.5) * 0.018,
    vz: (Math.random() - 0.5) * 0.008,
    rx: (Math.random() - 0.5) * 0.012,
    ry: (Math.random() - 0.5) * 0.014,
    rz: (Math.random() - 0.5) * 0.01,
    mass: scale,
  };

  scene.add(mesh);
  particles.push(mesh);
}

/* Mouse repulsion */
const mouse = new THREE.Vector2(9999, 9999);
const mouseWorld = new THREE.Vector3();
window.addEventListener("mousemove", (e) => {
  const rect = heroEl.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  mouseWorld.set(mouse.x * 18, mouse.y * 10, 0);
});

/* Resize */
window.addEventListener("resize", () => {
  camera.aspect = heroEl.offsetWidth / heroEl.offsetHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(heroEl.offsetWidth, heroEl.offsetHeight);
});

/* Collision resolution */
function resolveCollisions() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i],
        b = particles[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dz = b.position.z - a.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = (a.scale.x + b.scale.x) * 0.9;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist,
          ny = dy / dist,
          nz = dz / dist;
        const relVx = a.userData.vx - b.userData.vx;
        const relVy = a.userData.vy - b.userData.vy;
        const relVz = a.userData.vz - b.userData.vz;
        const dot = relVx * nx + relVy * ny + relVz * nz;
        if (dot > 0) {
          const restitution = 0.55;
          const impulse =
            (-(1 + restitution) * dot) /
            (1 / a.userData.mass + 1 / b.userData.mass);
          const im_a = impulse / a.userData.mass;
          const im_b = impulse / b.userData.mass;
          a.userData.vx += im_a * nx;
          a.userData.vy += im_a * ny;
          a.userData.vz += im_a * nz;
          b.userData.vx -= im_b * nx;
          b.userData.vy -= im_b * ny;
          b.userData.vz -= im_b * nz;
        }
        const overlap = (minDist - dist) * 0.5;
        a.position.x -= nx * overlap;
        a.position.y -= ny * overlap;
        b.position.x += nx * overlap;
        b.position.y += ny * overlap;
      }
    }
  }
}

/* Main loop */
const DAMPING = 0.992;
const MOUSE_REPEL = 38;
const MOUSE_RADIUS = 5.5;

renderer.setAnimationLoop(() => {
  for (const p of particles) {
    const u = p.userData;

    /* Mouse repulsion */
    const dx = p.position.x - mouseWorld.x;
    const dy = p.position.y - mouseWorld.y;
    const distM = Math.sqrt(dx * dx + dy * dy);
    if (distM < MOUSE_RADIUS && distM > 0.01) {
      const force = (MOUSE_REPEL / (distM * distM)) * 0.001;
      u.vx += (dx / distM) * force;
      u.vy += (dy / distM) * force;
    }

    /* Integrate */
    p.position.x += u.vx;
    p.position.y += u.vy;
    p.position.z += u.vz;
    p.rotation.x += u.rx;
    p.rotation.y += u.ry;
    p.rotation.z += u.rz;

    /* Damping */
    u.vx *= DAMPING;
    u.vy *= DAMPING;
    u.vz *= DAMPING;

    /* Boundary bounce */
    const BX = BOUNDS + 2,
      BY = BOUNDS * 0.8;
    if (p.position.x > BX) {
      p.position.x = BX;
      u.vx *= -0.6;
    }
    if (p.position.x < -BX) {
      p.position.x = -BX;
      u.vx *= -0.6;
    }
    if (p.position.y > BY) {
      p.position.y = BY;
      u.vy *= -0.6;
    }
    if (p.position.y < -BY) {
      p.position.y = -BY;
      u.vy *= -0.6;
    }
    if (p.position.z > 8) {
      p.position.z = 8;
      u.vz *= -0.6;
    }
    if (p.position.z < -8) {
      p.position.z = -8;
      u.vz *= -0.6;
    }
  }

  resolveCollisions();
  renderer.render(scene, camera);
});

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
