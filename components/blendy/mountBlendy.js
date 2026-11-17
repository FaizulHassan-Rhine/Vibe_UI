const SHEET = 2048;
const FRAME_W = 1440;
const FRAME_H = 900;
const CAP_RATIO = 0.698;
const BASELINE_OFFSET = 0.85;
const WORD_DEFAULT = 445;
const WORD_MAX_INK = 1330;
const WORD_FIT_INK = 1400;
const TRANSITION_MS = 970;
const AUTOPLAY_MS = 2600;
const IDLE_PAUSE_MS = 6000;
const SWIPE_MIN = 45;

const PROXY =
  "https://images.higgs.ai/?default=1&output=webp&w=2048&q=85&url=";

const FLAVOURS = [
  {
    id: "berry",
    word: "Berry",
    color: "#C2B0DC",
    sheet:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_053958_8803e421-29b1-4c24-8efd-54cae3f479b4.png",
    items: [
      [233, 60, 598, 917],
      [1209, 272, 569, 573],
      [265, 1230, 579, 572],
      [1192, 1192, 626, 641],
    ],
    bottle: { x: 518, y: 138, w: 372 },
    fruit: [
      { item: 2, x: 383, y: 178, w: 104, rot: 0, mirror: false },
      { item: 3, x: 960, y: 232, w: 118, rot: 0, mirror: false },
      { item: 1, x: 295, y: 478, w: 129, rot: -8, mirror: false },
      { item: 1, x: 1247, y: 455, w: 123, rot: 15, mirror: false },
      { item: 2, x: 968, y: 590, w: 110, rot: 30, mirror: false },
    ],
    corner: [
      { item: 1, x: -15, y: 590, w: 255, rot: 0, mirror: false },
      { item: 3, x: 1282, y: 40, w: 200, rot: 0, mirror: false },
    ],
  },
  {
    id: "kiwi",
    word: "Kiwi",
    color: "#B4D58A",
    sheet:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_053958_b5695e60-72da-4b5b-bfb7-a091d528af75.png",
    items: [
      [217, 90, 610, 874],
      [1204, 257, 619, 601],
      [250, 1197, 619, 522],
      [1200, 1186, 633, 650],
    ],
    bottle: { x: 504, y: 135, w: 403 },
    fruit: [
      { item: 2, x: 376, y: 170, w: 144, rot: -150, mirror: true },
      { item: 3, x: 960, y: 228, w: 152, rot: 0, mirror: false },
      { item: 1, x: 303, y: 460, w: 168, rot: 0, mirror: false },
      { item: 2, x: 1187, y: 462, w: 148, rot: -25, mirror: false },
      { item: 2, x: 946, y: 606, w: 150, rot: 10, mirror: true },
    ],
    corner: [
      { item: 1, x: -10, y: 575, w: 260, rot: 0, mirror: false },
      { item: 3, x: 1285, y: 30, w: 200, rot: 0, mirror: false },
    ],
  },
  {
    id: "banana",
    word: "Banana",
    color: "#F3DA8A",
    sheet:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_053958_6cf14029-4bce-4c9a-b9fc-1c5b185082e3.png",
    items: [
      [194, 76, 579, 873],
      [1205, 228, 596, 597],
      [230, 1181, 624, 648],
      [1193, 1182, 646, 659],
    ],
    bottle: { x: 512, y: 135, w: 383 },
    fruit: [
      { item: 1, x: 387, y: 147, w: 123, rot: 0, mirror: false },
      { item: 2, x: 970, y: 223, w: 136, rot: -10, mirror: true },
      { item: 3, x: 298, y: 483, w: 132, rot: 15, mirror: false },
      { item: 2, x: 1245, y: 462, w: 150, rot: 20, mirror: false },
      { item: 3, x: 950, y: 582, w: 130, rot: -12, mirror: false },
    ],
    corner: [
      { item: 3, x: 0, y: 585, w: 235, rot: 0, mirror: false },
      { item: 1, x: 1280, y: 30, w: 190, rot: 0, mirror: false },
    ],
  },
  {
    id: "strawberry",
    word: "Strawberry",
    color: "#F2AFC0",
    sheet:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261117_055135_cbfb5a8d-c52b-4358-a6ee-d941c6c42285.png",
    items: [
      [226, 88, 594, 887],
      [1190, 216, 561, 653],
      [257, 1168, 604, 662],
      [1240, 1169, 632, 686],
    ],
    bottle: { x: 512, y: 135, w: 386 },
    fruit: [
      { item: 1, x: 372, y: 142, w: 128, rot: 0, mirror: false },
      { item: 2, x: 955, y: 225, w: 117, rot: 20, mirror: false },
      { item: 3, x: 290, y: 455, w: 140, rot: -10, mirror: false },
      { item: 3, x: 1250, y: 432, w: 135, rot: 15, mirror: false },
      { item: 2, x: 962, y: 558, w: 146, rot: -15, mirror: false },
    ],
    corner: [
      { item: 1, x: -10, y: 555, w: 245, rot: 0, mirror: false },
      { item: 1, x: 1285, y: 35, w: 200, rot: 20, mirror: false },
    ],
  },
];

const SHADOWS = [
  { cx: 345, cy: 650, w: 170, h: 24 },
  { cx: 720, cy: 708, w: 320, h: 30 },
  { cx: 1318, cy: 638, w: 160, h: 22 },
  { cx: 1045, cy: 760, w: 150, h: 22 },
];

const COVER_TABLE = [
  [0, 0],
  [0.031, 0.006],
  [0.134, 0.012],
  [0.206, 0.023],
  [0.278, 0.047],
  [0.34, 0.07],
  [0.412, 0.105],
  [0.485, 0.158],
  [0.546, 0.246],
  [0.583, 0.55],
  [0.62, 0.825],
  [0.69, 0.9],
  [0.79, 0.94],
  [0.85, 0.956],
  [0.93, 0.975],
  [1, 1],
];

const LAYER_FACTORS = {
  word: 0.4,
  shadow: 0.3,
  bottle: 0.15,
  fruit: 0.55,
  corner: 0.75,
};

const STYLE = /* css */ `
@font-face {
  font-family: "Poppins";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/blendy/poppins-600.woff2") format("woff2");
}
@font-face {
  font-family: "Poppins";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/blendy/poppins-700.woff2") format("woff2");
}

[data-blendy-root] {
  --n: clamp(0.5px, min(100vw / 1440, 100vh / 900), 1.3px);
  position: absolute;
  inset: 0;
  overflow: hidden;
  font-family: Poppins, system-ui, sans-serif;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

[data-blendy-root] .bl-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  user-select: none;
}

[data-blendy-root] .bl-slide {
  position: absolute;
  inset: 0;
  overflow: hidden;
  visibility: hidden;
  z-index: 0;
}

[data-blendy-root] .bl-slide.is-current {
  visibility: visible;
  z-index: 2;
}

[data-blendy-root] .bl-slide.is-incoming {
  visibility: visible;
  z-index: 1;
}

[data-blendy-root] .bl-frame {
  position: absolute;
  width: calc(1440 * var(--u));
  height: calc(900 * var(--u));
  left: calc(50% - 720 * var(--u));
  top: calc(50% - 450 * var(--u) + var(--fy, 0px));
}

[data-blendy-root] .bl-layer {
  position: absolute;
  inset: 0;
  will-change: transform;
}

[data-blendy-root] .bl-word {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-family: Poppins, system-ui, sans-serif;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  color: #fff;
  margin: 0;
  pointer-events: none;
}

[data-blendy-root] .bl-shadow {
  position: absolute;
  border-radius: 50%;
  filter: blur(calc(4 * var(--u)));
  background: radial-gradient(
    closest-side,
    rgba(60, 40, 80, 0.22),
    transparent
  );
  pointer-events: none;
}

[data-blendy-root] .bl-crop {
  position: absolute;
  background-repeat: no-repeat;
  pointer-events: none;
}

[data-blendy-root] .bl-piece {
  position: absolute;
  pointer-events: none;
}

[data-blendy-root] .bl-piece-inner {
  width: 100%;
  height: 100%;
  background-repeat: no-repeat;
  transform-origin: 50% 50%;
  animation: bl-bob var(--bob-dur, 4s) ease-in-out var(--bob-delay, 0s) infinite
    alternate;
}

[data-blendy-root] .bl-layer-corner .bl-piece-inner {
  filter: blur(calc(9 * var(--u)));
}

[data-blendy-root] .bl-ui {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

[data-blendy-root] .bl-shop {
  position: absolute;
  left: 50%;
  bottom: calc(36 * var(--n));
  transform: translateX(-50%);
  font-family: Poppins, system-ui, sans-serif;
  font-weight: 600;
  font-size: calc(21 * var(--n));
  letter-spacing: 0.2em;
  color: #fff;
  padding: calc(10 * var(--n)) calc(16 * var(--n));
  text-shadow: 0 1px 6px rgba(90, 70, 40, 0.18);
  opacity: 0;
  translate: 0 14px;
}

[data-blendy-root] .bl-arrow {
  position: absolute;
  bottom: calc(30 * var(--n));
  width: calc(52 * var(--n));
  height: calc(52 * var(--n));
  display: grid;
  place-items: center;
  color: #fff;
  text-shadow: 0 1px 6px rgba(90, 70, 40, 0.18);
  opacity: 0;
  translate: 0 14px;
}

[data-blendy-root] .bl-arrow-prev {
  left: calc(36 * var(--n));
}

[data-blendy-root] .bl-arrow-next {
  right: calc(36 * var(--n));
}

[data-blendy-root] .bl-arrow svg {
  width: calc(28 * var(--n));
  height: calc(28 * var(--n));
  display: block;
}

[data-blendy-root] .bl-arrow svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

[data-blendy-root].is-ready .bl-shop,
[data-blendy-root].is-ready .bl-arrow {
  opacity: 1;
  translate: 0 0;
  transition: opacity 1000ms cubic-bezier(0.22, 0.8, 0.3, 1),
    translate 1000ms cubic-bezier(0.22, 0.8, 0.3, 1);
}

[data-blendy-root].is-ready .bl-arrow-prev {
  transition-delay: 250ms;
}
[data-blendy-root].is-ready .bl-shop {
  transition-delay: 330ms;
}
[data-blendy-root].is-ready .bl-arrow-next {
  transition-delay: 410ms;
}

[data-blendy-root].is-reduced .bl-piece-inner {
  animation: none !important;
  transform: rotate(var(--bob-base, 0deg));
}

[data-blendy-root].is-reduced .bl-shop,
[data-blendy-root].is-reduced .bl-arrow,
[data-blendy-root].is-instant .bl-shop,
[data-blendy-root].is-instant .bl-arrow {
  opacity: 1;
  translate: 0 0;
  transition: none;
}

@keyframes bl-bob {
  from {
    transform: translateY(calc(-7 * var(--u))) rotate(var(--bob-from));
  }
  to {
    transform: translateY(calc(7 * var(--u))) rotate(var(--bob-to));
  }
}

[data-blendy-root].is-mobile {
  --n: 1px;
}

[data-blendy-root].is-mobile .bl-shop {
  bottom: 22px;
  font-size: 15px;
  padding: 8px 12px;
}

[data-blendy-root].is-mobile .bl-arrow {
  bottom: 12px;
  width: 48px;
  height: 48px;
}

[data-blendy-root].is-mobile .bl-arrow-prev {
  left: 8px;
}

[data-blendy-root].is-mobile .bl-arrow-next {
  right: 8px;
}

[data-blendy-root].is-mobile .bl-arrow svg {
  width: 24px;
  height: 24px;
}
`;

function sheetUrl(original) {
  return PROXY + encodeURIComponent(original);
}

function cropStyle(sheet, box, w) {
  const [bx, by, bw, bh] = box;
  const s = w / bw;
  return {
    width: w,
    height: bh * s,
    backgroundImage: `url("${sheet}")`,
    backgroundSize: `${SHEET * s}px ${SHEET * s}px`,
    backgroundPosition: `${-bx * s}px ${-by * s}px`,
  };
}

function applyCrop(el, sheet, box, wDesign, u) {
  const style = cropStyle(sheet, box, wDesign * u);
  el.style.width = `${style.width}px`;
  el.style.height = `${style.height}px`;
  el.style.backgroundImage = style.backgroundImage;
  el.style.backgroundSize = style.backgroundSize;
  el.style.backgroundPosition = style.backgroundPosition;
  el.style.backgroundRepeat = "no-repeat";
}

function smoothstep(k) {
  return k * k * (3 - 2 * k);
}

function coverAt(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < COVER_TABLE.length - 1; i++) {
    const [t0, c0] = COVER_TABLE[i];
    const [t1, c1] = COVER_TABLE[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const k = (clamped - t0) / (t1 - t0 || 1);
      return c0 + (c1 - c0) * smoothstep(k);
    }
  }
  return 1;
}

function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Short landscape phones keep desktop layout
  if (w > h && w <= 820) return false;
  return w <= 820 || h > w;
}

function measureInkWidth(text, weight = "700") {
  const canvas = measureInkWidth._c || (measureInkWidth._c = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  ctx.font = `${weight} 100px Poppins, system-ui, sans-serif`;
  const m = ctx.measureText(text);
  const left = m.actualBoundingBoxLeft ?? 0;
  const right = m.actualBoundingBoxRight ?? m.width;
  return left + right;
}

function wordLayout(word, visibleFrameW) {
  const ink100 = measureInkWidth(word);
  const inkAt445 = (ink100 / 100) * WORD_DEFAULT;
  let size = WORD_DEFAULT;
  let tracking = 0.005;

  const fitLimit = visibleFrameW != null ? visibleFrameW : WORD_MAX_INK;

  if (inkAt445 > WORD_MAX_INK || (visibleFrameW != null && inkAt445 > fitLimit)) {
    tracking = -0.035;
    // Approximate tracking effect: letter-spacing changes ink width.
    // Use canvas with letterSpacing when available; fallback estimate.
    const target = visibleFrameW != null ? fitLimit : WORD_FIT_INK;
    size = Math.min(WORD_DEFAULT, (target * 100) / Math.max(ink100, 1));

    // Refine with letter-spacing if supported
    const canvas = measureInkWidth._c;
    const ctx = canvas.getContext("2d");
    if (typeof ctx.letterSpacing !== "undefined") {
      let lo = 40;
      let hi = WORD_DEFAULT;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        ctx.font = `700 ${mid}px Poppins, system-ui, sans-serif`;
        ctx.letterSpacing = `${tracking * mid}px`;
        const m = ctx.measureText(word);
        const ink = (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? m.width);
        if (ink > target) hi = mid;
        else lo = mid;
      }
      size = Math.min(WORD_DEFAULT, lo);
    }
  }

  const baseline = 403.5 + (CAP_RATIO * size) / 2;
  const top = baseline - BASELINE_OFFSET * size;
  return { size, tracking, top };
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  return node;
}

function buildPiece(flavour, piece, sheetUrlStr) {
  const outer = el("div", "bl-piece");
  if (piece.mirror) outer.style.transform = "scaleX(-1)";
  outer.dataset.x = String(piece.x);
  outer.dataset.y = String(piece.y);
  outer.dataset.w = String(piece.w);
  outer.dataset.item = String(piece.item);
  outer.dataset.sheet = sheetUrlStr;

  const inner = el("div", "bl-piece-inner");
  const dur = 3.2 + Math.random() * 1.8;
  const delay = -Math.random() * 4;
  inner.style.setProperty("--bob-dur", `${dur}s`);
  inner.style.setProperty("--bob-delay", `${delay}s`);
  inner.style.setProperty("--bob-base", `${piece.rot}deg`);
  inner.style.setProperty("--bob-from", `${piece.rot - 3}deg`);
  inner.style.setProperty("--bob-to", `${piece.rot + 3}deg`);

  outer.appendChild(inner);
  return outer;
}

function buildSlide(flavour) {
  const slide = el("section", "bl-slide", {
    "data-flavour": flavour.id,
    "aria-label": flavour.word,
  });
  slide.style.background = flavour.color;

  const frame = el("div", "bl-frame");
  const url = sheetUrl(flavour.sheet);

  const wordLayer = el("div", "bl-layer bl-layer-word", { "data-layer": "word" });
  const word = el("h2", "bl-word", { text: flavour.word });
  wordLayer.appendChild(word);

  const shadowLayer = el("div", "bl-layer bl-layer-shadow", { "data-layer": "shadow" });
  for (const s of SHADOWS) {
    const sh = el("div", "bl-shadow");
    sh.dataset.cx = String(s.cx);
    sh.dataset.cy = String(s.cy);
    sh.dataset.w = String(s.w);
    sh.dataset.h = String(s.h);
    shadowLayer.appendChild(sh);
  }

  const bottleLayer = el("div", "bl-layer bl-layer-bottle", { "data-layer": "bottle" });
  const bottle = el("div", "bl-crop bl-bottle");
  bottle.dataset.item = "0";
  bottle.dataset.x = String(flavour.bottle.x);
  bottle.dataset.y = String(flavour.bottle.y);
  bottle.dataset.w = String(flavour.bottle.w);
  bottle.dataset.sheet = url;
  bottleLayer.appendChild(bottle);

  const fruitLayer = el("div", "bl-layer bl-layer-fruit", { "data-layer": "fruit" });
  for (const p of flavour.fruit) {
    fruitLayer.appendChild(buildPiece(flavour, p, url));
  }

  const cornerLayer = el("div", "bl-layer bl-layer-corner", { "data-layer": "corner" });
  for (const p of flavour.corner) {
    cornerLayer.appendChild(buildPiece(flavour, p, url));
  }

  frame.append(wordLayer, shadowLayer, bottleLayer, fruitLayer, cornerLayer);
  slide.appendChild(frame);
  slide._flavour = flavour;
  slide._url = url;
  return slide;
}

function buildUI() {
  const ui = el("div", "bl-ui");

  const shop = el("a", "bl-shop", { href: "#", text: "SHOP NOW" });

  const prev = el("button", "bl-arrow bl-arrow-prev", {
    type: "button",
    "aria-label": "Previous flavour",
    html: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M24 14H4M12 6l-8 8 8 8"/></svg>`,
  });
  const next = el("button", "bl-arrow bl-arrow-next", {
    type: "button",
    "aria-label": "Next flavour",
    html: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 14h20M16 6l8 8-8 8"/></svg>`,
  });

  ui.append(shop, prev, next);
  return { ui, shop, prev, next };
}

export function mountBlendy(root) {
  const style = el("style");
  style.textContent = STYLE;
  root.appendChild(style);

  const wrap = el("div", null, { "data-blendy-root": "" });
  const stage = el("div", "bl-stage");
  const slides = FLAVOURS.map(buildSlide);
  slides.forEach((s) => stage.appendChild(s));
  const { ui, prev, next } = buildUI();
  wrap.append(stage, ui);
  root.appendChild(wrap);

  let index = 0;
  let busy = false;
  let lastInteract = 0;
  let raf = 0;
  let autoTimer = 0;
  let u = 1;
  let fy = 0;
  let mobile = false;
  let pointerStart = null;

  slides[0].classList.add("is-current");
  root.style.background = FLAVOURS[0].color;

  function layoutSlide(slide) {
    const flavour = slide._flavour;
    const url = slide._url;
    const frame = slide.querySelector(".bl-frame");
    void frame;

    const visibleW =
      mobile ? Math.min(FRAME_W, window.innerWidth / u) * 0.92 : null;
    const wl = wordLayout(flavour.word, visibleW);
    const word = slide.querySelector(".bl-word");
    word.style.fontSize = `${wl.size * u}px`;
    word.style.letterSpacing = `${wl.tracking}em`;
    word.style.top = `${wl.top * u}px`;

    slide.querySelectorAll(".bl-shadow").forEach((sh) => {
      const cx = +sh.dataset.cx;
      const cy = +sh.dataset.cy;
      const w = +sh.dataset.w;
      const h = +sh.dataset.h;
      sh.style.width = `${w * u}px`;
      sh.style.height = `${h * u}px`;
      sh.style.left = `${(cx - w / 2) * u}px`;
      sh.style.top = `${(cy - h / 2) * u}px`;
    });

    const bottle = slide.querySelector(".bl-bottle");
    const bx = +bottle.dataset.x;
    const by = +bottle.dataset.y;
    const bw = +bottle.dataset.w;
    applyCrop(bottle, url, flavour.items[0], bw, u);
    bottle.style.left = `${bx * u}px`;
    bottle.style.top = `${by * u}px`;

    slide.querySelectorAll(".bl-piece").forEach((piece) => {
      const item = +piece.dataset.item;
      const x = +piece.dataset.x;
      const y = +piece.dataset.y;
      const w = +piece.dataset.w;
      const cs = cropStyle(url, flavour.items[item], w * u);
      piece.style.left = `${x * u}px`;
      piece.style.top = `${y * u}px`;
      piece.style.width = `${cs.width}px`;
      piece.style.height = `${cs.height}px`;

      const inner = piece.querySelector(".bl-piece-inner");
      inner.style.backgroundImage = cs.backgroundImage;
      inner.style.backgroundSize = cs.backgroundSize;
      inner.style.backgroundPosition = cs.backgroundPosition;
      inner.style.backgroundRepeat = "no-repeat";
    });
  }

  function layoutAll() {
    mobile = isMobileLayout();
    wrap.classList.toggle("is-mobile", mobile);
    wrap.classList.toggle("is-reduced", reducedMotion());

    const vw = window.innerWidth;
    const vh = root.clientHeight || window.innerHeight;

    if (mobile) {
      u = Math.min(vw / 640, (vh - 200) / 620);
      fy = 8;
    } else {
      u = Math.min(vw / FRAME_W, vh / FRAME_H);
      fy = 0;
    }

    wrap.style.setProperty("--u", `${u}px`);
    wrap.style.setProperty("--fy", `${fy}px`);
    slides.forEach(layoutSlide);
  }

  function clearSlideFx(slide) {
    slide.style.clipPath = "";
    slide.querySelectorAll(".bl-layer").forEach((layer) => {
      layer.style.transform = "";
    });
  }

  function setCurrent(i) {
    slides.forEach((s, n) => {
      s.classList.remove("is-current", "is-incoming");
      clearSlideFx(s);
      if (n === i) {
        s.classList.add("is-current");
        s.style.visibility = "visible";
        s.style.zIndex = "2";
      } else {
        s.style.visibility = "hidden";
        s.style.zIndex = "0";
      }
    });
    index = i;
    root.style.background = FLAVOURS[i].color;
  }

  function goTo(target, dir) {
    if (busy) return;
    const nextIndex = ((target % FLAVOURS.length) + FLAVOURS.length) % FLAVOURS.length;
    if (nextIndex === index) return;

    if (dir == null) {
      dir = nextIndex > index ? 1 : -1;
    }

    if (reducedMotion()) {
      setCurrent(nextIndex);
      return;
    }

    busy = true;
    const from = slides[index];
    const to = slides[nextIndex];
    const frameW = FRAME_W * u;

    from.classList.add("is-current");
    from.classList.remove("is-incoming");
    from.style.visibility = "visible";
    from.style.zIndex = "2";

    to.classList.add("is-incoming");
    to.classList.remove("is-current");
    to.style.visibility = "visible";
    to.style.zIndex = "1";
    clearSlideFx(to);

    index = nextIndex;
    root.style.background = FLAVOURS[nextIndex].color;

    const fromLayers = {
      word: from.querySelector('[data-layer="word"]'),
      shadow: from.querySelector('[data-layer="shadow"]'),
      bottle: from.querySelector('[data-layer="bottle"]'),
      fruit: from.querySelector('[data-layer="fruit"]'),
      corner: from.querySelector('[data-layer="corner"]'),
    };
    const toLayers = {
      word: to.querySelector('[data-layer="word"]'),
      shadow: to.querySelector('[data-layer="shadow"]'),
      bottle: to.querySelector('[data-layer="bottle"]'),
      fruit: to.querySelector('[data-layer="fruit"]'),
      corner: to.querySelector('[data-layer="corner"]'),
    };

    // initial B offset
    for (const [key, layer] of Object.entries(toLayers)) {
      const factor = LAYER_FACTORS[key];
      layer.style.transform = `translateX(${dir * 1 * factor * frameW}px)`;
    }

    const t0 = performance.now();
    let settled = false;

    function frame(now) {
      const elapsed = now - t0;
      const t = elapsed / TRANSITION_MS;
      const c = coverAt(Math.min(t, 1));

      if (dir > 0) {
        from.style.clipPath = `inset(0 ${c * 100}% 0 0)`;
      } else {
        from.style.clipPath = `inset(0 0 0 ${c * 100}%)`;
      }

      for (const layer of Object.values(fromLayers)) {
        layer.style.transform = `translateX(${-dir * c * 0.14 * frameW}px)`;
      }

      // B parallax: starts at t=0.5, k = easeOutQuad((t-0.5)/0.42)
      const kRaw = (t - 0.5) / 0.42;
      const k = easeOutQuad(Math.max(0, Math.min(1, kRaw)));
      for (const [key, layer] of Object.entries(toLayers)) {
        const factor = LAYER_FACTORS[key];
        layer.style.transform = `translateX(${dir * (1 - k) * factor * frameW}px)`;
      }

      if (t >= 1 && k >= 1) {
        settled = true;
        from.classList.remove("is-current");
        from.style.visibility = "hidden";
        from.style.zIndex = "0";
        clearSlideFx(from);

        to.classList.remove("is-incoming");
        to.classList.add("is-current");
        to.style.visibility = "visible";
        to.style.zIndex = "2";
        clearSlideFx(to);

        busy = false;
        return;
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    // safety: if k needs time past 970ms
    // loop continues until k==1; ensure we don't hang
    const maxMs = TRANSITION_MS + 900;
    setTimeout(() => {
      if (!settled && busy && index === nextIndex) {
        cancelAnimationFrame(raf);
        from.classList.remove("is-current");
        from.style.visibility = "hidden";
        from.style.zIndex = "0";
        clearSlideFx(from);
        to.classList.remove("is-incoming");
        to.classList.add("is-current");
        to.style.visibility = "visible";
        to.style.zIndex = "2";
        clearSlideFx(to);
        busy = false;
      }
    }, maxMs);
  }

  function nextFlavour() {
    goTo(index + 1, 1);
  }

  function prevFlavour() {
    goTo(index - 1, -1);
  }

  function interact() {
    lastInteract = performance.now();
  }

  function scheduleAutoplay() {
    clearInterval(autoTimer);
    autoTimer = window.setInterval(() => {
      if (document.hidden) return;
      if (busy) return;
      if (performance.now() - lastInteract < IDLE_PAUSE_MS) return;
      nextFlavour();
    }, AUTOPLAY_MS);
  }

  function onKey(e) {
    if (e.key === "ArrowRight") {
      interact();
      nextFlavour();
    } else if (e.key === "ArrowLeft") {
      interact();
      prevFlavour();
    }
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    pointerStart = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      interact();
      if (dx < 0) nextFlavour();
      else prevFlavour();
    }
  }

  function openSequence() {
    if (reducedMotion()) {
      wrap.classList.add("is-instant", "is-ready");
      return;
    }

    const berry = slides[0];
    const frameW = FRAME_W * u;
    const layers = {
      word: berry.querySelector('[data-layer="word"]'),
      shadow: berry.querySelector('[data-layer="shadow"]'),
      bottle: berry.querySelector('[data-layer="bottle"]'),
      fruit: berry.querySelector('[data-layer="fruit"]'),
      corner: berry.querySelector('[data-layer="corner"]'),
    };

    for (const [key, layer] of Object.entries(layers)) {
      const factor = LAYER_FACTORS[key];
      layer.style.transition = "none";
      layer.style.transform = `translateX(${factor * frameW}px)`;
    }
    void berry.offsetWidth;

    for (const layer of Object.values(layers)) {
      layer.style.transition = "transform 900ms cubic-bezier(0.22, 0.8, 0.3, 1)";
      layer.style.transform = "translateX(0)";
    }

    wrap.classList.add("is-ready");

    const failsafe = setTimeout(() => {
      wrap.classList.add("is-instant");
      for (const layer of Object.values(layers)) {
        layer.style.transition = "";
        layer.style.transform = "";
      }
    }, 3000);

    const clear = setTimeout(() => {
      for (const layer of Object.values(layers)) {
        layer.style.transition = "";
        layer.style.transform = "";
      }
      clearTimeout(failsafe);
    }, 1000);

    openSequence._clear = () => {
      clearTimeout(clear);
      clearTimeout(failsafe);
    };
  }

  prev.addEventListener("click", () => {
    interact();
    prevFlavour();
  });
  next.addEventListener("click", () => {
    interact();
    nextFlavour();
  });
  window.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  const onResize = () => layoutAll();
  window.addEventListener("resize", onResize);

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onMq = () => layoutAll();
  mq.addEventListener?.("change", onMq);

  layoutAll();
  lastInteract = performance.now();

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    layoutAll();
    openSequence();
    scheduleAutoplay();
  });

  // failsafe if fonts hang
  setTimeout(() => {
    if (!wrap.classList.contains("is-ready") && !wrap.classList.contains("is-instant")) {
      layoutAll();
      wrap.classList.add("is-ready", "is-instant");
      scheduleAutoplay();
    }
  }, 3000);

  return () => {
    busy = false;
    cancelAnimationFrame(raf);
    clearInterval(autoTimer);
    openSequence._clear?.();
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("resize", onResize);
    mq.removeEventListener?.("change", onMq);
    root.innerHTML = "";
  };
}
