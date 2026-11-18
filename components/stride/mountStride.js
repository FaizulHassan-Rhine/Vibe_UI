import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  FLAVORS,
  BITS,
  SHEET_URL,
  BH,
  INSIDE_STEPS,
  sheetCrop,
} from "./data";
import { getBarGeometries, makeShadowTexture, resetBarGeometries } from "./barGeometry";
import { loadSheetImage, buildFlavorTextures } from "./textures";

const SLOT = [
  { dx: 0, dy: 0, h: 430, rz: 0, ry: 0 },
  { dx: 245, dy: 24, h: 330, rz: 4, ry: 16 },
  { dx: 452, dy: 44, h: 312, rz: 8, ry: 26 },
  { dx: 660, dy: 80, h: 296, rz: 12, ry: 34 },
  { dx: 860, dy: 118, h: 280, rz: 15, ry: 40 },
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function sineInOut(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** cubic-bezier(.25,.75,.2,1) sampled */
function glide(t) {
  t = clamp(t, 0, 1);
  // fitted: fast start, soft settle
  const c1x = 0.25,
    c1y = 0.75,
    c2x = 0.2,
    c2y = 1;
  // Newton solve for x, return y
  let x = t;
  for (let i = 0; i < 6; i++) {
    const u = 1 - x;
    const dx =
      3 * u * u * c1x + 6 * u * x * (c2x - c1x) + 3 * x * x * (1 - c2x);
    const bx =
      3 * u * u * x * c1x + 3 * u * x * x * c2x + x * x * x - t;
    if (Math.abs(dx) < 1e-6) break;
    x -= bx / dx;
  }
  const u = 1 - x;
  return 3 * u * u * x * c1y + 3 * u * x * x * c2y + x * x * x;
}

function slotAt(absK) {
  const k = clamp(Math.abs(absK), 0, 4);
  const i0 = Math.floor(k);
  const i1 = Math.min(4, i0 + 1);
  const t = k - i0;
  const a = SLOT[i0];
  const b = SLOT[i1];
  return {
    dx: lerp(a.dx, b.dx, t),
    dy: lerp(a.dy, b.dy, t),
    h: lerp(a.h, b.h, t),
    rz: lerp(a.rz, b.rz, t),
    ry: lerp(a.ry, b.ry, t),
  };
}

function matOpts(map) {
  return {
    map,
    transparent: true,
    alphaTest: 0.45,
    roughness: 0.45,
    metalness: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.42,
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

/** CSS fan when WebGL is blocked — same continuous pos/target carousel as the 3D path. */
function mountStrideFallback(root, styles, els) {
  const {
    canvas,
    hero,
    arc,
    reveal,
    titleEl,
    countEl,
    playBtn,
    autoBtn,
    intro,
    introVideo,
    skipBtn,
    logo,
    nav,
    rings,
    inside,
    inFront,
    inBar,
    inHead,
    inNum,
    inCap,
    inDark,
    inFrontFrame,
    shop,
    range,
    stormEl,
  } = els;
  if (canvas) canvas.style.display = "none";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => [...root.querySelectorAll(sel)];
  let disposed = false;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let phone = vw < 820;
  let u = Math.min(vw / 1440, vh / 900);
  let xSpread = 1;
  let pos = reduced ? 1 : -2.6;
  let target = 1;
  let tween = null;
  let autoOn = !reduced;
  let lastInteract = performance.now();
  let heroEntered = false;
  let drag = null;
  let raf = 0;
  let revealAnim = null;
  let insideStep = 0;
  let flipAngle = 0;
  let flipTween = null;
  let stormBuilt = false;
  let stormPieces = [];
  let phoneScrolledCard = false;

  const layer = document.createElement("div");
  layer.style.cssText =
    "position:absolute;inset:0;z-index:4;overflow:hidden;perspective:1600px;perspective-origin:50% 42%;touch-action:pan-y;cursor:grab";
  // 11 pooled slots so the fan can scroll continuously like the WebGL pool
  const pool = Array.from({ length: 11 }, () => {
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;left:0;top:0;border-radius:10px;box-shadow:0 28px 60px rgba(28,26,31,.28);will-change:transform,opacity;transform-origin:50% 100%;transform-style:preserve-3d;pointer-events:none;opacity:0";
    layer.appendChild(el);
    return { el, flavor: -1 };
  });
  (arc || hero || root).appendChild(layer);

  // Traveler bar that scrolls from the hero fan → Inside → Shop
  const traveler = document.createElement("div");
  traveler.style.cssText =
    "position:fixed;left:0;top:0;z-index:6;pointer-events:none;border-radius:10px;box-shadow:0 28px 60px rgba(28,26,31,.28);will-change:transform,opacity;transform-origin:50% 50%;opacity:0";
  Object.assign(traveler.style, sheetCrop(FLAVORS[1].wrap, 4));
  root.appendChild(traveler);
  let travelerFlavor = 1;

  const measureWord = (() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    return (text, size = 100) => {
      const fam =
        getComputedStyle(root).getPropertyValue("--font-archivo-black").trim() ||
        '"Archivo Black", sans-serif';
      ctx.font = `400 ${size}px ${fam}`;
      return ctx.measureText(text).width;
    };
  })();

  function setTitleSize(name) {
    if (!titleEl) return;
    const words = name.toUpperCase().split(" ");
    if (phone) {
      const longest = Math.max(...words.map((w) => measureWord(w)));
      titleEl.style.fontSize = `${Math.min(
        Math.max(40, Math.min(vw * 0.125, 64)),
        ((vw - 36) * 100) / longest,
      )}px`;
    } else {
      const w = measureWord(name);
      titleEl.style.fontSize = `${Math.min(96 * u, (760 * u * 100) / w)}px`;
    }
  }

  function renderTitle(name, dir = 1, animate = true) {
    if (!titleEl) return;
    setTitleSize(name);
    titleEl.innerHTML = "";
    let li = 0;
    name
      .toUpperCase()
      .split(" ")
      .forEach((word) => {
        const wrap = document.createElement("span");
        wrap.className = styles.titleWord || "titleWord";
        [...word].forEach((ch) => {
          const s = document.createElement("span");
          s.className = styles.titleCh || "titleCh";
          s.textContent = ch;
          if (animate && !reduced) {
            s.style.opacity = "0";
            s.style.transform = `translateY(${dir * 110}%)`;
            s.style.transition = `transform 620ms cubic-bezier(.22,1,.36,1) ${120 + li * 22}ms, opacity 620ms cubic-bezier(.22,1,.36,1) ${120 + li * 22}ms`;
          }
          wrap.appendChild(s);
          li++;
        });
        titleEl.appendChild(wrap);
      });
    if (animate && !reduced) {
      requestAnimationFrame(() => {
        titleEl.querySelectorAll(`.${styles.titleCh || "titleCh"}`).forEach((s) => {
          s.style.opacity = "1";
          s.style.transform = "translateY(0)";
        });
      });
    }
  }

  function fadeOutTitle(dir, cb) {
    if (reduced || !titleEl) {
      cb?.();
      return;
    }
    const letters = [...titleEl.querySelectorAll(`.${styles.titleCh || "titleCh"}`)];
    if (!letters.length) {
      cb?.();
      return;
    }
    letters.forEach((s, i) => {
      s.style.transition = `transform 300ms cubic-bezier(.45,0,.75,.3) ${i * 11}ms, opacity 300ms cubic-bezier(.45,0,.75,.3) ${i * 11}ms`;
      s.style.opacity = "0";
      s.style.transform = `translateY(${-dir * 110}%)`;
    });
    setTimeout(cb, 300 + letters.length * 11);
  }

  function setCount(n, animate = true) {
    if (!countEl) return;
    const text = String(n + 1).padStart(2, "0");
    if (!animate || reduced) {
      countEl.textContent = text;
      return;
    }
    countEl.style.transition =
      "opacity 220ms cubic-bezier(.5,0,.75,0), translate 220ms cubic-bezier(.5,0,.75,0)";
    countEl.style.opacity = "0";
    countEl.style.translate = "0 -10px";
    setTimeout(() => {
      countEl.textContent = text;
      countEl.style.transition = "none";
      countEl.style.translate = "0 14px";
      requestAnimationFrame(() => {
        countEl.style.transition =
          "opacity 380ms cubic-bezier(.22,1,.36,1), translate 380ms cubic-bezier(.22,1,.36,1)";
        countEl.style.opacity = "1";
        countEl.style.translate = "0 0";
      });
    }, 60);
  }

  function startReveal(color) {
    if (!reveal || reduced) {
      root.style.setProperty("--flav", color);
      return;
    }
    if (revealAnim) {
      root.style.setProperty("--flav", revealAnim.color);
      reveal.style.removeProperty("-webkit-mask-image");
      reveal.style.removeProperty("mask-image");
      reveal.style.setProperty("--rv", "transparent");
    }
    const hh = hero?.clientHeight || vh;
    const cx = vw / 2;
    const cy = phone ? hh * 0.4 : hh / 2 - 78 * u;
    const R =
      1.45 *
      Math.max(
        ...[
          [0, 0],
          [vw, 0],
          [0, hh],
          [vw, hh],
        ].map(([x, y]) => Math.hypot(x - cx, y - cy)),
      );
    revealAnim = { color, t0: performance.now(), dur: 420, cx, cy, R };
    reveal.style.setProperty("--rv", color);
  }

  function tickReveal(now) {
    if (!revealAnim || !reveal) return;
    const t = glide((now - revealAnim.t0) / revealAnim.dur);
    const r = revealAnim.R * t;
    const f = Math.max(60, 0.35 * r);
    const mask = `radial-gradient(circle at ${revealAnim.cx}px ${revealAnim.cy}px, #000 ${Math.max(0, r - f)}px, transparent ${r}px)`;
    reveal.style.webkitMaskImage = mask;
    reveal.style.maskImage = mask;
    if (t >= 1) {
      root.style.setProperty("--flav", revealAnim.color);
      reveal.style.setProperty("--rv", "transparent");
      reveal.style.removeProperty("-webkit-mask-image");
      reveal.style.removeProperty("mask-image");
      revealAnim = null;
    }
  }

  function onFlavorChange(fi, dir = 1) {
    const f = FLAVORS[fi];
    startReveal(f.color);
    fadeOutTitle(dir, () => renderTitle(f.name, dir, true));
    setCount(fi, true);
    lastInteract = performance.now();
  }

  function goTo(to, { fromDrag = false } = {}) {
    const prev = ((Math.round(target) % 5) + 5) % 5;
    target = to;
    const next = ((Math.round(target) % 5) + 5) % 5;
    const dist = Math.abs(to - pos);
    const dur = reduced
      ? 0
      : fromDrag
        ? Math.max(380, 650 * Math.min(1, dist + 0.35))
        : 650 + 160 * Math.max(0, Math.round(dist) - 1);
    const from = pos;
    const dir = to >= pos ? 1 : -1;
    tween = null;
    if (dur <= 0) {
      pos = to;
      if (next !== prev) onFlavorChange(next, dir);
      return;
    }
    tween = { from, to, t0: performance.now(), dur, prev, next, dir, fired: false };
  }

  function placeDomBar(item, st, flav) {
    const { el } = item;
    const { x, y, h, rz, ry, op = 1 } = st;
    if (op <= 0.01 || h < 2) {
      el.style.opacity = "0";
      return;
    }
    if (item.flavor !== flav) {
      item.flavor = flav;
      Object.assign(el.style, sheetCrop(FLAVORS[flav].wrap, 4));
    }
    const w = h / BH;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.opacity = String(op);
    el.style.zIndex = String(Math.round(40 + op * 20 - Math.abs(rz)));
    el.style.transform = `translate3d(${x - w / 2}px,${y - h / 2}px,0) rotate(${rz}deg) rotateY(${ry}deg)`;
  }

  function arcState(k, now) {
    const sign = k < 0 ? -1 : 1;
    const s = slotAt(k);
    const hh = hero?.clientHeight || vh;
    const cx = vw / 2;
    let cy = phone ? hh * 0.4 : hh / 2 - 78 * u;
    if (phone) {
      u = Math.min(vw / 560, hh / 980);
      xSpread = 1.02;
    } else {
      u = Math.min(vw / 1440, vh / 900);
      xSpread = 1;
    }
    let y = cy + s.dy * u;
    let rz = s.rz * sign;
    if (!reduced) {
      const bob = Math.sin((now / 2400) * Math.PI * 2 + k * 0.7) * 5;
      y += bob;
      rz += Math.sin((now / 3100) * Math.PI * 2 + k) * 0.6;
    }
    const abs = Math.abs(k);
    const op = abs > 3.2 ? 0 : abs > 2.4 ? lerp(1, 0, (abs - 2.4) / 0.8) : 1;
    return {
      x: cx + s.dx * u * xSpread * sign,
      y,
      h: s.h * u,
      rz,
      ry: s.ry * sign,
      op,
    };
  }

  function updateInsideFrames() {
    const k = phone
      ? Math.min(vw / 390, vh / 780)
      : Math.min(vw / 1440, vh / 900);
    root.style.setProperty("--k", String(k));
    q("[data-in-back]")?.style.setProperty("--k", String(k));
    inFrontFrame?.style.setProperty("--k", String(k));
  }

  function updateInsideText(step, fi, animate) {
    if (!inHead || !inNum || !inCap) return;
    const spec = INSIDE_STEPS[step];
    const headLines =
      spec.head ||
      FLAVORS[fi].name
        .toUpperCase()
        .split(" ");
    const capLines = spec.cap;
    const apply = () => {
      const long = headLines.some((w) => w.length > 9);
      inHead.style.fontSize =
        step === 3 && long ? (phone ? "29px" : "calc(88px * 0.72)") : "";
      inHead.innerHTML = headLines.join("<br>");
      inNum.textContent = String(step + 1).padStart(2, "0");
      inCap.innerHTML = capLines.join("<br>");
      qa("[data-in-icon]").forEach((el, i) => {
        el.classList.toggle(styles.active || "active", i === step);
        if (i === step) el.classList.add("active");
        else el.classList.remove("active");
      });
    };
    if (!animate || reduced) {
      apply();
      return;
    }
    const els = [inHead, inNum, inCap];
    els.forEach((el) => {
      el.style.transition =
        "opacity 240ms cubic-bezier(.5,0,.75,0), translate 240ms cubic-bezier(.5,0,.75,0)";
      el.style.opacity = "0";
      el.style.translate = "0 -10px";
    });
    setTimeout(() => {
      apply();
      els.forEach((el) => {
        el.style.transition = "none";
        el.style.translate = "0 14px";
        requestAnimationFrame(() => {
          el.style.transition =
            "opacity 460ms cubic-bezier(.22,1,.36,1), translate 460ms cubic-bezier(.22,1,.36,1)";
          el.style.opacity = "1";
          el.style.translate = "0 0";
        });
      });
    }, 40);
  }

  function startFlip(toAngle) {
    if (reduced) {
      flipAngle = toAngle;
      flipTween = null;
      return;
    }
    const from = flipAngle;
    const delta = toAngle - from;
    if (Math.abs(delta) < 0.01) return;
    const halfTurns = clamp(Math.abs(delta) / 180, 0.4, 2);
    const dur = 720 * halfTurns;
    flipTween = {
      from,
      to: toAngle,
      t0: performance.now(),
      dur,
      textAt: Math.min(dur, 720) * 0.38,
      textFired: false,
    };
  }

  function ensureStorm() {
    if (stormBuilt || !stormEl) return;
    stormBuilt = true;
    const fi = ((Math.round(target) % 5) + 5) % 5;
    for (let i = 0; i < 18; i++) {
      const bi = Math.random() < 0.8 ? FLAVORS[fi].bit : Math.floor(Math.random() * 5);
      const el = document.createElement("div");
      el.className = styles.stormPiece || "";
      Object.assign(el.style, sheetCrop(BITS[bi], 0));
      el.style.position = "absolute";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      stormEl.appendChild(el);
      const a = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const band = i % 3;
      stormPieces.push({
        el,
        a,
        spin: (i % 2 === 0 ? -1 : 1) * (160 + Math.random() * 180),
        size: band === 0 ? 0.9 + Math.random() * 0.25 : 0.7 + Math.random() * 0.35,
        orbit:
          band === 0
            ? 0.55 + Math.random() * 0.08
            : band === 1
              ? 0.72 + Math.random() * 0.08
              : 0.88 + Math.random() * 0.08,
      });
    }
  }

  function updateStorm(qStorm) {
    if (!stormEl || reduced || qStorm <= 0) {
      stormPieces.forEach((p) => {
        p.el.style.opacity = "0";
      });
      return;
    }
    ensureStorm();
    const cx = vw / 2;
    const cy = vh / 2;
    const reach = Math.min(vw, vh) * 0.48;
    stormPieces.forEach((p, i) => {
      const t = clamp((qStorm - i * 0.012) / 0.7, 0, 1);
      if (t <= 0) {
        p.el.style.opacity = "0";
        return;
      }
      const ang = p.a + qStorm * 0.9;
      const r = reach * p.orbit * (0.35 + 0.65 * easeInOut(t));
      const s = 70 * u * p.size;
      p.el.style.width = `${s}px`;
      p.el.style.height = `${s}px`;
      p.el.style.opacity = String(Math.min(1, t * 1.4) * (1 - clamp((qStorm - 0.85) / 0.15, 0, 1)));
      p.el.style.transform = `translate(${cx + Math.cos(ang) * r - s / 2}px,${cy + Math.sin(ang) * r - s / 2}px) rotate(${p.spin * qStorm}deg)`;
    });
  }

  function rectCenter(el) {
    if (!el) return { x: vw / 2, y: vh / 2, h: 200, w: 100 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width };
  }

  function placeTraveler(st, flav) {
    if (travelerFlavor !== flav) {
      travelerFlavor = flav;
      Object.assign(traveler.style, sheetCrop(FLAVORS[flav].wrap, 4));
    }
    const { x, y, h, rz = 0, ry = 0, op = 1 } = st;
    if (op <= 0.02 || h < 2) {
      traveler.style.opacity = "0";
      return;
    }
    const w = h / BH;
    traveler.style.width = `${w}px`;
    traveler.style.height = `${h}px`;
    traveler.style.opacity = String(op);
    traveler.style.transform = `translate3d(${x - w / 2}px,${y - h / 2}px,0) rotate(${rz}deg) rotateY(${ry}deg)`;
  }

  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);

    if (tween) {
      const t = clamp((now - tween.t0) / tween.dur, 0, 1);
      const e = tween.useEntrance ? 1 - Math.pow(1 - t, 3.2) : glide(t);
      pos = lerp(tween.from, tween.to, e);
      if (!tween.fired && t >= 0.12) {
        tween.fired = true;
        if (tween.next !== tween.prev) onFlavorChange(tween.next, tween.dir);
      }
      if (t >= 1) {
        pos = tween.to;
        tween = null;
      }
    }

    if (flipTween) {
      const t = clamp((now - flipTween.t0) / flipTween.dur, 0, 1);
      flipAngle = lerp(flipTween.from, flipTween.to, sineInOut(t));
      if (!flipTween.textFired && now - flipTween.t0 >= flipTween.textAt) {
        flipTween.textFired = true;
        const fi = ((Math.round(target) % 5) + 5) % 5;
        updateInsideText(insideStep, fi, true);
      }
      if (t >= 1) {
        flipAngle = flipTween.to;
        flipTween = null;
      }
    }

    tickReveal(now);

    if (
      autoOn &&
      heroEntered &&
      !drag &&
      !tween &&
      document.visibilityState === "visible"
    ) {
      const hr = (hero || root).getBoundingClientRect();
      const visible = hr.bottom > vh * 0.2 && hr.top < vh * 0.8;
      const ratio = Math.min(hr.bottom, vh) - Math.max(hr.top, 0);
      if (visible && ratio / Math.max(1, hr.height) >= 0.55 && now - lastInteract > 3200) {
        goTo(target + 1);
        lastInteract = now;
      }
    }

    const fi = ((Math.round(target) % 5) + 5) % 5;
    const jT = Math.round(target);
    const j0 = Math.floor(pos) - 5;

    // ---- scroll-driven Inside / Shop ----
    const secTop = inside?.getBoundingClientRect().top ?? vh;
    const secH = inside?.offsetHeight || vh;
    const pScroll = clamp(-secTop / Math.max(1, secH - vh), 0, 1);
    const step = Math.floor(Math.min(pScroll, 0.72) / 0.18);
    const qStorm = clamp((pScroll - 0.7) / 0.3, 0, 1);

    if (step !== insideStep && step >= 0 && step <= 3) {
      insideStep = step;
      startFlip(INSIDE_STEPS[step].ry);
      if (reduced) updateInsideText(step, fi, false);
    }

    if (inFront && inside) {
      const secRect = inside.getBoundingClientRect();
      let pinY = 0;
      if (secRect.top > 0) pinY = secRect.top;
      else if (secRect.bottom < vh) pinY = secRect.bottom - vh;
      const intersects = secRect.bottom > 0 && secRect.top < vh;
      inFront.classList.toggle(styles.on || "on", intersects);
      if (intersects) inFront.classList.add("on");
      else inFront.classList.remove("on");
      inFront.style.transform = `translateY(${pinY}px)`;
      inFront.style.opacity = "1";
      const uiFade = 1 - clamp(3.2 * qStorm, 0, 1);
      if (inFrontFrame) inFrontFrame.style.opacity = String(uiFade);
      if (inNum) inNum.style.opacity = String(uiFade);
      if (inDark) inDark.style.opacity = String(clamp(2.4 * qStorm, 0, 1) * 0.28);
    }
    updateStorm(qStorm);

    const p1 = clamp(1 - secTop / vh, 0, 1);
    const shopTop = shop?.getBoundingClientRect().top ?? vh * 2;
    const p3 = clamp((vh - shopTop) / (0.7 * vh), 0, 1);
    const heroFade = 1 - clamp(1.6 * p1, 0, 1);

    for (let i = 0; i < 11; i++) {
      const j = j0 + i;
      const flav = ((j % 5) + 5) % 5;
      const st = arcState(j - pos, now);
      st.op *= heroFade;
      // Hide the slot that the traveler owns
      if (j === jT) st.op = 0;
      placeDomBar(pool[i], st, flav);
    }

    // Traveler path: hero slot → inside pin → shop card
    const kT = jT - pos;
    let A = arcState(kT, now);
    A.op = Math.max(A.op, heroFade > 0.05 ? 1 : 0) * (p1 < 0.98 ? 1 : 0);
    // Convert arc (relative to hero/layer) to viewport coords — arcState already uses vw/vh centers
    const inR = rectCenter(inBar);
    const bob = reduced ? 0 : Math.sin((now / 2600) * Math.PI * 2) * 6;
    const B = {
      x: inR.x,
      y: inR.y + bob,
      h: Math.max(120, inR.h || 280 * u),
      rz: 14,
      ry: flipAngle + 400 * qStorm,
      op: clamp(p1 * 1.4, 0, 1) * (1 - clamp(3 * qStorm, 0, 1) * 0.15),
    };
    const pk = q(`[data-pk="${fi}"]`);
    const cardR = rectCenter(pk);
    const C = {
      x: cardR.x,
      y: cardR.y,
      h: Math.max(80, cardR.h || 200 * u),
      rz: 0,
      ry: Math.round(B.ry / 360) * 360,
      op: clamp(p3 * 1.5, 0, 1),
    };

    if (phone && p3 > 0 && !phoneScrolledCard) {
      phoneScrolledCard = true;
      q(`[data-card="${fi}"]`)?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
    }

    let st = { ...A, op: A.op * (p1 < 0.02 ? heroFade : 1) };
    if (p1 > 0) {
      const e = easeInOut(p1);
      st = {
        x: lerp(A.x, B.x, e),
        y: lerp(A.y, B.y, e),
        h: lerp(A.h, B.h, e),
        rz: lerp(A.rz, B.rz, e),
        ry: lerp(A.ry, B.ry, e),
        op: lerp(A.op * heroFade, B.op, e),
      };
    }
    if (p3 > 0) {
      const e = easeInOut(p3);
      st = {
        x: lerp(st.x, C.x, e),
        y: lerp(st.y, C.y, e),
        h: lerp(st.h, C.h, e),
        rz: lerp(st.rz, C.rz, e),
        ry: lerp(st.ry, C.ry, e),
        op: lerp(st.op, C.op, e),
      };
    }
    // While still fully in the hero, keep traveler with the fan; hide duplicate
    if (p1 <= 0.02) {
      traveler.style.opacity = "0";
      // show the center pool bar instead
      const center = pool.find((_, i) => j0 + i === jT);
      if (center) {
        const s = arcState(0, now);
        s.op = heroFade;
        placeDomBar(center, s, fi);
      }
    } else {
      placeTraveler(st, fi);
    }
  }

  function enterHero() {
    if (heroEntered) return;
    heroEntered = true;
    intro?.classList.add(styles.hide || "hide", "hide");
    root.classList.remove(styles.locked || "locked", "locked");
    document.body.classList.remove("locked");
    document.body.style.overflow = "";
    nav?.classList.add(styles.navIn || "navIn", "navIn");
    rings?.classList.add(styles.in || "in", "in");
    playBtn?.classList.add(styles.in || "in", "in");
    countEl?.classList.add(styles.in || "in", "in");
    autoBtn?.classList.add(styles.in || "in", "in");
    root.querySelectorAll("[data-bit]").forEach((el, i) => {
      el.style.animation = `none`;
      el.animate(
        [
          { transform: `${el.style.transform} translate(0,0) rotate(0deg)` },
          {
            transform: `${el.style.transform} translate(${(i % 2 ? 10 : -12) * u}px, ${(i % 3) * -8 * u}px) rotate(${i % 2 ? 6 : -5}deg)`,
          },
          { transform: `${el.style.transform} translate(0,0) rotate(0deg)` },
        ],
        {
          duration: 7000 + 900 * i,
          iterations: Infinity,
          easing: "ease-in-out",
          composite: "add",
        },
      );
    });
    renderTitle(FLAVORS[1].name, 1, false);
    setCount(1, false);
    root.style.setProperty("--flav", FLAVORS[1].color);
    if (reduced) {
      pos = 1;
      target = 1;
    } else {
      target = 1;
      pos = -2.6;
      tween = {
        from: -2.6,
        to: 1,
        t0: performance.now(),
        dur: 1700,
        prev: 1,
        next: 1,
        dir: 1,
        fired: true,
        useEntrance: true,
      };
    }
    lastInteract = performance.now();
  }

  function runIntro() {
    root.classList.add(styles.locked || "locked", "locked");
    document.body.classList.add("locked");
    document.body.style.overflow = "hidden";
    skipBtn?.addEventListener("click", enterHero);
    if (reduced) {
      enterHero();
      return;
    }
    const video = introVideo;
    const startAt = () => {
      try {
        video.currentTime = 0.55;
        video.play().catch(() => {});
      } catch {
        /* ignore */
      }
    };
    if (video?.readyState >= 3) startAt();
    else video?.addEventListener("canplay", startAt, { once: true });

    let logoShown = false;
    const showLogo = () => {
      if (logoShown || heroEntered) return;
      logoShown = true;
      try {
        video?.pause();
      } catch {
        /* ignore */
      }
      intro?.classList.add(styles.cream || "cream", "cream");
      logo?.classList.add(styles.show || "show", "show");
      setTimeout(() => {
        if (!heroEntered) enterHero();
      }, 650);
    };
    const onTime = () => {
      if (video && video.currentTime >= 4.6) {
        video.removeEventListener("timeupdate", onTime);
        showLogo();
      }
    };
    video?.addEventListener("timeupdate", onTime);
    video?.addEventListener("ended", showLogo);
    video?.addEventListener("error", showLogo);
    setTimeout(() => {
      if (!logoShown && !heroEntered) showLogo();
    }, 3500);
    setTimeout(() => {
      if (!heroEntered) enterHero();
    }, 9000);
  }

  const onPlay = () => {
    goTo(target + 1);
    lastInteract = performance.now();
  };
  const onAuto = () => {
    autoOn = !autoOn;
    autoBtn?.setAttribute("aria-pressed", autoOn ? "true" : "false");
    const icon = root.querySelector("[data-auto-icon]");
    if (icon) {
      icon.innerHTML = autoOn
        ? '<rect x="2" y="1.5" width="2" height="7" rx="0.6"/><rect x="6" y="1.5" width="2" height="7" rx="0.6"/>'
        : '<path d="M3 1.5v7l6-3.5z" fill="#fff"/>';
    }
    lastInteract = performance.now();
  };
  const onResize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    phone = vw < 820;
    u = Math.min(vw / 1440, vh / 900);
    const fi = ((Math.round(target) % 5) + 5) % 5;
    setTitleSize(FLAVORS[fi].name);
    updateInsideFrames();
  };

  const slotPx = () => Math.max(180, 245 * u * xSpread);
  const onPointerDown = (e) => {
    if (!heroEntered) return;
    drag = {
      x0: e.clientX,
      pos0: pos,
      t0: performance.now(),
      moved: false,
    };
    tween = null;
    layer.style.cursor = "grabbing";
    root.classList.add(styles.dragging || "dragging", "dragging");
    try {
      layer.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0;
    if (Math.abs(dx) > 4) drag.moved = true;
    pos = drag.pos0 - dx / slotPx();
    lastInteract = performance.now();
  };
  const onPointerUp = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0;
    const dt = Math.max(16, performance.now() - drag.t0);
    const v = -dx / dt;
    drag = null;
    layer.style.cursor = "grab";
    root.classList.remove(styles.dragging || "dragging", "dragging");
    const projected = pos - v * 180;
    goTo(Math.round(projected), { fromDrag: true });
    lastInteract = performance.now();
  };

  playBtn?.addEventListener("click", onPlay);
  autoBtn?.addEventListener("click", onAuto);
  window.addEventListener("resize", onResize);
  layer.addEventListener("pointerdown", onPointerDown);
  layer.addEventListener("pointermove", onPointerMove);
  layer.addEventListener("pointerup", onPointerUp);
  layer.addEventListener("pointercancel", onPointerUp);
  autoBtn?.setAttribute("aria-pressed", autoOn ? "true" : "false");

  qa("[data-in-icon]").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      if (!inside) return;
      const total = Math.max(1, inside.offsetHeight - vh);
      window.scrollTo({
        top: inside.offsetTop + (i * 0.18 + 0.02) * total,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  });

  const shopObs = shop
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            q("[data-shop-head]")?.classList.add(styles.revealed || "revealed", "revealed");
            q("[data-shop-cap]")?.classList.add(styles.revealed || "revealed", "revealed");
            qa("[data-card]").forEach((c, i) => {
              setTimeout(() => c.classList.add(styles.shown || "shown", "shown"), i * 80);
            });
            shopObs.disconnect();
          });
        },
        { threshold: 0.18 },
      )
    : null;
  if (shop && shopObs) shopObs.observe(shop);

  const rangeObs = range
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting)
              q("[data-range-head]")?.classList.add(styles.revealed || "revealed", "revealed");
          });
        },
        { threshold: 0.2 },
      )
    : null;
  if (range && rangeObs) rangeObs.observe(range);

  updateInsideFrames();
  updateInsideText(0, 1, false);
  raf = requestAnimationFrame(frame);
  runIntro();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    playBtn?.removeEventListener("click", onPlay);
    autoBtn?.removeEventListener("click", onAuto);
    skipBtn?.removeEventListener("click", enterHero);
    layer.removeEventListener("pointerdown", onPointerDown);
    layer.removeEventListener("pointermove", onPointerMove);
    layer.removeEventListener("pointerup", onPointerUp);
    layer.removeEventListener("pointercancel", onPointerUp);
    shopObs?.disconnect();
    rangeObs?.disconnect();
    layer.remove();
    traveler.remove();
    stormPieces.forEach((p) => p.el.remove());
    root.classList.remove(styles.locked || "locked", "locked", styles.dragging || "dragging", "dragging");
    document.body.classList.remove("locked");
    document.body.style.overflow = "";
  };
}

export function mountStride(root, styles) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => [...root.querySelectorAll(sel)];

  const canvas = q("#gl");
  const hero = q("[data-hero]");
  const reveal = q("[data-reveal]");
  const rings = q("[data-rings]");
  const arc = q("[data-arc]");
  const titleEl = q("[data-title]");
  const countEl = q("[data-count]");
  const playBtn = q("[data-play]");
  const autoBtn = q("[data-auto]");
  const intro = q("[data-intro]");
  const introVideo = q("[data-intro-video]");
  const skipBtn = q("[data-skip]");
  const logo = q("[data-logo]");
  const nav = q("[data-nav]");
  const pill = q("[data-pill]");
  const pillHl = q("[data-pill-hl]");
  const inside = q("[data-inside]");
  const inFront = q("[data-in-front]");
  const inBackFrame = q("[data-in-back]");
  const inFrontFrame = q("[data-in-front-frame]");
  const inBar = q("[data-in-bar]");
  const inNum = q("[data-in-num]");
  const inHead = q("[data-in-head]");
  const inCap = q("[data-in-cap]");
  const inDark = q("[data-in-dark]");
  const stormEl = q("[data-storm]");
  const shop = q("[data-shop]");
  const range = q("[data-range]");
  const badge = q("[data-badge]");
  const basket = q("[data-basket]");
  const buyBtn = q("[data-buy]");
  const glow = q("[data-glow]");

  let disposed = false;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let phone = vw < 820;
  let u = Math.min(vw / 1440, vh / 900);
  let xSpread = 1;

  const renderer = makeRenderer(canvas);
  if (!renderer) {
    console.warn("[stride] WebGL unavailable — using DOM bar fan.");
    return mountStrideFallback(root, styles, {
      canvas,
      hero,
      arc,
      reveal,
      titleEl,
      countEl,
      playBtn,
      autoBtn,
      intro,
      introVideo,
      skipBtn,
      logo,
      nav,
      rings,
      inside,
      inFront,
      inBar,
      inHead,
      inNum,
      inCap,
      inDark,
      inFrontFrame,
      shop,
      range,
      stormEl,
    });
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2));
  renderer.setSize(vw, vh, false);
  canvas.style.height = `${vh}px`;

  const scene = new THREE.Scene();
  let D = clamp(1500 * Math.min(vw / 1440, vh / 900), 1000, 2200);
  const camera = new THREE.PerspectiveCamera(
    (2 * Math.atan(vh / 2 / D) * 180) / Math.PI,
    vw / vh,
    10,
    4 * D
  );
  camera.position.set(0, 0, D);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-0.6, 0.9, 1.4);
  scene.add(key);

  resetBarGeometries();
  const { front: frontGeo, back: backGeo } = getBarGeometries();
  const shadowTex = makeShadowTexture();
  const textures = [];
  const pool = [];
  let traveler = null;
  let sheetImg = null;

  function makeBar(flavorIndex) {
    const tex = textures[flavorIndex];
    const group = new THREE.Group();
    // Flip group holds the wrapper only — shadow stays unflipped so it
    // never rotates in front of the bar at 180° / 540° etc.
    const flip = new THREE.Group();
    const front = new THREE.Mesh(
      frontGeo,
      new THREE.MeshPhysicalMaterial(matOpts(tex.front))
    );
    const back = new THREE.Mesh(
      backGeo,
      new THREE.MeshPhysicalMaterial(matOpts(tex.back))
    );
    front.frustumCulled = false;
    back.frustumCulled = false;
    flip.add(front, back);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 1.04 * BH),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      })
    );
    shadow.renderOrder = -1;
    shadow.frustumCulled = false;
    group.add(shadow, flip);
    group.userData = {
      front,
      back,
      flip,
      shadow,
      flavor: flavorIndex,
      sx: 1,
      sy: 1,
    };
    group.visible = false;
    scene.add(group);
    return group;
  }

  function setBarFlavor(bar, fi) {
    const tex = textures[fi];
    bar.userData.flavor = fi;
    bar.userData.front.material.map = tex.front;
    bar.userData.back.material.map = tex.back;
    bar.userData.front.material.needsUpdate = true;
    bar.userData.back.material.needsUpdate = true;
  }

  function placeBar(bar, st) {
    const { x, y, h, rz, ry, rx = 0, z = 0, op = 1, sx = 1, sy = 1, shadow = 1 } = st;
    if (op <= 0.01 || h < 2) {
      bar.visible = false;
      return;
    }
    bar.visible = true;
    const scale = h / BH;
    bar.position.set(x - vw / 2, vh / 2 - y, z);
    bar.scale.set(scale * sx, scale * sy, scale);
    // Outer group: only Z tilt (matches CSS rotateZ). Y/X flip on child.
    bar.rotation.order = "ZYX";
    bar.rotation.set(0, 0, (-rz * Math.PI) / 180);
    const flip = bar.userData.flip;
    flip.rotation.order = "ZYX";
    flip.rotation.set((rx * Math.PI) / 180, (ry * Math.PI) / 180, 0);
    flip.scale.set(1, 1, 1);
    const mats = [bar.userData.front.material, bar.userData.back.material];
    mats.forEach((m) => {
      m.opacity = op;
      m.transparent = true;
    });
    const sh = bar.userData.shadow;
    // Keep shadow behind the bar in view space (negative z), never flipped
    sh.position.set(0, -0.05 * BH, -0.32 * BH);
    sh.rotation.set(0, 0, 0);
    sh.scale.set(Math.max(0.3, Math.abs(Math.cos((ry * Math.PI) / 180))), 1, 1);
    sh.material.opacity = 0.5 * op * shadow;
    bar.userData.sx = sx;
    bar.userData.sy = sy;
  }

  // ── State ──
  let pos = reduced ? 1 : -2.6;
  let target = 1;
  let tween = null;
  let autoOn = !reduced;
  let lastInteract = performance.now();
  let heroEntered = false;
  let flipAngle = 0;
  let flipTween = null;
  let insideStep = 0;
  let cartCount = 0;
  let pack = [null, null, null];
  let packTouched = false;
  let packSeeded = false;
  let cardTilts = FLAVORS.map(() => ({ x: 0, y: 0 }));
  let poke = { t: 0, i: -1 };
  let smoothScroll = { active: false, cur: 0, tgt: 0 };
  let drag = null;
  let vel = 0;
  let stormPieces = [];
  let stormBuilt = false;
  let phoneScrolledCard = false;

  const measureWord = (() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    return (text, size = 100) => {
      const fam =
        getComputedStyle(root).getPropertyValue("--font-archivo-black").trim() ||
        '"Archivo Black", sans-serif';
      ctx.font = `400 ${size}px ${fam}`;
      return ctx.measureText(text).width;
    };
  })();

  function setTitleSize(name) {
    const words = name.toUpperCase().split(" ");
    if (phone) {
      const longest = Math.max(...words.map((w) => measureWord(w)));
      const base = Math.min(
        Math.max(40, Math.min(vw * 0.125, 64)),
        ((vw - 36) * 100) / longest
      );
      titleEl.style.fontSize = `${base}px`;
    } else {
      const w = measureWord(name);
      const size = Math.min(96 * u, ((760 * u) * 100) / w);
      titleEl.style.fontSize = `${size}px`;
    }
  }

  function renderTitle(name, dir = 1, animate = true) {
    setTitleSize(name);
    const words = name.toUpperCase().split(" ");
    titleEl.innerHTML = "";
    let li = 0;
    words.forEach((word) => {
      const wrap = document.createElement("span");
      wrap.className = styles.titleWord || "titleWord";
      [...word].forEach((ch) => {
        const s = document.createElement("span");
        s.className = styles.titleCh || "titleCh";
        s.textContent = ch;
        if (animate && !reduced) {
          s.style.opacity = "0";
          s.style.transform = `translateY(${dir * 110}%)`;
          s.style.transition = `transform 620ms cubic-bezier(.22,1,.36,1) ${120 + li * 22}ms, opacity 620ms cubic-bezier(.22,1,.36,1) ${120 + li * 22}ms`;
        }
        wrap.appendChild(s);
        li++;
      });
      titleEl.appendChild(wrap);
    });
    if (animate && !reduced) {
      requestAnimationFrame(() => {
        titleEl.querySelectorAll(`.${styles.titleCh || "titleCh"}`).forEach((s) => {
          s.style.opacity = "1";
          s.style.transform = "translateY(0)";
        });
      });
    }
  }

  function fadeOutTitle(dir, cb) {
    if (reduced) {
      cb?.();
      return;
    }
    const letters = [...titleEl.querySelectorAll(`.${styles.titleCh || "titleCh"}`)];
    letters.forEach((s, i) => {
      s.style.transition = `transform 300ms cubic-bezier(.45,0,.75,.3) ${i * 11}ms, opacity 300ms cubic-bezier(.45,0,.75,.3) ${i * 11}ms`;
      s.style.opacity = "0";
      s.style.transform = `translateY(${-dir * 110}%)`;
    });
    setTimeout(cb, 300 + letters.length * 11);
  }

  function setCount(n, animate = true) {
    const text = String(n + 1).padStart(2, "0");
    if (!animate || reduced) {
      countEl.textContent = text;
      return;
    }
    countEl.style.transition = "opacity 220ms cubic-bezier(.5,0,.75,0), translate 220ms cubic-bezier(.5,0,.75,0)";
    countEl.style.opacity = "0";
    countEl.style.translate = "0 -10px";
    setTimeout(() => {
      countEl.textContent = text;
      countEl.style.transition = "none";
      countEl.style.translate = "0 14px";
      requestAnimationFrame(() => {
        countEl.style.transition =
          "opacity 380ms cubic-bezier(.22,1,.36,1), translate 380ms cubic-bezier(.22,1,.36,1)";
        countEl.style.opacity = "1";
        countEl.style.translate = "0 0";
      });
    }, 60);
  }

  let revealAnim = null;

  function startReveal(color) {
    if (reduced) {
      root.style.setProperty("--flav", color);
      return;
    }
    if (revealAnim) {
      root.style.setProperty("--flav", revealAnim.color);
      reveal.style.removeProperty("-webkit-mask-image");
      reveal.style.removeProperty("mask-image");
      reveal.style.setProperty("--rv", "transparent");
    }
    const cx = vw / 2;
    const cy = phone ? hero.clientHeight * 0.4 : hero.clientHeight / 2 - 78 * u;
    const corners = [
      [0, 0],
      [vw, 0],
      [0, hero.clientHeight],
      [vw, hero.clientHeight],
    ];
    const R =
      1.45 *
      Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    revealAnim = {
      color,
      t0: performance.now(),
      dur: 420,
      cx,
      cy,
      R,
    };
    reveal.style.setProperty("--rv", color);
  }

  function tickReveal(now) {
    if (!revealAnim) return;
    const t = glide((now - revealAnim.t0) / revealAnim.dur);
    const r = revealAnim.R * t;
    const f = Math.max(60, 0.35 * r);
    const mask = `radial-gradient(circle at ${revealAnim.cx}px ${revealAnim.cy}px, #000 ${Math.max(0, r - f)}px, transparent ${r}px)`;
    reveal.style.webkitMaskImage = mask;
    reveal.style.maskImage = mask;
    if (t >= 1) {
      root.style.setProperty("--flav", revealAnim.color);
      reveal.style.setProperty("--rv", "transparent");
      reveal.style.removeProperty("-webkit-mask-image");
      reveal.style.removeProperty("mask-image");
      revealAnim = null;
    }
  }

  function liveCard(fi) {
    qa("[data-card]").forEach((el, i) => {
      el.classList.toggle(styles.live || "live", i === fi);
      if (i === fi) el.classList.add("live");
      else el.classList.remove("live");
    });
  }

  function goTo(to, { fromDrag = false } = {}) {
    const prev = ((Math.round(target) % 5) + 5) % 5;
    target = to;
    const next = ((Math.round(target) % 5) + 5) % 5;
    const dist = Math.abs(to - pos);
    const dur = reduced
      ? 0
      : fromDrag
        ? Math.max(380, 650 * Math.min(1, dist + 0.35))
        : 650 + 160 * Math.max(0, Math.round(dist) - 1);
    const from = pos;
    const dir = to >= pos ? 1 : -1;
    if (tween) tween = null;
    if (dur <= 0) {
      pos = to;
      if (next !== prev) onFlavorChange(next, dir);
      return;
    }
    tween = { from, to, t0: performance.now(), dur, prev, next, dir, fired: false };
  }

  function onFlavorChange(fi, dir = 1) {
    const f = FLAVORS[fi];
    startReveal(f.color);
    fadeOutTitle(dir, () => renderTitle(f.name, dir, true));
    setCount(fi, true);
    liveCard(fi);
    rebuildStormBits();
    if (insideStep === 3) updateInsideText(3, fi, true);
    lastInteract = performance.now();
  }

  function arcState(k, j, now) {
    const sign = k < 0 ? -1 : 1;
    const s = slotAt(k);
    const hh = hero.clientHeight || vh;
    const cx = vw / 2;
    let cy = phone ? hh * 0.4 : hh / 2 - 78 * u;
    if (phone) {
      u = Math.min(vw / 560, hh / 980);
      xSpread = 1.02;
    } else {
      u = Math.min(vw / 1440, vh / 900);
      xSpread = 1;
    }
    let y = cy + s.dy * u;
    let rz = s.rz * sign;
    if (!reduced) {
      const b = Math.sin((now / 4600) * Math.PI * 2 + 1.37 * j);
      y -= (0.5 * b + 0.5) * 9 * u;
      rz += 0.4 * b;
    }
    const ak = Math.abs(k);
    let op = 1;
    if (ak > 3.3) op = clamp(1 - (ak - 3.3) / 0.6, 0, 1);
    return {
      x: cx + s.dx * u * xSpread * sign,
      y,
      h: s.h * u,
      rz,
      ry: s.ry * sign,
      rx: 0,
      z: -ak * 34 * u,
      op,
      sx: 1,
      sy: 1,
      shadow: 1,
    };
  }

  function updateInsideFrames() {
    const k = phone
      ? Math.min(vw / 390, vh / 780)
      : Math.min(vw / 1440, vh / 900);
    root.style.setProperty("--k", String(k));
    if (inBackFrame) inBackFrame.style.setProperty("--k", String(k));
    if (inFrontFrame) inFrontFrame.style.setProperty("--k", String(k));
  }

  function updateInsideText(step, fi, animate) {
    const spec = INSIDE_STEPS[step];
    let headLines =
      spec.head ||
      FLAVORS[fi].name
        .toUpperCase()
        .split(" ")
        .map((w) => w);
    const capLines = spec.cap;
    const apply = () => {
      const long = headLines.some((w) => w.length > 9);
      inHead.style.fontSize = step === 3 && long ? "0.72em" : "";
      if (step === 3 && long) inHead.style.fontSize = phone ? "29px" : "calc(88px * 0.72)";
      else inHead.style.fontSize = "";
      inHead.innerHTML = headLines.join("<br>");
      inNum.textContent = String(step + 1).padStart(2, "0");
      inCap.innerHTML = capLines.join("<br>");
      qa("[data-in-icon]").forEach((el, i) => {
        el.classList.toggle(styles.active || "active", i === step);
        if (i === step) el.classList.add("active");
        else el.classList.remove("active");
      });
    };
    if (!animate || reduced) {
      apply();
      return;
    }
    const els = [inHead, inNum, inCap];
    els.forEach((el) => {
      el.style.transition =
        "opacity 240ms cubic-bezier(.5,0,.75,0), translate 240ms cubic-bezier(.5,0,.75,0)";
      el.style.opacity = "0";
      el.style.translate = "0 -10px";
    });
    setTimeout(() => {
      apply();
      els.forEach((el) => {
        el.style.transition = "none";
        el.style.translate = "0 14px";
        requestAnimationFrame(() => {
          el.style.transition =
            "opacity 460ms cubic-bezier(.22,1,.36,1), translate 460ms cubic-bezier(.22,1,.36,1)";
          el.style.opacity = "1";
          el.style.translate = "0 0";
        });
      });
    }, 40);
  }

  function startFlip(toAngle) {
    if (reduced) {
      flipAngle = toAngle;
      flipTween = null;
      return;
    }
    const from = flipAngle;
    const delta = toAngle - from;
    if (Math.abs(delta) < 0.01) return;
    const halfTurns = clamp(Math.abs(delta) / 180, 0.4, 2);
    const dur = 720 * halfTurns;
    flipTween = {
      from,
      to: toAngle,
      t0: performance.now(),
      dur,
      textAt: Math.min(dur, 720) * 0.38,
      textFired: false,
    };
  }

  function ensureStorm() {
    if (stormBuilt) return;
    stormBuilt = true;
    const fi = ((Math.round(target) % 5) + 5) % 5;
    // Mid density: readable blast without covering the pack.
    const COUNT = 22;
    for (let i = 0; i < COUNT; i++) {
      const useOwn = Math.random() < 0.8;
      const bi = useOwn ? FLAVORS[fi].bit : Math.floor(Math.random() * 5);
      const el = document.createElement("div");
      el.className = styles.stormPiece || "";
      Object.assign(el.style, sheetCrop(BITS[bi], 0));
      el.style.position = "absolute";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      stormEl.appendChild(el);
      // Even ring + light jitter — avoids clumps and huge empty gaps.
      const a = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const band = i % 3; // 0 near, 1 mid, 2 outer
      stormPieces.push({
        el,
        a,
        ph: i / COUNT,
        spin: (i % 2 === 0 ? -1 : 1) * (160 + Math.random() * 180),
        size: band === 0 ? 0.9 + Math.random() * 0.25 : 0.7 + Math.random() * 0.35,
        orbit: band === 0 ? 0.55 + Math.random() * 0.08 : band === 1 ? 0.72 + Math.random() * 0.08 : 0.88 + Math.random() * 0.08,
      });
    }
  }

  function updateStorm(qStorm) {
    if (reduced || qStorm <= 0) {
      stormPieces.forEach((p) => {
        p.el.style.opacity = "0";
      });
      return;
    }
    ensureStorm();
    // Peak sits in a mid ring around the pack — not on top of it, not at the edges.
    const R = 0.48 * Math.hypot(vw, vh);
    const base = 0.095 * Math.min(vw, vh);
    const cx = vw / 2;
    const cy = vh / 2;
    const gateIn = clamp(qStorm / 0.09, 0, 1);
    const gateOut = clamp((1 - qStorm) / 0.24, 0, 1);
    stormPieces.forEach((p) => {
      const s = clamp((qStorm - 0.18 * p.ph) / 0.7, 0, 1);
      if (s <= 0.001) {
        p.el.style.opacity = "0";
        return;
      }
      const radius = (0.14 + Math.pow(s, 1.1) * 0.72) * R * p.orbit;
      const x = cx + Math.cos(p.a) * radius;
      const y = cy + Math.sin(p.a) * radius * 0.8;
      const sc = (0.4 + 1.35 * s) * p.size * base;
      const pulse = Math.sin(Math.PI * Math.min(1, s * 1.03));
      const op = pulse * gateIn * Math.max(0.2, gateOut);
      p.el.style.width = `${sc}px`;
      p.el.style.height = `${sc}px`;
      p.el.style.left = `${x}px`;
      p.el.style.top = `${y}px`;
      p.el.style.transform = `translate(-50%,-50%) rotate(${p.spin * s}deg)`;
      p.el.style.opacity = String(clamp(op, 0, 1));
    });
  }

  function rebuildStormBits() {
    stormEl.innerHTML = "";
    stormPieces = [];
    stormBuilt = false;
  }

  // ── Traveler lerp helpers ──
  function lerpState(a, b, t) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      h: lerp(a.h, b.h, t),
      rz: lerp(a.rz, b.rz, t),
      ry: lerp(a.ry, b.ry, t),
      rx: lerp(a.rx || 0, b.rx || 0, t),
      z: lerp(a.z || 0, b.z || 0, t),
      op: lerp(a.op, b.op, t),
      sx: lerp(a.sx || 1, b.sx || 1, t),
      sy: lerp(a.sy || 1, b.sy || 1, t),
      shadow: lerp(a.shadow ?? 1, b.shadow ?? 1, t),
    };
  }

  function rectCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width };
  }

  // ── Frame loop ──
  let raf = 0;
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);

    // smooth scroll
    if (smoothScroll.active) {
      const dt = 16;
      const k = 1 - Math.exp(-dt / 120);
      smoothScroll.cur += (smoothScroll.tgt - smoothScroll.cur) * k;
      window.scrollTo(0, smoothScroll.cur);
      if (Math.abs(smoothScroll.tgt - smoothScroll.cur) < 0.5) {
        smoothScroll.cur = smoothScroll.tgt;
        window.scrollTo(0, smoothScroll.cur);
        smoothScroll.active = false;
      }
    }

    if (tween) {
      const t = clamp((now - tween.t0) / tween.dur, 0, 1);
      const e = tween.useEntrance ? 1 - Math.pow(1 - t, 3.2) : glide(t);
      pos = lerp(tween.from, tween.to, e);
      if (!tween.fired && t >= 0.12) {
        tween.fired = true;
        if (tween.next !== tween.prev) onFlavorChange(tween.next, tween.dir);
      }
      if (t >= 1) {
        pos = tween.to;
        tween = null;
      }
    }

    tickReveal(now);

    if (flipTween) {
      const t = clamp((now - flipTween.t0) / flipTween.dur, 0, 1);
      flipAngle = lerp(flipTween.from, flipTween.to, sineInOut(t));
      if (!flipTween.textFired && now - flipTween.t0 >= flipTween.textAt) {
        flipTween.textFired = true;
        const fi = ((Math.round(target) % 5) + 5) % 5;
        updateInsideText(insideStep, fi, true);
      }
      if (t >= 1) {
        flipAngle = flipTween.to;
        flipTween = null;
      }
    }

    // autoplay
    if (
      autoOn &&
      heroEntered &&
      !drag &&
      !tween &&
      document.visibilityState === "visible"
    ) {
      const hr = hero.getBoundingClientRect();
      const visible = hr.bottom > vh * 0.2 && hr.top < vh * 0.8;
      const ratio =
        Math.min(hr.bottom, vh) - Math.max(hr.top, 0);
      if (visible && ratio / hr.height >= 0.6 && now - lastInteract > 3200) {
        goTo(target + 1);
        lastInteract = now;
      }
    }

    const fi = ((Math.round(target) % 5) + 5) % 5;
    const jT = Math.round(target);
    const secTop = inside.getBoundingClientRect().top;
    const secH = inside.offsetHeight;
    const pScroll = clamp(-secTop / (secH - vh), 0, 1);
    const step = Math.floor(Math.min(pScroll, 0.72) / 0.18);
    // Storm starts earlier and lasts longer so the full-screen blast is readable
    // before the traveler drops into Shop.
    const qStorm = clamp((pScroll - 0.7) / 0.3, 0, 1);

    if (step !== insideStep && step >= 0 && step <= 3) {
      insideStep = step;
      startFlip(INSIDE_STEPS[step].ry);
      // text fires mid-flip via flipTween; for reduced, update now
      if (reduced) updateInsideText(step, fi, false);
    }

    // pinY for inFront
    const secRect = inside.getBoundingClientRect();
    let pinY = 0;
    if (secRect.top > 0) pinY = secRect.top;
    else if (secRect.bottom < vh) pinY = secRect.bottom - vh;
    const intersects = secRect.bottom > 0 && secRect.top < vh;
    inFront.classList.toggle(styles.on || "on", intersects);
    if (intersects) inFront.classList.add("on");
    else inFront.classList.remove("on");
    inFront.style.transform = `translateY(${pinY}px)`;
    // Keep the storm layer fully visible; only fade Inside copy / number.
    // Fading the whole inFront used to kill the blast opacity.
    inFront.style.opacity = "1";
    const uiFade = 1 - clamp(3.2 * qStorm, 0, 1);
    if (inFrontFrame) inFrontFrame.style.opacity = String(uiFade);
    inNum.style.opacity = String(uiFade);
    inDark.style.opacity = String(clamp(2.4 * qStorm, 0, 1) * 0.28);
    updateStorm(qStorm);

    // traveler anchors
    const kT = jT - pos;
    let A = arcState(kT, jT, now);
    const inR = rectCenter(inBar);
    const bob = reduced ? 0 : Math.sin((now / 2600) * Math.PI * 2) * 6;
    let B = {
      x: inR.x,
      y: inR.y + bob,
      h: inR.h,
      rz: 14,
      ry: flipAngle + 400 * qStorm,
      rx: 0,
      z: 0,
      op: 1,
      sx: 1,
      sy: 1,
      shadow: 1,
    };

    const pk = q(`[data-pk="${fi}"]`);
    const cardR = pk ? rectCenter(pk) : { x: 0, y: 0, h: 1 };
    const tilt = cardTilts[fi];
    let C = {
      x: cardR.x,
      y: cardR.y,
      h: cardR.h,
      rz: 0,
      ry: Math.round(B.ry / 360) * 360 + tilt.x * 14,
      rx: -tilt.y * 14,
      z: 30,
      op: 1,
      sx: 1,
      sy: 1,
      shadow: 0.7,
    };
    if (poke.i === fi && poke.t > 0) {
      const pt = 1 - poke.t;
      let sx = 1,
        sy = 1;
      if (pt < 0.3) {
        const t = pt / 0.3;
        sx = lerp(1, 1.06, t);
        sy = lerp(1, 0.93, t);
      } else if (pt < 0.6) {
        const t = (pt - 0.3) / 0.3;
        sx = lerp(1.06, 0.97, t);
        sy = lerp(0.93, 1.04, t);
      } else {
        const t = (pt - 0.6) / 0.4;
        sx = lerp(0.97, 1, t);
        sy = lerp(1.04, 1, t);
      }
      C.sx = sx;
      C.sy = sy;
      poke.t -= 1 / 30;
    }

    const p1 = clamp(1 - secTop / vh, 0, 1);
    const shopTop = shop.getBoundingClientRect().top;
    const p3 = clamp((vh - shopTop) / (0.7 * vh), 0, 1);

    if (phone && p3 > 0 && !phoneScrolledCard) {
      phoneScrolledCard = true;
      const card = q(`[data-card="${fi}"]`);
      card?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduced ? "auto" : "smooth" });
    }

    let st = A;
    if (p1 > 0) st = lerpState(A, B, easeInOut(p1));
    if (p3 > 0) st = lerpState(st, C, easeInOut(p3));

    if (traveler) {
      setBarFlavor(traveler, fi);
      placeBar(traveler, st);
    }

    // pool bars
    const j0 = Math.floor(pos) - 5;
    const heroFade = 1 - clamp(1.6 * p1, 0, 1);
    for (let i = 0; i < 11; i++) {
      const j = j0 + i;
      const bar = pool[i];
      if (j === jT) {
        bar.visible = false;
        continue;
      }
      const flav = ((j % 5) + 5) % 5;
      setBarFlavor(bar, flav);
      const s = arcState(j - pos, j, now);
      s.op *= heroFade;
      placeBar(bar, s);
    }

    // nav active
    updateNav();

    // seed pack
    if (!packSeeded) {
      const rr = range.getBoundingClientRect();
      const vis = Math.min(rr.bottom, vh) - Math.max(rr.top, 0);
      if (vis / rr.height >= 0.3 && !packTouched) {
        packSeeded = true;
        seedPack(fi);
      }
    }

    renderer.render(scene, camera);
  }

  function updateNav() {
    const ids = ["flavors", "inside", "shop", "range"];
    let active = "flavors";
    for (const id of ids) {
      const el = root.querySelector(`#${id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= vh * 0.35) active = id;
    }
    const links = qa("[data-nav-link]");
    links.forEach((a) => {
      const on = a.getAttribute("data-nav-link") === active;
      a.dataset.active = on ? "1" : "0";
      if (on) {
        const pr = pill.getBoundingClientRect();
        const ar = a.getBoundingClientRect();
        pillHl.style.left = `${ar.left - pr.left}px`;
        pillHl.style.width = `${ar.width}px`;
      }
    });
    pill.classList.toggle(styles.light || "light", active === "shop");
    if (active === "shop") pill.classList.add("light");
    else pill.classList.remove("light");
    nav.classList.toggle(styles.dark || "dark", active === "range");
    if (active === "range") nav.classList.add("dark");
    else nav.classList.remove("dark");
  }

  // ── Interactions ──
  function markInteract() {
    lastInteract = performance.now();
    smoothScroll.active = false;
  }

  playBtn.addEventListener("click", () => {
    markInteract();
    goTo(target + 1);
  });

  autoBtn.addEventListener("click", () => {
    autoOn = !autoOn;
    autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
    const icon = q("[data-auto-icon]");
    if (autoOn) {
      icon.innerHTML =
        '<rect x="2" y="1.5" width="2" height="7" rx="0.6"/><rect x="6" y="1.5" width="2" height="7" rx="0.6"/>';
    } else {
      icon.innerHTML = '<path d="M3 1.5v7l6-3.5z" fill="#fff"/>';
    }
    markInteract();
  });

  window.addEventListener("keydown", (e) => {
    const hr = hero.getBoundingClientRect();
    if (hr.bottom < vh * 0.5 || hr.top > vh * 0.5) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      markInteract();
      goTo(target + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      markInteract();
      goTo(target - 1);
    }
  });

  // drag
  arc.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = {
      x0: e.clientX,
      pos0: pos,
      started: false,
      id: e.pointerId,
      lastX: e.clientX,
      lastT: performance.now(),
    };
    vel = 0;
    markInteract();
  });

  window.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) {
      // cursor raycast
      if (e.pointerType === "mouse" && !drag) {
        const hit = raycastBars(e.clientX, e.clientY);
        arc.style.cursor = hit ? "pointer" : "grab";
      }
      return;
    }
    const dx = e.clientX - drag.x0;
    if (!drag.started && Math.abs(dx) > 6) {
      drag.started = true;
      tween = null;
      try {
        arc.setPointerCapture(drag.id);
      } catch {}
      root.classList.add(styles.dragging || "dragging", "dragging");
      document.body.classList.add("dragging");
    }
    if (!drag.started) return;
    const slotPx = 245 * u * xSpread;
    pos = drag.pos0 - dx / slotPx;
    const dt = Math.max(1, performance.now() - drag.lastT);
    const v = -(e.clientX - drag.lastX) / slotPx / dt;
    vel = lerp(vel, v, 0.4);
    drag.lastX = e.clientX;
    drag.lastT = performance.now();
    markInteract();
  });

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    root.classList.remove(styles.dragging || "dragging", "dragging");
    document.body.classList.remove("dragging");
    const wasDrag = drag.started;
    const x = e?.clientX ?? drag.lastX;
    const y = e?.clientY ?? 0;
    drag = null;
    if (!wasDrag) {
      // tap
      const hit = raycastBars(x, y);
      if (hit != null) goTo(target + hit);
      return;
    }
    const to = Math.round(pos + clamp(vel * 220, -2, 2));
    goTo(to, { fromDrag: true });
  }

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", (e) => {
    if (!drag) return;
    if (Math.abs(pos - Math.round(pos)) < 0.02) {
      root.classList.remove(styles.dragging || "dragging", "dragging");
      document.body.classList.remove("dragging");
      drag = null;
      return;
    }
    endDrag(e);
  });

  function raycastBars(x, y) {
    const mouse = new THREE.Vector2((x / vw) * 2 - 1, -(y / vh) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const meshes = [];
    pool.forEach((b) => {
      if (b.visible) meshes.push(b.userData.front, b.userData.back);
    });
    if (traveler?.visible) meshes.push(traveler.userData.front, traveler.userData.back);
    const hits = ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const obj = hits[0].object;
    let group = obj.parent;
    // find offset k
    for (let i = 0; i < pool.length; i++) {
      if (pool[i] === group) {
        const j = Math.floor(pos) - 5 + i;
        return j - Math.round(target);
      }
    }
    if (group === traveler) return 0;
    return null;
  }

  // wheel smooth scroll (desktop)
  const isTouch = matchMedia("(pointer: coarse)").matches;
  window.addEventListener(
    "wheel",
    (e) => {
      if (reduced || isTouch || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (document.body.classList.contains("locked")) return;
      e.preventDefault();
      if (!smoothScroll.active) {
        smoothScroll.cur = window.scrollY;
        smoothScroll.tgt = window.scrollY;
        smoothScroll.active = true;
      }
      const max = document.documentElement.scrollHeight - vh;
      smoothScroll.tgt = clamp(smoothScroll.tgt + e.deltaY, 0, max);
    },
    { passive: false }
  );

  // inside icons
  qa("[data-in-icon]").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const secH = inside.offsetHeight;
      const start =
        inside.getBoundingClientRect().top +
        window.scrollY +
        ((i + 0.5) * 0.19) * (secH - vh);
      smoothScroll.cur = window.scrollY;
      smoothScroll.tgt = start;
      smoothScroll.active = !reduced;
      if (reduced) window.scrollTo(0, start);
    });
  });

  // shop cards
  qa("[data-card]").forEach((card, i) => {
    const fine = matchMedia("(pointer: fine)").matches;
    if (fine) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cardTilts[i] = { x, y };
        card.style.transform = `translateY(-8px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg)`;
        card.style.boxShadow = "0 24px 40px -18px rgba(40,30,20,.35)";
      });
      card.addEventListener("pointerleave", () => {
        cardTilts[i] = { x: 0, y: 0 };
        card.style.transform = "";
        card.style.boxShadow = "";
      });
    }
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return;
      poke = { t: 1, i };
    });
  });

  qa("[data-add]").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      flyToCart(q(`[data-pk="${i}"]`), () => bumpCart(1));
    });
  });

  // shop reveal
  const shopObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        q("[data-shop-head]")?.classList.add(styles.revealed || "revealed", "revealed");
        q("[data-shop-cap]")?.classList.add(styles.revealed || "revealed", "revealed");
        qa("[data-card]").forEach((c, i) => {
          setTimeout(() => c.classList.add(styles.shown || "shown", "shown"), i * 80);
        });
        shopObs.disconnect();
      });
    },
    { threshold: 0.18 }
  );
  shopObs.observe(shop);

  const rangeObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting)
          q("[data-range-head]")?.classList.add(styles.revealed || "revealed", "revealed");
      });
    },
    { threshold: 0.2 }
  );
  rangeObs.observe(range);

  // builder
  function setSlot(i, fi) {
    const slot = q(`[data-slot="${i}"]`);
    const bar = q(`[data-slot-bar="${i}"]`);
    if (fi == null) {
      pack[i] = null;
      slot.classList.remove(styles.filled || "filled", "filled");
      return;
    }
    pack[i] = fi;
    Object.assign(bar.style, sheetCrop(FLAVORS[fi].wrap, 4));
    slot.classList.add(styles.filled || "filled", "filled");
    updateThumbs();
    updateBuy();
  }

  function updateThumbs() {
    const counts = [0, 0, 0, 0, 0];
    pack.forEach((p) => {
      if (p != null) counts[p]++;
    });
    qa("[data-thumb-ring]").forEach((el, i) => {
      if (counts[i] === 0) {
        el.textContent = "";
        el.classList.remove(styles.on || "on", "on");
      } else if (counts[i] === 1) {
        el.textContent = "✓";
        el.classList.add(styles.on || "on", "on");
      } else {
        el.textContent = String(counts[i]);
        el.classList.add(styles.on || "on", "on");
      }
    });
  }

  function updateBuy() {
    const empty = pack.filter((p) => p == null).length;
    const label = q("[data-buy-label]");
    if (empty === 0) {
      buyBtn.disabled = false;
      buyBtn.classList.add(styles.ready || "ready", "ready");
      buyBtn.classList.remove(styles.added || "added", "added");
      label.textContent = "Add to cart";
    } else {
      buyBtn.disabled = true;
      buyBtn.classList.remove(styles.ready || "ready", "ready");
      label.textContent = `Pick ${empty} more`;
    }
  }

  function seedPack(fi) {
    [0, 1, 2].forEach((i) => {
      setTimeout(() => setSlot(i, (fi + i) % 5), 250 + i * 160);
    });
  }

  qa("[data-slot-x]").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      packTouched = true;
      setSlot(i, null);
      updateThumbs();
      updateBuy();
    });
  });

  qa("[data-thumb]").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      packTouched = true;
      const empty = pack.findIndex((p) => p == null);
      if (empty < 0) return;
      setSlot(empty, i);
      glow.style.setProperty("--g", hexA(FLAVORS[i].color, 0.72));
      glow.classList.remove(styles.pulse || "pulse", "pulse");
      void glow.offsetWidth;
      glow.classList.add(styles.pulse || "pulse", "pulse");
    });
  });

  buyBtn.addEventListener("click", () => {
    if (pack.some((p) => p == null)) return;
    const sources = pack.map((fi, i) => q(`[data-slot-bar="${i}"]`));
    let done = 0;
    sources.forEach((src, i) => {
      setTimeout(() => {
        flyToCart(src, () => {
          done++;
          if (done === 3) {
            bumpCart(1);
            setTimeout(() => {
              pack = [null, null, null];
              qa("[data-slot]").forEach((s) =>
                s.classList.remove(styles.filled || "filled", "filled")
              );
              updateThumbs();
              const label = q("[data-buy-label]");
              buyBtn.classList.add(styles.added || "added", "added");
              buyBtn.classList.remove(styles.ready || "ready", "ready");
              buyBtn.disabled = true;
              label.textContent = "Added to cart";
              setTimeout(() => {
                buyBtn.classList.remove(styles.added || "added", "added");
                updateBuy();
              }, 1600);
            }, 60);
          }
        });
      }, i * 120);
    });
  });

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function bumpCart(n) {
    cartCount += n;
    badge.textContent = String(cartCount);
    badge.classList.remove(styles.on || "on", "on");
    void badge.offsetWidth;
    badge.classList.add(styles.on || "on", "on");
    basket.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "ease" }
    );
  }

  function flyToCart(src, onDone) {
    if (!src || reduced) {
      onDone?.();
      return;
    }
    const r = src.getBoundingClientRect();
    const br = basket.getBoundingClientRect();
    const fly = document.createElement("div");
    fly.className = styles.fly || "";
    fly.style.position = "fixed";
    fly.style.left = `${r.left}px`;
    fly.style.top = `${r.top}px`;
    fly.style.width = `${r.width}px`;
    fly.style.height = `${r.height}px`;
    fly.style.backgroundImage = getComputedStyle(src).backgroundImage;
    fly.style.backgroundSize = getComputedStyle(src).backgroundSize;
    fly.style.backgroundPosition = getComputedStyle(src).backgroundPosition;
    fly.style.backgroundRepeat = "no-repeat";
    fly.style.zIndex = "70";
    fly.style.pointerEvents = "none";
    fly.style.filter = "drop-shadow(0 10px 14px rgba(0,0,0,.25))";
    document.body.appendChild(fly);
    const dx = br.left + br.width / 2 - (r.left + r.width / 2);
    const dy = br.top + br.height / 2 - (r.top + r.height / 2);
    const lift = Math.min(160, 0.35 * Math.abs(dy) + 60);
    const k = Math.min(0.2, 30 / r.height);
    const anim = fly.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx * 0.4}px, ${dy * 0.4 - lift}px) scale(${0.45 + k}) rotate(-10deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(-18deg)`,
          opacity: 0.15,
        },
      ],
      { duration: 900, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }
    );
    anim.onfinish = () => {
      fly.remove();
      basket.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
        { duration: 320 }
      );
      onDone?.();
    };
  }

  // nav links smooth
  qa("[data-nav-link]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("data-nav-link");
      const el = root.querySelector(`#${id}`);
      if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  // resize
  function onResize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    phone = vw < 820;
    u = Math.min(vw / 1440, vh / 900);
    D = clamp(1500 * Math.min(vw / 1440, vh / 900), 1000, 2200);
    camera.fov = (2 * Math.atan(vh / 2 / D) * 180) / Math.PI;
    camera.aspect = vw / vh;
    camera.position.z = D;
    camera.far = 4 * D;
    camera.near = 10;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2));
    renderer.setSize(vw, vh, false);
    canvas.style.height = `${vh}px`;
    updateInsideFrames();
    const fi = ((Math.round(target) % 5) + 5) % 5;
    setTitleSize(FLAVORS[fi].name);
  }
  window.addEventListener("resize", onResize);

  // bits drift
  function startBits() {
    qa("[data-bit]").forEach((el, i) => {
      if (phone && [1, 3, 4].includes(i)) {
        el.style.display = "none";
        return;
      }
      if (phone) {
        el.style.width = `calc(${BIT_LAYOUT_SIZE[i] * 1.3} * var(--u))`;
        el.style.height = `calc(${BIT_LAYOUT_SIZE[i] * 1.3} * var(--u))`;
      }
      if (reduced) {
        el.style.opacity = "0.55";
        return;
      }
      el.style.transition = `opacity 900ms ease ${300 + i * 90}ms`;
      el.style.opacity = "0.6";
      const dx = i % 2 === 0 ? 12 : -14;
      const dy = -(22 + 3 * i);
      const rot = i % 2 === 0 ? 10 : -12;
      el.animate(
        [
          { transform: el.style.transform },
          {
            transform: `${el.style.transform} translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
          },
          { transform: el.style.transform },
        ],
        {
          duration: 7000 + 900 * i,
          iterations: Infinity,
          easing: "ease-in-out",
          composite: "add",
        }
      );
    });
  }
  const BIT_LAYOUT_SIZE = [120, 96, 84, 78, 70];

  function enterHero() {
    if (heroEntered) return;
    heroEntered = true;
    intro.classList.add(styles.hide || "hide", "hide");
    root.classList.remove(styles.locked || "locked", "locked");
    document.body.classList.remove("locked");
    document.body.style.overflow = "";
    nav.classList.add(styles.navIn || "navIn", "navIn");
    rings.classList.add(styles.in || "in", "in");
    playBtn.classList.add(styles.in || "in", "in");
    countEl.classList.add(styles.in || "in", "in");
    autoBtn.classList.add(styles.in || "in", "in");
    startBits();
    liveCard(1);
    renderTitle(FLAVORS[1].name, 1, false);
    setCount(1, false);
    root.style.setProperty("--flav", FLAVORS[1].color);
    if (reduced) {
      pos = 1;
      target = 1;
    } else {
      target = 1;
      pos = -2.6;
      tween = {
        from: -2.6,
        to: 1,
        t0: performance.now(),
        dur: 1700,
        prev: 1,
        next: 1,
        dir: 1,
        fired: true,
        useEntrance: true,
      };
    }
    lastInteract = performance.now();
  }

  function runIntro() {
    root.classList.add(styles.locked || "locked", "locked");
    document.body.classList.add("locked");
    document.body.style.overflow = "hidden";
    skipBtn.addEventListener("click", enterHero);
    if (reduced) {
      enterHero();
      return;
    }
    const video = introVideo;
    const startAt = () => {
      try {
        video.currentTime = 0.55;
        video.play().catch(() => {});
      } catch {}
    };
    if (video.readyState >= 3) startAt();
    else video.addEventListener("canplay", startAt, { once: true });

    let logoShown = false;
    const showLogo = () => {
      if (logoShown || heroEntered) return;
      logoShown = true;
      try {
        video.pause();
      } catch {}
      intro.classList.add(styles.cream || "cream", "cream");
      logo.classList.add(styles.show || "show", "show");
      setTimeout(() => {
        if (!heroEntered) enterHero();
      }, 650);
    };

    const onTime = () => {
      if (video.currentTime >= 4.6) {
        video.removeEventListener("timeupdate", onTime);
        showLogo();
      }
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", showLogo);
    video.addEventListener("error", showLogo);
    setTimeout(() => {
      if (!logoShown && !heroEntered && video.paused && video.currentTime < 0.6)
        showLogo();
    }, 3500);
    setTimeout(() => {
      if (!heroEntered) enterHero();
    }, 9000);
  }

  (async () => {
    try {
      await document.fonts.load('400 16px "Archivo Black"');
      await document.fonts.load('400 16px "DM Mono"');
      await document.fonts.load('500 16px "DM Mono"');
      await document.fonts.load("700 16px Inter");
    } catch {}

    const cs = getComputedStyle(root);
    const fontDisp =
      cs.getPropertyValue("--font-archivo-black").trim() ||
      cs.getPropertyValue("--font-disp").trim() ||
      '"Archivo Black", sans-serif';
    const fontMono =
      cs.getPropertyValue("--font-dm-mono").trim() ||
      cs.getPropertyValue("--font-mono").trim() ||
      '"DM Mono", monospace';
    const fontBag = { disp: fontDisp, mono: fontMono };

    sheetImg = await loadSheetImage(SHEET_URL);
    for (let i = 0; i < 5; i++)
      textures[i] = buildFlavorTextures(sheetImg, i, fontBag);
    for (let i = 0; i < 11; i++) pool.push(makeBar(i % 5));
    traveler = makeBar(1);

    updateInsideFrames();
    updateInsideText(0, 1, false);
    autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
    if (!autoOn) {
      q("[data-auto-icon]").innerHTML =
        '<path d="M3 1.5v7l6-3.5z" fill="#fff"/>';
    }

    raf = requestAnimationFrame(frame);
    runIntro();
  })().catch((err) => {
    console.error("Stride boot failed", err);
    if (!textures.length) return;
    raf = requestAnimationFrame(frame);
    enterHero();
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    root.classList.remove(styles.locked || "locked", "locked");
    root.classList.remove(styles.dragging || "dragging", "dragging");
    document.body.classList.remove("locked", "dragging");
    document.body.style.overflow = "";
    window.removeEventListener("resize", onResize);
    renderer.dispose();
    pmrem.dispose();
    pool.forEach((b) => scene.remove(b));
    if (traveler) scene.remove(traveler);
  };
}
