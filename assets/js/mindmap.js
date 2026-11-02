/* Interactive SVG capability map */
(function () {
  "use strict";
  var mods = window.B2B_MODULES;
  var svgHost = document.getElementById("mapSvgHost");
  if (!mods || !svgHost) return;

  var NS = "http://www.w3.org/2000/svg";
  var W = 960, H = 820;
  var CX = W / 2, CY = H / 2 + 20;
  var OR = 242;   /* icon orbit radius */
  var TR = 358;   /* text label radius */
  var IR = 46;    /* icon circle radius */

  /* SVG path icons, drawn on a 24×24 grid, centred at 0,0 */
  var ICON_PATHS = {
    "bi-calendar-check": "M-9-10h18a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H-9a1 1 0 0 1-1-1V-9a1 1 0 0 1 1-1zm1 2v2h4v-2zm6 0v2h4v-2zM-8-4v14h16V-4z",
    "bi-box-seam":       "M0-11l10 5.5v11L0 11l-10-5.5v-11zM0-8.5L-7.5-4.5l7.5 4 7.5-4zM-8.5 5.5l8.5 4.5 8.5-4.5v-8l-8.5 4.5-8.5-4.5zM-1 0l-7-3.8v7.6z",
    "bi-truck":          "M-10-5h12v10H-10zm12 2h5l3 4v4h-8zm-11 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM-10-3h10v6h-10z",
    "bi-people":         "M-5-7a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm8 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM-9 11c0-4 2-6 4-7a5 5 0 0 0-8 5zm4 0a5 5 0 0 1 10 0zm8-7c2 1 4 3 4 7H9a6 6 0 0 0-6-6z",
    "bi-headset":        "M0-10a9 9 0 0 0-9 9v3a3 3 0 0 0 3 3h1V-1H-7v-1a7 7 0 0 1 14 0v1h-2v6h1a3 3 0 0 0 3-3V-1A9 9 0 0 0 0-10zm-5 14v-6h-2v6zm8-6v6h2v-6z",
    "bi-bank":           "M0-11l11 6H-11zM-10 8V-3h2v11zm4 0V-3h2v11zm4 0V-3h2v11zm4 0V-3h2v11zM-11 9h22v2H-11z",
    "bi-building":       "M-8-11h16v22H-8zm2 2v2h2v-2zm4 0v2h2v-2zm-4 5v2h2v-2zm4 0v2h2v-2zm-4 5v2h2v-2zm4 0v2h2v-2zm-2 3v4h-2v-4z",
    "bi-bell":           "M0-11a1.5 1.5 0 0 1 1.5 1.5 8 8 0 0 1 6 7.8v3l2 2v1H-9.5v-1l2-2v-3a8 8 0 0 1 6-7.8A1.5 1.5 0 0 1 0-11zM-2 9h4a2 2 0 0 1-4 0z"
  };

  var activeId = mods[0].id;
  var nodeGroups = [];

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function select(id) {
    activeId = id;
    nodeGroups.forEach(function (g) {
      var on = g.getAttribute("data-id") === id;
      g.classList.toggle("mn-active", on);
      g.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* SVG root */
  var svg = el("svg", {
    viewBox: "0 0 " + W + " " + H,
    class: "map-svg",
    role: "group",
    "aria-label": "B2BStays capability map"
  }, svgHost);

  /* Defs */
  var defs = el("defs", {}, svg);

  var sg = el("radialGradient", { id: "sphereGrad", cx: "38%", cy: "35%", r: "65%", fx: "38%", fy: "35%" }, defs);
  el("stop", { offset: "0%",   "stop-color": "#1e5fd4" }, sg);
  el("stop", { offset: "55%",  "stop-color": "#0f3580" }, sg);
  el("stop", { offset: "100%", "stop-color": "#071c4a" }, sg);

  var ig = el("linearGradient", { id: "iconGrad", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  el("stop", { offset: "0%",   "stop-color": "#dbeafe" }, ig);
  el("stop", { offset: "100%", "stop-color": "#bfdbfe" }, ig);

  var sflt = el("filter", { id: "sphereGlow", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
  el("feGaussianBlur", { stdDeviation: "14", result: "blur" }, sflt);
  var sm = el("feMerge", {}, sflt);
  el("feMergeNode", { in: "blur" }, sm);
  el("feMergeNode", { in: "SourceGraphic" }, sm);

  var lineLayer = el("g", {}, svg);
  var nodeLayer = el("g", {}, svg);
  var coreLayer = el("g", {}, svg);

  /* Faint orbit rings */
  el("circle", { cx: CX, cy: CY, r: OR + 4, fill: "none", stroke: "#c5d3ef", "stroke-width": "1", "stroke-dasharray": "5 6" }, lineLayer);

  mods.forEach(function (m, i) {
    var a  = (-90 + i * 45) * Math.PI / 180;
    var ix = CX + OR * Math.cos(a);
    var iy = CY + OR * Math.sin(a);
    var tx = CX + TR * Math.cos(a);
    var ty = CY + TR * Math.sin(a);

    /* dashed line from sphere edge to just before icon */
    var l1x1 = CX + 118 * Math.cos(a), l1y1 = CY + 118 * Math.sin(a);
    var l1x2 = CX + (OR - IR - 6) * Math.cos(a), l1y2 = CY + (OR - IR - 6) * Math.sin(a);
    el("line", { x1: l1x1, y1: l1y1, x2: l1x2, y2: l1y2,
      stroke: "#a0b8e0", "stroke-width": "1.5", "stroke-dasharray": "5 5" }, lineLayer);

    /* dot at orbit edge */
    el("circle", { cx: CX + (OR + 8) * Math.cos(a), cy: CY + (OR + 8) * Math.sin(a),
      r: 5, fill: "#2563eb" }, lineLayer);

    /* dashed line from icon edge to text */
    var l2x1 = CX + (OR + IR + 8) * Math.cos(a), l2y1 = CY + (OR + IR + 8) * Math.sin(a);
    var l2x2 = CX + (TR - 86) * Math.cos(a), l2y2 = CY + (TR - 86) * Math.sin(a);
    el("line", { x1: l2x1, y1: l2y1, x2: l2x2, y2: l2y2,
      stroke: "#a0b8e0", "stroke-width": "1.5", "stroke-dasharray": "5 5" }, lineLayer);

    /* node group */
    var ng = el("g", {
      class: "mn-node", tabindex: "0", role: "button",
      "aria-pressed": m.id === activeId ? "true" : "false",
      "data-id": m.id, "aria-label": m.title
    }, nodeLayer);

    /* icon bubble: outer soft ring + inner filled circle */
    el("circle", { cx: ix, cy: iy, r: IR + 10,
      fill: "rgba(219,234,254,.45)", stroke: "none" }, ng);
    el("circle", { cx: ix, cy: iy, r: IR,
      fill: "url(#iconGrad)", stroke: "#c3d9f8", "stroke-width": "1.5" }, ng);

    /* SVG path icon */
    var iconPath = ICON_PATHS[m.icon];
    if (iconPath) {
      el("path", {
        d: iconPath,
        fill: "#ffffff",
        transform: "translate(" + ix + "," + iy + ") scale(1.1)",
        "pointer-events": "none"
      }, ng);
    }

    /* number */
    el("text", { x: tx, y: m.lines[1] ? ty - 22 : ty - 12,
      "text-anchor": "middle", class: "mn-num" }, ng)
      .textContent = String(i + 1).padStart(2, "0");

    /* label lines */
    var yBase = m.lines[1] ? ty - 2 : ty + 10;
    el("text", { x: tx, y: yBase, "text-anchor": "middle", class: "mn-label" }, ng)
      .textContent = m.lines[0];
    if (m.lines[1]) {
      el("text", { x: tx, y: yBase + 22, "text-anchor": "middle", class: "mn-label" }, ng)
        .textContent = m.lines[1];
    }

    ng.addEventListener("click",   function () { select(m.id); });
    ng.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(m.id); }
    });
    nodeGroups.push(ng);
  });

  /* Centre sphere */
  el("circle", { cx: CX, cy: CY, r: 150, fill: "rgba(37,99,235,.06)", class: "mn-halo",
    style: "transform-origin:" + CX + "px " + CY + "px" }, coreLayer);
  el("circle", { cx: CX, cy: CY, r: 130, fill: "rgba(37,99,235,.08)" }, coreLayer);
  el("circle", { cx: CX, cy: CY, r: 112, fill: "url(#sphereGrad)", filter: "url(#sphereGlow)" }, coreLayer);
  el("ellipse", { cx: CX - 28, cy: CY - 34, rx: 36, ry: 20, fill: "rgba(255,255,255,.13)" }, coreLayer);
  el("line", { x1: CX - 22, y1: CY + 22, x2: CX + 22, y2: CY + 22,
    stroke: "rgba(255,255,255,.3)", "stroke-width": "2", "stroke-linecap": "round" }, coreLayer);
  el("text", { x: CX, y: CY - 10, "text-anchor": "middle", "dominant-baseline": "central", class: "mn-core-title" }, coreLayer)
    .textContent = "B2BStays";
  el("text", { x: CX, y: CY + 14, "text-anchor": "middle", "dominant-baseline": "central", class: "mn-core-sub" }, coreLayer)
    .textContent = "Business Platform";

  select(activeId);
})();
