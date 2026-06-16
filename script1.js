/* ─────────────────────────────────────────────
   ANIMATION LOOP
───────────────────────────────────────────── */
(function animate() {
  requestAnimationFrame(animate);

  /* ── Mouse smoothing ── */
  currentMX += (targetMX - currentMX) * 0.12;
  currentMY += (targetMY - currentMY) * 0.12;
  hoverSpeed += (targetHoverSpeed - hoverSpeed) * 0.04;

  mainBox.position.x = currentMX * 0.6;
  mainBox.position.y = currentMY * 0.35;

  innerBox.position.x = currentMX * 0.4;
  innerBox.position.y = currentMY * 0.25;

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
  r2.material.opacity = state.ringOpacity * 1.5;
  r3.material.opacity = state.ringOpacity * 1.5;
  r4.material.opacity = state.outerRingOpacity;
  r5.material.opacity = state.outerRingOpacity * 2;
  r6.material.opacity = state.outerRingOpacity * 2;

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
    currentMY * 0.9 * (1 / Math.max(1, state.cubeScale * 0.6));
  mainBox.rotation.z =
    currentMX * 0.6 * (1 / Math.max(1, state.cubeScale * 0.6));

  innerBox.rotation.x -= 0.007 * rm;
  innerBox.rotation.y += 0.009 * rm;

  r1.rotation.z += 0.0028 * rm;
  r2.rotation.y += 0.0045 * rm;
  r3.rotation.x += 0.0035 * rm;
  r4.rotation.z -= 0.0018 * rm;
  r5.rotation.y -= 0.0022 * rm;
  r6.rotation.x -= 0.0015 * rm;

  r1.rotation.x += currentMY * 0.0015;
  r2.rotation.z += currentMX * 0.0015;

  r4.rotation.x += currentMY * 0.001;
  r5.rotation.z += currentMX * 0.001;

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
    if (d > 0.001 && d < 3 && repulseStrength > 0) {
      const force = ((3 - d) / 3) * 0.08 * hoverSpeed * repulseStrength;
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
   GSAP + LENIS SYNC
───────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

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
