import * as THREE from "three";
import { GLOBE_SHEETS, QUAD, WORK_SHEETS, globeShotForTile } from "./data";

const DEG = Math.PI / 180;
const BAND_H = [11, 14, 17, 21, 24, 21, 17, 14, 11];
const BAND_GAP = 2.1;
const PAPER = new THREE.Color("#E4DED3");
/** Gentle continuous spin (rad/s). Paused while dragging, lightbox open, or reduced motion. */
const IDLE_SPIN = 0.22;

function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function makeRenderer(canvas) {
  const prefs = ["default", "low-power", "high-performance", null];
  for (const powerPreference of prefs) {
    const contextAttrs = {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
      ...(powerPreference ? { powerPreference } : {}),
    };
    try {
      const gl =
        canvas.getContext("webgl2", contextAttrs) ||
        canvas.getContext("webgl", contextAttrs) ||
        canvas.getContext("experimental-webgl", contextAttrs);
      if (!gl) continue;
      return new THREE.WebGLRenderer({
        canvas,
        context: gl,
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: powerPreference || "default",
      });
    } catch {
      /* try next */
    }
  }
  return null;
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying float vFacing;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vec3 toCam = normalize(-mv.xyz);
  vFacing = clamp(dot(n, toCam), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform vec4 rect;
uniform float opacity;
uniform vec3 paper;
uniform float aspect;
varying vec2 vUv;
varying float vFacing;

float sdRoundBox(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main(){
  vec2 uv = vUv;
  // tile space centred, aspect-corrected
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float r = 0.085; // of tile height
  float d = sdRoundBox(p, vec2(aspect * 0.5, 0.5), r);
  float aa = 1.2 * fwidth(d);
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (mask * opacity < 0.003) discard;
  vec2 suv = rect.xy + uv * rect.zw;
  vec3 col = texture2D(map, suv).rgb;
  float rim = pow(1.0 - vFacing, 2.2) * 0.62;
  col = mix(col, paper, rim);
  float a = mask * opacity;
  gl_FragColor = vec4(col * a, a);
}
`;

function quadrantUV(qi) {
  // 0 TL, 1 TR, 2 BL, 3 BR — three.js UV, v=0 at bottom
  const u0 = qi % 2 === 0 ? 0 : 0.5;
  const v0 = qi < 2 ? 0.5 : 0;
  return { u0, v0, uw: 0.5, vh: 0.5 };
}

function cropRect(qi, tileAspect) {
  const q = quadrantUV(qi);
  const inset = 0.035;
  let u0 = q.u0 + q.uw * inset;
  let v0 = q.v0 + q.vh * inset;
  let uw = q.uw * (1 - 2 * inset);
  let vh = q.vh * (1 - 2 * inset);
  const sheetAspect = 1; // square sheets
  const availAspect = (uw / vh) * sheetAspect;
  if (tileAspect > availAspect) {
    const nh = uw / tileAspect;
    v0 += (vh - nh) * 0.5;
    vh = nh;
  } else {
    const nw = vh * tileAspect;
    u0 += (uw - nw) * 0.5;
    uw = nw;
  }
  return new THREE.Vector4(u0, v0, uw, vh);
}

function buildTiles(textures) {
  const rand = makeRng(20261113);
  const totalH = BAND_H.reduce((a, b) => a + b, 0) + BAND_GAP * (BAND_H.length - 1);
  const pole = (180 - totalH) / 2;
  let thetaCursor = pole;
  const bands = [];
  for (let bi = 0; bi < BAND_H.length; bi++) {
    const h = BAND_H[bi];
    const theta0 = thetaCursor * DEG;
    const theta1 = (thetaCursor + h) * DEG;
    const mid = (theta0 + theta1) * 0.5;
    const sinC = Math.max(0.08, Math.sin(mid));
    const raw = [];
    let sum = 0;
    let guard = 0;
    while (sum < Math.PI * 2 && guard < 80) {
      const arcH = h * DEG;
      const w = (arcH * (0.82 + rand() * 0.62)) / sinC;
      raw.push(w);
      sum += w + (BAND_GAP * DEG) / sinC;
      guard++;
    }
    const gap = (BAND_GAP * DEG) / sinC;
    const totalGaps = raw.length * gap;
    const scale = (Math.PI * 2 - totalGaps) / raw.reduce((a, b) => a + b, 0);
    const widths = raw.map((w) => w * scale);
    let phi0 = rand() * Math.PI * 2;
    const tiles = [];
    for (let ti = 0; ti < widths.length; ti++) {
      let th0 = theta0;
      let th1 = theta1;
      let thLen = th1 - th0;
      if (rand() < 0.45) {
        const cut = thLen * rand() * 0.2;
        if (rand() < 0.5) th0 += cut;
        else th1 -= cut;
        thLen = th1 - th0;
      }
      const phiLen = widths[ti];
      const midLat = (th0 + th1) * 0.5;
      const arcW = phiLen * Math.sin(midLat);
      const arcH = thLen;
      const aspect = arcW / Math.max(1e-6, arcH);
      tiles.push({
        bi,
        phi0,
        phiLen,
        th0,
        thLen,
        aspect,
        lon: phi0 + phiLen * 0.5,
      });
      phi0 += phiLen + gap;
    }
    bands.push({ bi, tiles, theta0, theta1 });
    thetaCursor += h + (bi < BAND_H.length - 1 ? BAND_GAP : 0);
  }

  const meshes = [];
  let n = 0;
  for (const band of bands) {
    for (const t of band.tiles) {
      const sheet = n % 8;
      const qi = Math.floor(n / 8) % 4;
      const segsPhi = Math.max(6, Math.ceil(t.phiLen / (3 * DEG)));
      const segsTh = Math.max(6, Math.ceil(t.thLen / (3 * DEG)));
      const geo = new THREE.SphereGeometry(1, segsPhi, segsTh, t.phi0, t.phiLen, t.th0, t.thLen);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        side: THREE.FrontSide,
        uniforms: {
          map: { value: textures[sheet] },
          rect: { value: cropRect(qi, t.aspect) },
          opacity: { value: 0 },
          paper: { value: PAPER },
          aspect: { value: t.aspect },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = {
        bi: t.bi,
        lon: t.lon,
        ringFromBottom: BAND_H.length - 1 - t.bi,
        opacity: mat.uniforms.opacity,
      };
      meshes.push(mesh);
      n++;
    }
  }
  return meshes;
}

function easeOutCubic(p) {
  return 1 - Math.pow(1 - p, 3);
}

const CSS_QUADS = [
  "0% 0%",
  "100% 0%",
  "0% 100%",
  "100% 100%",
];

function attachLightbox(root) {
  const lit = root.querySelector("[data-lit]");
  const plate = root.querySelector("[data-lit-plate]");
  const photo = root.querySelector("[data-lit-photo]");
  const titleEl = root.querySelector("[data-lit-title]");
  const whereEl = root.querySelector("[data-lit-where]");
  if (!lit || !plate || !photo) {
    return {
      open() {},
      close() {},
      isOpen: () => false,
      dispose() {},
    };
  }

  let openIdx = -1;
  let sourceEl = null;
  let closeTimer = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function open(nOrShot, fromEl) {
    const shot =
      typeof nOrShot === "number" || typeof nOrShot === "string"
        ? globeShotForTile(+nOrShot)
        : nOrShot;
    openIdx = typeof nOrShot === "number" ? nOrShot : 1;
    sourceEl = fromEl || null;
    root.dataset.litOpen = "";
    lit.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    titleEl.textContent = shot.title;
    whereEl.textContent = shot.place;
    photo.style.backgroundImage = `url("${shot.url}")`;
    photo.style.backgroundPosition = shot.pos;

    if (reduced || !fromEl) {
      plate.style.transition = "none";
      plate.style.transform = "";
      plate.getBoundingClientRect();
      plate.style.transition = "";
      return;
    }

    // FLIP: tile → plate
    const from = fromEl.getBoundingClientRect();
    // ensure plate is laid out at final size
    plate.style.transition = "none";
    plate.style.transform = "";
    const to = plate.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const sc = Math.max(0.04, from.width / Math.max(1, to.width));
    plate.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
    plate.getBoundingClientRect();
    plate.style.transition = "";
    plate.style.transform = "";

    if (fromEl) fromEl.style.opacity = "0";
  }

  function close() {
    if (openIdx < 0) return;
    const el = sourceEl;
    openIdx = -1;
    clearTimeout(closeTimer);
    lit.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";

    const finish = () => {
      root.removeAttribute("data-lit-open");
      plate.style.transition = "none";
      plate.style.transform = "";
      plate.getBoundingClientRect();
      plate.style.transition = "";
      if (el) el.style.opacity = "";
      sourceEl = null;
    };

    if (!el || reduced) {
      finish();
      return;
    }

    const from = plate.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    if (to.width < 2 || to.height < 2) {
      finish();
      return;
    }
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const sc = Math.max(0.04, to.width / Math.max(1, from.width));
    plate.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
    closeTimer = window.setTimeout(finish, 640);
  }

  lit.querySelectorAll("[data-lit-close]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      close();
    });
  });
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  addEventListener("keydown", onKey);

  return {
    open,
    close,
    isOpen: () => openIdx >= 0,
    dispose() {
      removeEventListener("keydown", onKey);
      clearTimeout(closeTimer);
      document.documentElement.style.overflow = "";
      delete root.dataset.litOpen;
    },
  };
}

/** CSS 3D photo globe — used when WebGL is blocked (sandboxed Chrome) or textures fail. */
function mountDomGlobe(root, wrap, canvas, reduced, cleanups, lightbox) {
  if (canvas) canvas.style.display = "none";
  document.documentElement.classList.add("no-webgl");
  const fallback = wrap.querySelector(".globeFallback");
  if (fallback) fallback.style.display = "none";

  const stage = document.createElement("div");
  stage.className = "globeDom";
  stage.setAttribute("role", "img");
  stage.setAttribute(
    "aria-label",
    "A slowly turning globe of photographs: red wine by candlelight, clay cups on the wheel, figs on terracotta, linen tables and stone walls. Drag to spin it.",
  );
  const ball = document.createElement("div");
  ball.className = "globeBall";
  stage.appendChild(ball);
  wrap.appendChild(stage);

  const rand = makeRng(20261113);
  const tiles = [];

  // Latitude rings sized like the WebGL bands (deg from equator)
  const lats = [];
  {
    const totalH = BAND_H.reduce((a, b) => a + b, 0) + BAND_GAP * (BAND_H.length - 1);
    const pole = (180 - totalH) / 2;
    let cursor = pole;
    for (let bi = 0; bi < BAND_H.length; bi++) {
      const h = BAND_H[bi];
      const mid = cursor + h / 2;
      lats.push({ bi, lat: 90 - mid, h });
      cursor += h + (bi < BAND_H.length - 1 ? BAND_GAP : 0);
    }
  }

  // Freeze random layout once (unit sphere), then scale to wrapper size
  const layout = [];
  {
    let n = 0;
    lats.forEach((band, bi) => {
      const latRad = band.lat * DEG;
      const cos = Math.max(0.18, Math.cos(latRad));
      const arcH = band.h * DEG;
      const baseW = (arcH * (0.95 + rand() * 0.35)) / cos;
      const gap = (BAND_GAP * DEG) / cos;
      const count = Math.max(6, Math.round((2 * Math.PI) / (baseW + gap)));
      const step = 360 / count;
      const offset = (bi % 2) * step * 0.5 + rand() * 8;
      for (let i = 0; i < count; i++) {
        let hScale = 1;
        if (rand() < 0.45) hScale = 1 - rand() * 0.2;
        const wScale = 0.88 + rand() * 0.3;
        layout.push({
          lat: band.lat,
          lon: i * step + offset,
          bi,
          hNorm: arcH * hScale,
          wNorm: arcH * wScale * (0.95 + 0.2 * (i % 3 === 0 ? 1 : 0)),
          delay: (BAND_H.length - 1 - bi) * 0.2 + (i / count) * 0.42,
          sheet: GLOBE_SHEETS[n % 8],
          qi: Math.floor(n / 8) % 4,
          n,
        });
        n++;
      }
    });
  }

  function rebuild() {
    const size = wrap.clientWidth;
    const R = size * 0.465;
    ball.innerHTML = "";
    tiles.length = 0;
    layout.forEach((L) => {
      const h = L.hNorm * R;
      const w = Math.max(h * 0.85, L.wNorm * R * Math.max(0.35, Math.cos(L.lat * DEG)));
      const el = document.createElement("div");
      el.className = "gTile";
      el.dataset.tile = String(L.n);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.marginLeft = `${-w / 2}px`;
      el.style.marginTop = `${-h / 2}px`;
      el.style.backgroundImage = `url("${L.sheet}")`;
      el.style.backgroundPosition = CSS_QUADS[L.qi];
      el.style.borderRadius = `${Math.max(6, h * 0.085)}px`;
      el.style.transform = `rotateY(${L.lon}deg) rotateX(${-L.lat}deg) translateZ(${R}px)`;
      ball.appendChild(el);
      tiles.push({ el, lat: L.lat, lon: L.lon, delay: L.delay, n: L.n, sheet: L.sheet, qi: L.qi });
    });
    applyPose(true);
  }

  let yaw = -0.6 * (180 / Math.PI);
  let tilt = 0.2 * (180 / Math.PI);
  let vel = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragVel = 0;
  let introT0 = 0;
  let introDone = reduced;
  let tilesBuilt = reduced;
  let visible = true;
  let disposedLocal = false;
  let raf = 0;

  function applyPose(forceOpacity) {
    ball.style.transform = `rotateX(${tilt}deg) rotateY(${yaw}deg)`;
    if (!forceOpacity && !tilesBuilt) return;
    const yawRad = yaw * DEG;
    tiles.forEach((t) => {
      const lon = t.lon * DEG + yawRad;
      const lat = t.lat * DEG;
      // facing the camera (z toward viewer after yaw)
      const z = Math.cos(lat) * Math.cos(lon);
      const face = Math.max(0, z);
      const rim = Math.pow(1 - face, 2.2) * 0.55;
      const base = tilesBuilt ? 1 : parseFloat(t.el.style.opacity) || 0;
      const op = tilesBuilt ? 1 - rim * 0.85 : base;
      t.el.style.opacity = String(Math.max(0.05, op) * (z < -0.02 ? 0 : 1));
      t.el.style.transform = `rotateY(${t.lon}deg) rotateX(${-t.lat}deg) translateZ(${wrap.clientWidth * 0.465}px)`;
    });
  }

  rebuild();
  const ro = new ResizeObserver(() => rebuild());
  ro.observe(wrap);
  cleanups.push(() => ro.disconnect());

  function setAllVisible() {
    tiles.forEach((t) => {
      t.el.style.opacity = "1";
    });
    tilesBuilt = true;
    applyPose(true);
  }

  if (reduced) {
    ball.style.transform = `rotateX(${tilt}deg) rotateY(${yaw}deg) scale3d(1,1,1)`;
    setAllVisible();
    introDone = true;
  } else {
    introT0 = performance.now();
    ball.style.transform = `rotateX(${tilt}deg) rotateY(${yaw}deg) scale3d(0.42, 0.09, 0.42) translateY(${wrap.clientWidth * 0.28}px)`;
  }

  let downTile = null;
  let dragMarked = false;
  let downX = 0;
  let downY = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || lightbox?.isOpen()) return;
    downTile = e.target.closest(".gTile");
    dragMarked = false;
    dragging = true;
    downX = e.clientX;
    downY = e.clientY;
    root.classList.add("is-dragging");
    vel = 0;
    dragVel = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {}
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) dragMarked = true;
    lastX = e.clientX;
    lastY = e.clientY;
    const k = (2.6 / Math.max(1, wrap.clientWidth)) * (180 / Math.PI);
    yaw += dx * k;
    tilt += dy * k * 0.8;
    tilt = Math.max(-0.55 * (180 / Math.PI), Math.min(0.75 * (180 / Math.PI), tilt));
    dragVel = 0.6 * dragVel + 0.4 * dx * k * 60;
    applyPose(true);
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove("is-dragging");
    vel = Math.max(-6, Math.min(6, dragVel * (Math.PI / 180)));
    if (!dragMarked && downTile && tilesBuilt && lightbox) {
      const n = +downTile.dataset.tile;
      if (Number.isFinite(n)) lightbox.open(n, downTile);
    }
    downTile = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  let lastScrollY = scrollY;
  const onWinScroll = () => {
    if (reduced) return;
    const dy = scrollY - lastScrollY;
    lastScrollY = scrollY;
    vel = Math.max(-6, Math.min(6, vel + dy * 0.0042));
  };
  addEventListener("scroll", onWinScroll, { passive: true });
  cleanups.push(() => removeEventListener("scroll", onWinScroll));

  const ioVis = new IntersectionObserver(
    (entries) => {
      visible = entries.some((en) => en.isIntersecting);
    },
    { rootMargin: "120px" },
  );
  ioVis.observe(wrap);
  cleanups.push(() => ioVis.disconnect());

  let last = performance.now();
  function loop(now) {
    if (disposedLocal) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (lightbox?.isOpen()) return;
    if (!visible && introDone && tilesBuilt && !dragging) return;

    if (introT0 && !introDone) {
      const p = easeOutCubic(Math.min(1, (now - introT0) / 1100));
      const s = 0.42 + 0.58 * p;
      const sy = s * (0.22 + 0.78 * p);
      const rise = -(1 - p) * wrap.clientWidth * 0.28;
      if (!dragging && !reduced) yaw += Math.pow(1 - p, 2) * 2.6 * dt * (180 / Math.PI);
      ball.style.transform = `rotateX(${tilt}deg) rotateY(${yaw}deg) scale3d(${s},${sy},${s}) translateY(${rise}px)`;
      if (p >= 1) {
        introDone = true;
        ball.style.transform = `rotateX(${tilt}deg) rotateY(${yaw}deg)`;
      }
    }

    if (introT0 && !tilesBuilt && !reduced) {
      const t = (now - introT0) / 1000;
      let allDone = true;
      tiles.forEach((tile) => {
        const local = (t - tile.delay) / 0.5;
        if (local < 1) allDone = false;
        const q = easeOutCubic(Math.max(0, Math.min(1, local)));
        tile.el.style.opacity = String(q);
        const sc = 0.9 + 0.1 * q;
        tile.el.style.transform = `rotateY(${tile.lon}deg) rotateX(${-tile.lat}deg) translateZ(${wrap.clientWidth * 0.465}px) scale(${sc})`;
      });
      if (t > 3.2 || allDone) setAllVisible();
    }

    if (!dragging && !reduced) {
      // coast from scroll/drag, then keep a soft idle spin
      yaw += (vel + IDLE_SPIN) * dt * (180 / Math.PI);
      vel *= Math.exp(-2.6 * dt);
      if (Math.abs(vel) < 0.02) vel = 0;
      const k = 1 - Math.exp(-2.2 * dt);
      const rest = 0.2 * (180 / Math.PI);
      tilt += (rest - tilt) * k;
    }
    if (introDone) applyPose(tilesBuilt);

    // keep transforms on tiles when spinning
    if (tilesBuilt || introDone) {
      const R = wrap.clientWidth * 0.465;
      tiles.forEach((t) => {
        const lon = t.lon * DEG + yaw * DEG;
        const lat = t.lat * DEG;
        const z = Math.cos(lat) * Math.cos(lon);
        t.el.style.transform = `rotateY(${t.lon}deg) rotateX(${-t.lat}deg) translateZ(${R}px)`;
        if (tilesBuilt) {
          const face = Math.max(0, z);
          const rim = Math.pow(1 - face, 2.2) * 0.62;
          t.el.style.opacity = z < -0.05 ? "0" : String(1 - rim * 0.9);
        }
      });
    }
  }
  raf = requestAnimationFrame(loop);
  cleanups.push(() => {
    disposedLocal = true;
    cancelAnimationFrame(raf);
    stage.remove();
  });
}

export function mountOstra(root) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnim =
    !reduced &&
    typeof IntersectionObserver !== "undefined" &&
    typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function";

  if (canAnim) document.documentElement.classList.add("anim");
  else document.documentElement.classList.remove("anim");

  const wrap = root.querySelector("[data-globe-wrap]");
  const canvas = root.querySelector("[data-globe]");
  const track = root.querySelector("[data-work-track]");
  const workRail = root.querySelector("[data-work]");
  if (!wrap || !canvas) return () => {};

  let disposed = false;
  let raf = 0;
  const cleanups = [];
  const lightbox = attachLightbox(root);
  cleanups.push(() => lightbox.dispose());

  // ---- text reveals ----
  const easeRise = "cubic-bezier(.22,.8,.24,1)";
  function rise(el, delay = 0, dur = 1000) {
    if (!canAnim || !el) return;
    try {
      el.style.opacity = "1";
      el.animate(
        [
          { opacity: 0, transform: "translateY(18px)", filter: "blur(6px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        ],
        { duration: dur, delay, easing: easeRise, fill: "backwards" },
      );
    } catch {
      document.documentElement.classList.remove("anim");
    }
  }

  try {
    if (canAnim) {
      rise(root.querySelector(".gh-kicker"), 0, 1000);
      const lines = root.querySelectorAll("[data-h1-line]");
      lines.forEach((span, i) => {
        span.style.transform = "translateY(0)";
        span.animate(
          [{ transform: "translateY(105%)" }, { transform: "translateY(0)" }],
          {
            duration: 1100,
            delay: i === 0 ? 120 : 230,
            easing: "cubic-bezier(.2,.75,.15,1)",
            fill: "backwards",
          },
        );
      });
      rise(root.querySelector(".gh-hint"), 420, 1000);

      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            const el = /** @type {HTMLElement} */ (en.target);
            io.unobserve(el);
            if (el.classList.contains("card")) {
              const i = +el.dataset.cardI || 0;
              const d = Math.min(i, 4) * 110;
              rise(el, d, 1000);
              continue;
            }
            if (el.classList.contains("albumTitle")) {
              el.querySelectorAll(".hmask > span").forEach((span, i) => {
                span.style.transform = "translateY(0)";
                span.animate(
                  [{ transform: "translateY(105%)" }, { transform: "translateY(0)" }],
                  {
                    duration: 1000,
                    delay: 80 + i * 100,
                    easing: "cubic-bezier(.2,.75,.15,1)",
                    fill: "backwards",
                  },
                );
              });
              el.style.opacity = "1";
              continue;
            }
            rise(el, 0, 1000);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
      );
      root.querySelectorAll("[data-reveal]:not([data-reveal-on='load'])").forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }
  } catch {
    document.documentElement.classList.remove("anim");
  }

  // Album strip → same lightbox as the globe
  if (workRail) {
    workRail.addEventListener("click", (e) => {
      const card = e.target.closest("[data-album-card]");
      if (!card) return;
      e.preventDefault();
      const sheet = card.dataset.sheet;
      const quad = card.dataset.quad;
      if (!sheet || !quad || !WORK_SHEETS[sheet]) return;
      lightbox.open(
        {
          title: card.dataset.title || "Still",
          place: card.dataset.place || "",
          url: WORK_SHEETS[sheet],
          pos: QUAD[quad] || "0% 0%",
        },
        card.querySelector(".cardImg") || card,
      );
    });
  }

  // ---- work slider ----
  let slideTimer = 0;
  let sliding = false;
  if (track && workRail) {
    if (reduced) {
      root.classList.add("rm-scroll");
    } else {
      const tick = () => {
        if (disposed || sliding || document.hidden) return;
        sliding = true;
        const first = track.children[0];
        if (!first) {
          sliding = false;
          return;
        }
        const step = first.getBoundingClientRect().width + 17;
        const anim = track.animate(
          [{ transform: "translateX(0)" }, { transform: `translateX(${-step}px)` }],
          { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" },
        );
        anim.onfinish = () => {
          track.appendChild(first);
          track.style.transform = "translateX(0)";
          anim.cancel();
          sliding = false;
        };
      };
      slideTimer = window.setInterval(tick, 2400);
      cleanups.push(() => clearInterval(slideTimer));
    }
  }

  // ---- globe ----
  const renderer = makeRenderer(canvas);
  let meshes = [];

  if (!renderer) {
    mountDomGlobe(root, wrap, canvas, reduced, cleanups, lightbox);
  } else {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const fov = ((2 * Math.asin(1 / 3.7) * 180) / Math.PI) * 1.015;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 20);
    camera.position.z = 3.7;

    const group = new THREE.Group();
    group.rotation.x = 0.2;
    group.rotation.y = -0.6;
    scene.add(group);

    let vel = 0;
    let tilt = 0.2;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragVel = 0;
    let introDone = reduced;
    let tilesBuilt = reduced;
    let introT0 = 0;
    let visible = true;
    let switchedToDom = false;

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    function resize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    cleanups.push(() => ro.disconnect());

    function assignDelays() {
      const byRing = new Map();
      meshes.forEach((m) => {
        const k = m.userData.ringFromBottom;
        if (!byRing.has(k)) byRing.set(k, []);
        byRing.get(k).push(m);
      });
      byRing.forEach((list, ring) => {
        list.sort((a, b) => a.userData.lon - b.userData.lon);
        list.forEach((m, i) => {
          m.userData.delay = ring * 0.2 + (i / Math.max(1, list.length)) * 0.42;
          m.scale.setScalar(0.9);
        });
      });
    }

    function setAllVisible() {
      meshes.forEach((m) => {
        m.userData.opacity.value = 1;
        m.scale.setScalar(1);
      });
      tilesBuilt = true;
    }

    function startIntro(now) {
      introT0 = now;
      if (reduced) {
        group.scale.set(1, 1, 1);
        group.position.y = 0;
        setAllVisible();
        introDone = true;
      }
    }

    function fallToDom() {
      if (switchedToDom || disposed) return;
      switchedToDom = true;
      try {
        renderer.dispose();
      } catch {}
      mountDomGlobe(root, wrap, canvas, reduced, cleanups, lightbox);
    }

    Promise.all(
      GLOBE_SHEETS.map(
        (url) =>
          new Promise((res) => {
            loader.load(
              url,
              (tex) => {
                tex.colorSpace = THREE.LinearSRGBColorSpace;
                tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
                tex.needsUpdate = true;
                res(tex);
              },
              undefined,
              () => res(null),
            );
          }),
      ),
    ).then((texs) => {
      if (disposed || switchedToDom) return;
      const ok = texs.every(Boolean);
      if (!ok) {
        fallToDom();
        return;
      }
      meshes = buildTiles(texs);
      meshes.forEach((m, i) => {
        m.userData.n = i;
        group.add(m);
      });
      assignDelays();
      if (reduced) setAllVisible();
      startIntro(performance.now());
    });

    const safety = setTimeout(() => {
      if (switchedToDom) return;
      if (!meshes.length) {
        fallToDom();
        return;
      }
      if (!introT0) startIntro(performance.now());
    }, 4000);
    cleanups.push(() => clearTimeout(safety));

    let dragMarked = false;
    let downX = 0;
    let downY = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    canvas.addEventListener("pointerdown", (e) => {
      if (switchedToDom || e.button !== 0 || lightbox.isOpen()) return;
      dragging = true;
      dragMarked = false;
      downX = e.clientX;
      downY = e.clientY;
      canvas.classList.add("drag");
      root.classList.add("is-dragging");
      vel = 0;
      dragVel = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging || switchedToDom) return;
      if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) dragMarked = true;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const k = 2.6 / Math.max(1, wrap.clientWidth);
      group.rotation.y += dx * k;
      tilt += dy * k * 0.8;
      tilt = Math.max(-0.55, Math.min(0.75, tilt));
      group.rotation.x = tilt;
      dragVel = 0.6 * dragVel + 0.4 * (dx * k * 60);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove("drag");
      root.classList.remove("is-dragging");
      vel = Math.max(-6, Math.min(6, dragVel));
      if (!dragMarked && tilesBuilt && !switchedToDom && e) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length) {
          const n = hits[0].object.userData.n ?? 0;
          // synthetic from-rect at click for FLIP
          const ghost = document.createElement("div");
          ghost.style.cssText = `position:fixed;left:${e.clientX - 40}px;top:${e.clientY - 30}px;width:80px;height:60px;pointer-events:none;opacity:0`;
          document.body.appendChild(ghost);
          lightbox.open(n, ghost);
          setTimeout(() => ghost.remove(), 700);
        }
      }
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    let lastScrollY = scrollY;
    const onWinScroll = () => {
      if (reduced || switchedToDom) return;
      const dy = scrollY - lastScrollY;
      lastScrollY = scrollY;
      vel = Math.max(-6, Math.min(6, vel + dy * 0.0042));
    };
    addEventListener("scroll", onWinScroll, { passive: true });
    cleanups.push(() => removeEventListener("scroll", onWinScroll));

    const ioVis = new IntersectionObserver(
      (entries) => {
        visible = entries.some((en) => en.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    ioVis.observe(wrap);
    cleanups.push(() => ioVis.disconnect());

    let last = performance.now();
    function loop(now) {
      if (disposed || switchedToDom) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (lightbox.isOpen()) {
        renderer.render(scene, camera);
        return;
      }

      if (!visible && introDone && tilesBuilt && !dragging) {
        renderer.render(scene, camera);
        return;
      }

      if (introT0 && !introDone) {
        const p = easeOutCubic(Math.min(1, (now - introT0) / 1100));
        const s = 0.42 + 0.58 * p;
        const sy = s * (0.22 + 0.78 * p);
        group.scale.set(s, sy, s);
        group.position.y = -(1 - p) * 0.62;
        if (!dragging && !reduced) {
          group.rotation.y += Math.pow(1 - p, 2) * 2.6 * dt;
        }
        if (p >= 1) {
          group.scale.set(1, 1, 1);
          group.position.y = 0;
          introDone = true;
        }
      }

      if (introT0 && !tilesBuilt && !reduced) {
        const t = (now - introT0) / 1000;
        let allDone = true;
        meshes.forEach((m) => {
          const local = (t - m.userData.delay) / 0.5;
          if (local < 1) allDone = false;
          const q = easeOutCubic(Math.max(0, Math.min(1, local)));
          m.userData.opacity.value = q;
          m.scale.setScalar(0.9 + 0.1 * q);
        });
        if (t > 3.2 || allDone) setAllVisible();
      }

      if (!dragging && !reduced) {
        group.rotation.y += (vel + IDLE_SPIN) * dt;
        vel *= Math.exp(-2.6 * dt);
        if (Math.abs(vel) < 0.02) vel = 0;
        const k = 1 - Math.exp(-2.2 * dt);
        tilt += (0.2 - tilt) * k;
        group.rotation.x = tilt;
      } else if (!dragging && reduced) {
        group.rotation.x = 0.2;
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);
    cleanups.push(() => {
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      try {
        renderer.dispose();
      } catch {}
    });
  }

  // Keep Kolibrie / site chrome out of the way while this letter is on screen
  const overlay = [
    ...document.querySelectorAll(
      "[data-kolibrie] [data-nav], [data-kolibrie] [data-cursor-label], [data-kolibrie] [data-wipe], nav[aria-label='Site']",
    ),
  ];
  const hideChrome = (on) => {
    overlay.forEach((el) => {
      el.style.opacity = on ? "0" : "";
      el.style.pointerEvents = on ? "none" : "";
      el.style.visibility = on ? "hidden" : "";
    });
  };
  const ioChrome = new IntersectionObserver(
    (entries) => {
      hideChrome(entries.some((en) => en.isIntersecting && en.intersectionRatio > 0.08));
    },
    { threshold: [0, 0.08, 0.2, 0.5] },
  );
  ioChrome.observe(root);
  cleanups.push(() => {
    ioChrome.disconnect();
    hideChrome(false);
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    cleanups.forEach((fn) => fn());
  };
}
