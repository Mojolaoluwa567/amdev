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

/* ─────────────────────────────────────────────
   CURSOR
───────────────────────────────────────────── */
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
  document
    .querySelectorAll(".hcard,.diag-card,.mc,.film-card,.va-card,.scta-btn")
    .forEach((el) => {
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
