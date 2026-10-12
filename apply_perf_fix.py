#!/usr/bin/env python3
"""
Applies the Works-section scroll-lag fixes to script.js, style.css, index.html.

Usage (run inside your project folder, next to those three files):
    python3 apply_perf_fix.py

- Every edit must match exactly once, otherwise NOTHING is written.
- Originals are saved as <file>.bak first.
- Safe to run twice (already-applied edits are skipped).
"""
import sys
from pathlib import Path

EDITS = {}

# ───────────────────────── script.js ─────────────────────────
EDITS["script.js"] = [
    # 1. cache where the canvas stops being visible + a cheap "layout changed" stamp
    (
        r'''let scrollProgress = 0;
let maxScroll = 1;
let vh = window.innerHeight;

const measure = () => {
  vh = window.innerHeight;
  maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
};
measure();
''',
        r'''const marqueeEl = document.querySelector(".marquee-wrap");

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
''',
    ),
    # 2. skip all 3D work when the canvas is fully covered
    (
        r'''(function animate() {
  requestAnimationFrame(animate);

  /* read the real scroll position once per frame (no layout reads) */
  const sy = window.scrollY;
  if (sy !== lastSY) {
    lastSY = sy;
    scrollProgress = clamp(sy / maxScroll, 0, 1);
    updateHero(sy);
  }
''',
        r'''let canvasCovered = false;

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
''',
    ),
    # 3. parallax that can't expose a gap (image frame is 120% tall in the CSS)
    (
        r'''document.querySelectorAll(".project-image img").forEach((img) => {
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
''',
        r'''document.querySelectorAll(".project-image img").forEach((img) => {
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
''',
    ),
    # 4. tilt: no layout read on every mousemove
    (
        r'''  project.addEventListener(
    "mousemove",
    (e) => {
      const rect = imageWrap.getBoundingClientRect();
      tiltY(((e.clientX - rect.left) / rect.width - 0.5) * 8);
      tiltX(((e.clientY - rect.top) / rect.height - 0.5) * -8);
    },
    { passive: true },
  );
  project.addEventListener("mouseleave", () => {
    tiltX(0);
    tiltY(0);
  });
''',
        r'''  let rect = null;
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
''',
    ),
]

# ───────────────────────── style.css ─────────────────────────
EDITS["style.css"] = [
    # contain the paint of each image frame
    (
        r'''  clip-path: inset(100% 0 0 0);
  transition: clip-path 0.65s cubic-bezier(0.16, 1, 0.3, 1);
}
''',
        r'''  clip-path: inset(100% 0 0 0);
  transition: clip-path 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  contain: paint;
}
''',
    ),
    # GSAP owns the img transform: drop the CSS transition that fought it every frame
    (
        r'''.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(0.9);
  transition:
    transform 1.2s cubic-bezier(0.19, 1, 0.22, 1),
    filter 1.2s ease;
}

.project:hover img {
  transform: scale(0.92);
}
''',
        r'''/* GSAP owns this element's transform (parallax + hover zoom), so there is
   deliberately no CSS transition here: one would restart on every scroll
   frame. The image is 20% taller than its frame so parallax never shows a gap. */
.project-image img {
  position: absolute;
  left: 0;
  top: -10%;
  width: 100%;
  height: 120%;
  object-fit: cover;
  will-change: transform;
}
''',
    ),
    # always-on compositing layers that nothing was using
    (
        r'''  gap: 1rem;
  will-change: transform, opacity;
}
''',
        r'''  gap: 1rem;
}
''',
    ),
    # transition: all -> only what changes
    (
        r'''  align-items: center;

  transition: all 0.3s ease;
}
.project-tags span:hover {''',
        r'''  align-items: center;

  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    transform 0.3s ease;
}
.project-tags span:hover {''',
    ),
    (
        r'''  transition: all 0.3s ease;
  cursor: pointer;
  margin-top: 4rem;''',
        r'''  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    transform 0.3s ease;
  cursor: pointer;
  margin-top: 4rem;''',
    ),
    # full-screen blurred mobile menu: don't keep it alive while closed
    (
        r'''  justify-content: center;
  padding: 0 3rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
}
''',
        r'''  justify-content: center;
  padding: 0 3rem;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.45s ease,
    visibility 0s linear 0.45s;
}
''',
    ),
    (
        r'''body.menu-open #mobile-nav {
  opacity: 1;
  pointer-events: auto;
}
''',
        r'''body.menu-open #mobile-nav {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition:
    opacity 0.45s ease,
    visibility 0s;
}
''',
    ),
]

# ───────────────────────── index.html ─────────────────────────
EDITS["index.html"] = [
    # Lenis is gone and GSAP is already imported as a module: stop loading both twice
    (
        r'''    <script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
''',
        "    <!-- Lenis + duplicate GSAP tags removed: GSAP is imported as a module in script.js -->\n",
    ),
    (
        r'''<img src="image/faisal.webp" alt="Faisal Bidmos Website" />''',
        r'''<img src="image/faisal.webp" alt="Faisal Bidmos Website" loading="lazy" decoding="async" />''',
    ),
    (
        r'''<img src="image/Urban.webp" alt="UrbanHive Project" />''',
        r'''<img src="image/Urban.webp" alt="UrbanHive Project" loading="lazy" decoding="async" />''',
    ),
    (
        r'''<img src="image/ABP.webp" alt="ABP Industries Website" />''',
        r'''<img src="image/ABP.webp" alt="ABP Industries Website" loading="lazy" decoding="async" />''',
    ),
    (
        r'''<img src="image/qpat.webp" alt="QPAT Solution Website" />''',
        r'''<img src="image/qpat.webp" alt="QPAT Solution Website" loading="lazy" decoding="async" />''',
    ),
    (
        r'''              <img
                src="image/smooth transit.png"
                alt="QPAT Solution Website"
                style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  object-position: center 10%;
                "
              />''',
        r'''              <img
                src="image/smooth transit.png"
                alt="Smooth Transit Global website"
                style="object-position: center 10%"
                loading="lazy"
                decoding="async"
              />''',
    ),
    (
        r'''              <img
                src="image/palmkell.png"
                alt="QPAT Solution Website"
                style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  object-position: center 10%;
                "
              />''',
        r'''              <img
                src="image/palmkell.png"
                alt="Palm and Kell website"
                style="object-position: center 10%"
                loading="lazy"
                decoding="async"
              />''',
    ),
]


def main():
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    results = {}
    problems = []

    for name, edits in EDITS.items():
        path = base / name
        if not path.exists():
            problems.append(f"{name}: file not found in {base.resolve()}")
            continue
        raw = path.read_bytes().decode("utf-8")
        crlf = "\r\n" in raw
        text = raw.replace("\r\n", "\n")
        applied = skipped = 0
        for i, (old, new) in enumerate(edits, 1):
            n = text.count(old)
            if new in text:
                skipped += 1
            elif n == 1:
                text = text.replace(old, new)
                applied += 1
            elif n == 0:
                problems.append(f"{name}: edit #{i} did not match (file differs from what I was given)")
            else:
                problems.append(f"{name}: edit #{i} matched {n} times (expected 1)")
        if crlf:
            text = text.replace("\n", "\r\n")
        results[name] = (path, raw, text, applied, skipped)

    if problems:
        print("Nothing was written. Problems:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    for name, (path, raw, text, applied, skipped) in results.items():
        if applied:
            path.with_name(path.name + ".bak").write_bytes(raw.encode("utf-8"))
            path.write_bytes(text.encode("utf-8"))
        print(f"{name}: {applied} edit(s) applied, {skipped} already present")
    print("Done. Originals saved as *.bak")


if __name__ == "__main__":
    main()
