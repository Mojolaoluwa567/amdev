/* ================================
   PERFORMANCE & HEAT SAFE SCRIPT
   ================================ */

/* 1. Detect low-power devices */
const isLowPower =
  navigator.hardwareConcurrency <= 4 ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 2. Global animation control (GSAP-safe) */
let animationsPaused = false;

function pauseAnimations() {
  animationsPaused = true;
  if (window.gsap) gsap.globalTimeline.pause();
}

function resumeAnimations() {
  if (isLowPower) return;
  animationsPaused = false;
  if (window.gsap) gsap.globalTimeline.resume();
}

/* Pause animations when tab is hidden */
document.addEventListener("visibilitychange", () => {
  document.hidden ? pauseAnimations() : resumeAnimations();
});

/* 3. Mouse tracking */
let mouseX = 0,
  mouseY = 0,
  currentX = 0,
  currentY = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

/* 4. Lightweight trailing cursor */
const cursor = document.querySelector(".custom-cursor");

function animateCursor() {
  if (!cursor || isLowPower || animationsPaused) return;

  currentX += (mouseX - currentX) * 0.12;
  currentY += (mouseY - currentY) * 0.12;

  cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
  requestAnimationFrame(animateCursor);
}

if (!isLowPower) animateCursor();

/* 5. Kill heavy stuff on low power */
if (isLowPower) {
  console.warn("Low power mode detected – disabling heavy effects");

  if (cursor) cursor.style.display = "none";

  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.removeAttribute("autoplay");
  });

  document.documentElement.classList.add("reduce-motion");
}

/* 6. Optimized scroll listener */
let scrollTicking = false;

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  },
  { passive: true },
);

/* 7. GSAP ScrollTrigger safety */
if (window.ScrollTrigger) {
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });
}

/* 8. Idle detection (pause everything) */
let idleTimer;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  resumeAnimations();

  idleTimer = setTimeout(() => {
    pauseAnimations();
  }, 20000);
}

["mousemove", "scroll", "keydown", "touchstart"].forEach((evt) =>
  window.addEventListener(evt, resetIdleTimer, { passive: true }),
);

resetIdleTimer();
