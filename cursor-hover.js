/* =============================================
   A.M — cursor-hover.js
   The cursor ring grows over links and buttons
   (header nav included), the same effect as the
   about page. The ring/dot styles live in style.css
   (body.cursor-hover #cursor ...).

   Needs <div id="cursor"> on the page and only
   runs where there is a real mouse.
   ============================================= */
(function () {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  var TARGETS = "a, button, [role='button']";
  var body = document.body;

  document.addEventListener("mouseover", function (e) {
    if (e.target.closest && e.target.closest(TARGETS)) {
      body.classList.add("cursor-hover");
    }
  });

  document.addEventListener("mouseout", function (e) {
    var from = e.target.closest && e.target.closest(TARGETS);
    var to = e.relatedTarget;
    var stillOnTarget = to && to.closest && to.closest(TARGETS);
    if (from && !stillOnTarget) body.classList.remove("cursor-hover");
  });
})();
