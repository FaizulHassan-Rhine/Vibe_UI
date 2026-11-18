import { SHOTS, thumb, full } from "./data";

// Latitude-ring globe sized from each tile's angular footprint so cards
// nest cleanly (even gaps, round silhouette, no polar spikes).
const CARD_RATIO = 0.43; // tile width / globe radius
const CARD_ASPECT = 1.5; // width / height
const RING_GAP = 1.08; // slight breathing room — below ~1.05 cards collide at the corners
const MAX_LAT = 70; // stop short of the poles — flat cards look paper-thin there
const PITCH = 28;
const IDLE_SPIN = 0.045; // deg / frame

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Build unit vectors + face angles for a tidy latitude-ring sphere. */
function buildSphereUnits() {
  // Half-angles of a flat card sitting on the sphere surface.
  const halfW = Math.atan(CARD_RATIO / 2);
  const halfH = Math.atan(CARD_RATIO / (2 * CARD_ASPECT));
  const latStep = ((2 * halfH * RING_GAP) * 180) / Math.PI;
  const ringCount = Math.max(3, Math.floor((2 * MAX_LAT) / latStep) + 1);
  const units = [];

  for (let k = 0; k < ringCount; k++) {
    const latDeg = -MAX_LAT + (ringCount === 1 ? 0 : (k / (ringCount - 1)) * 2 * MAX_LAT);
    const lat = (latDeg * Math.PI) / 180;
    const cosLat = Math.max(0.18, Math.cos(lat));
    // Longitude step must clear the projected card width at this latitude.
    const lonStepRad = (2 * halfW * RING_GAP) / cosLat;
    const perRing = Math.max(4, Math.round((2 * Math.PI) / lonStepRad));
    const step = 360 / perRing;
    const offset = (k % 2) * step * 0.5; // stagger odd rings like brickwork
    for (let j = 0; j < perRing; j++) {
      const lonDeg = j * step + offset;
      const lon = (lonDeg * Math.PI) / 180;
      units.push({
        x: cosLat * Math.sin(lon),
        y: Math.sin(lat),
        z: cosLat * Math.cos(lon),
        lat: latDeg,
        lon: lonDeg,
      });
    }
  }
  return units;
}

// Archive masters are shot underexposed. Lift just enough for a black UI.
function liftForScreen(url, maxW) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const frame = ctx.getImageData(0, 0, c.width, c.height);
        const d = frame.data;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < d.length; i += 16) {
          sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          count += 1;
        }
        const avg = sum / Math.max(1, count);
        const gain = clamp(115 / Math.max(8, avg), 1.2, 3.4);
        const gamma = avg < 50 ? 0.9 : 0.96;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = clamp(Math.pow(Math.min(1, (d[i] * gain) / 255), gamma) * 255, 0, 255);
          d[i + 1] = clamp(Math.pow(Math.min(1, (d[i + 1] * gain) / 255), gamma) * 255, 0, 255);
          d[i + 2] = clamp(Math.pow(Math.min(1, (d[i + 2] * gain) / 255), gamma) * 255, 0, 255);
        }
        ctx.putImageData(frame, 0, 0);
        c.toBlob(
          (blob) => resolve(blob ? URL.createObjectURL(blob) : url),
          "image/jpeg",
          0.92,
        );
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

function cardDecodeMax() {
  const w = window.innerWidth;
  if (w <= 380) return 320;
  if (w <= 640) return 400;
  if (w <= 900) return 480;
  return 560;
}

function rotateVec(u, yaw, pitch) {
  const yr = (yaw * Math.PI) / 180;
  const xr = (pitch * Math.PI) / 180;
  const cosY = Math.cos(yr), sinY = Math.sin(yr);
  const x1 = u.x * cosY + u.z * sinY;
  const z1 = -u.x * sinY + u.z * cosY;
  const cosX = Math.cos(xr), sinX = Math.sin(xr);
  const z2 = u.y * sinX + z1 * cosX;
  return { x: x1, z: z2 };
}

export function mountGallery(root, styles) {
  const stage = root.querySelector("[data-stage]");
  const world = root.querySelector("[data-world]");
  const orb = root.querySelector("[data-orb]");
  const core = root.querySelector("[data-core]");
  const rows = root.querySelector("[data-rows]");
  const gridEl = root.querySelector("[data-grid]");
  const gridBtn = root.querySelector("[data-grid-btn]");
  const lit = root.querySelector("[data-lit]");
  const plate = root.querySelector("[data-plate]");
  const litImg = root.querySelector("[data-lit-img]");
  const litTitle = root.querySelector("[data-lit-title]");
  const litWhere = root.querySelector("[data-lit-where]");
  if (!stage || !world || !orb || !rows || !gridBtn || !lit || !plate || !litImg) return () => {};

  const html = document.documentElement;
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  let R = 220;
  let cw = 100;
  let persp = 1200;
  let tilt = -4;
  let spin = 0;
  let dragX = 0, dragY = 0, velX = 0, velY = 0;
  let dragging = false;
  let pointerId = null;
  let lastX = 0, lastY = 0, downX = 0, downY = 0;
  let downCard = null;
  let touchArmed = false;
  let touchCaptured = false;
  let focused = -1;
  let focusedTile = -1;
  let sourceEl = null;
  let openToken = 0;
  let visible = false;
  let raf = 0;
  let loadedImages = false;
  let disposed = false;

  const decoded = new Array(SHOTS.length).fill(null);
  const cards = [];
  const gridFigs = [];
  const units = [];
  const tileShot = [];

  // ---- Build sphere -------------------------------------------------------
  units.push(...buildSphereUnits());

  // Identical photos as far apart on the sphere as possible
  const used = new Array(SHOTS.length).fill(0);
  const placed = SHOTS.map(() => []);
  const maxUse = Math.ceil(units.length / SHOTS.length);
  for (let i = 0; i < units.length; i++) {
    let best = -1,
      bestScore = -1;
    for (let s = 0; s < SHOTS.length; s++) {
      if (used[s] >= maxUse) continue;
      let minD = 4;
      for (const j of placed[s]) {
        const a = units[i],
          b = units[j];
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
        if (d < minD) minD = d;
      }
      const score = used[s] === 0 ? 5 : minD - used[s] * 0.02;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    tileShot.push(best);
    used[best] += 1;
    placed[best].push(i);

    const card = document.createElement("div");
    card.className = styles.card;
    card.dataset.idx = String(best);
    card.innerHTML = `<figure><img alt="${SHOTS[best].title.replace(/"/g, "&quot;")}" decoding="async"></figure>`;
    orb.appendChild(card);
    cards.push(card);
  }

  // Flat grid: one cell per unique photo
  for (let s = 0; s < SHOTS.length; s++) {
    const shot = SHOTS[s];
    const fig = document.createElement("figure");
    fig.dataset.idx = String(s);
    fig.innerHTML = `<img alt="${shot.title.replace(/"/g, "&quot;")}" decoding="async"><figcaption>${shot.title}</figcaption>`;
    rows.appendChild(fig);
    gridFigs.push(fig);
  }

  // ---- Layout -------------------------------------------------------------
  function layout() {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    // Fill more of the viewport so the orb reads as one round mass.
    const hr = w <= 380 ? 0.34 : w <= 640 ? 0.38 : 0.42;
    const wr = w <= 380 ? 0.4 : w <= 640 ? 0.4 : 0.36;
    const floor = w <= 380 ? 110 : w <= 640 ? 130 : 170;
    R = Math.max(floor, Math.min(420, h * hr, w * wr));
    cw = Math.round(Math.max(44, R * CARD_RATIO));
    persp = w <= 380 ? 820 : w <= 640 ? 980 : 1400;
    stage.style.perspective = persp + "px";

    const height = cw / CARD_ASPECT;
    for (let i = 0; i < cards.length; i++) {
      const u = units[i];
      const card = cards[i];
      card.style.width = cw + "px";
      card.style.height = height + "px";
      card.style.marginLeft = -cw / 2 + "px";
      card.style.marginTop = -height / 2 + "px";
      // Face outward: yaw to longitude, then pitch to latitude.
      card.style.transform =
        `translate3d(${u.x * R}px, ${-u.y * R}px, ${u.z * R}px) rotateY(${u.lon}deg) rotateX(${u.lat}deg)`;
    }
    if (core) {
      const d = Math.round(R * 1.78);
      core.style.width = d + "px";
      core.style.height = d + "px";
      core.style.marginLeft = -d / 2 + "px";
      core.style.marginTop = -d / 2 + "px";
    }
  }

  // ---- Render loop --------------------------------------------------------
  function frame() {
    raf = 0;
    if (disposed || !visible) return;

    if (!dragging && focused < 0) {
      dragX += velX + IDLE_SPIN;
      dragY += velY;
      velX *= 0.94;
      velY *= 0.94;
      if (Math.abs(velX) < 0.002) velX = 0;
      if (Math.abs(velY) < 0.002) velY = 0;
    }
    dragY = clamp(dragY, -PITCH - tilt, PITCH - tilt);

    const sx = tilt + dragY;
    const sy = spin + dragX;
    world.style.transform = `rotateY(${sy}deg) rotateX(${sx}deg)`;
    // Keep the soft core screen-aligned so gaps read as a solid orb, not a hollow shell.
    if (core) core.style.transform = `rotateX(${-sx}deg) rotateY(${-sy}deg)`;

    for (let i = 0; i < cards.length; i++) {
      const { z: zf } = rotateVec(units[i], sy, sx);
      // Front stays bright; far/back (inner) faces fall back like a real globe.
      let dim = zf >= 0 ? (1 - zf) * 0.12 : 0.12 + -zf * 0.5;
      let fade = 1;
      if (focused >= 0) {
        dim = Math.min(0.4, dim + 0.18);
        if (i === focusedTile) fade = 0;
      }
      const card = cards[i];
      const nextD = String(dim);
      if (card.style.getPropertyValue("--d") !== nextD) card.style.setProperty("--d", nextD);
      const nextOp = String(fade);
      if (card.style.opacity !== nextOp) card.style.opacity = nextOp;
    }
    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  // ---- Pointer: drag to rotate, click to open -----------------------------
  function onDown(e) {
    if (focused >= 0 || root.dataset.grid === "1") return;
    downCard = e.target.closest(`.${styles.card}`);
    downX = e.clientX; downY = e.clientY;
    lastX = e.clientX; lastY = e.clientY;
    pointerId = e.pointerId;
    velX = 0; velY = 0;
    if (e.pointerType === "touch") {
      touchArmed = true;
      touchCaptured = false;
      dragging = false;
    } else {
      dragging = true;
      touchArmed = false;
      touchCaptured = true;
      root.dataset.grabbing = "1";
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
  }
  function onMove(e) {
    if (pointerId !== e.pointerId) return;
    const x = e.clientX, y = e.clientY;
    const dxp = x - lastX, dyp = y - lastY;
    if (touchArmed && !touchCaptured) {
      const adx = Math.abs(x - downX), ady = Math.abs(y - downY);
      if (adx > 10 || ady > 10) {
        if (ady > adx * 1.15) {
          // vertical swipe → let the page scroll to the next section
          touchArmed = false;
          pointerId = null;
          return;
        }
        touchCaptured = true;
        dragging = true;
        try { stage.setPointerCapture(e.pointerId); } catch {}
      } else return;
    }
    if (!dragging) return;
    dragX += dxp * 0.13;
    dragY += dyp * 0.13;
    velX = dxp * 0.13;
    velY = dyp * 0.13;
    lastX = x; lastY = y;
  }
  function onUp(e) {
    if (pointerId != null && pointerId !== e.pointerId) return;
    const slop = matchMedia("(pointer:coarse)").matches ? 14 : 6;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const card = downCard;
    const shouldClick = !!card && moved <= slop && (dragging || touchArmed);
    dragging = false;
    touchArmed = false;
    touchCaptured = false;
    pointerId = null;
    downCard = null;
    delete root.dataset.grabbing;
    if (shouldClick) openLit(+card.dataset.idx, card);
  }
  listen(stage, "pointerdown", onDown);
  listen(stage, "pointermove", onMove);
  listen(stage, "pointerup", onUp);
  listen(stage, "pointercancel", onUp);

  // ---- Lightbox (FLIP) ----------------------------------------------------
  function openLit(idx, el) {
    if (idx < 0 || idx >= SHOTS.length) return;
    const shot = SHOTS[idx];
    focused = idx;
    focusedTile = cards.indexOf(el);
    sourceEl = el;
    root.dataset.open = "1";
    html.style.overflow = "hidden";
    lit.setAttribute("aria-hidden", "false");
    litTitle.textContent = shot.title;
    litWhere.textContent = shot.place;
    litImg.alt = shot.title;
    litImg.src = decoded[idx] || thumb(shot.id);

    const token = ++openToken;
    liftForScreen(full(shot.id), 1800).then((src) => {
      if (token !== openToken || disposed) return;
      litImg.src = src;
    });

    const from = el.getBoundingClientRect();
    const to = plate.getBoundingClientRect();
    const dxp = from.left + from.width / 2 - (to.left + to.width / 2);
    const dyp = from.top + from.height / 2 - (to.top + to.height / 2);
    const sc = Math.max(0.04, from.width / Math.max(1, to.width));
    plate.style.transition = "none";
    plate.style.transform = `translate(${dxp}px, ${dyp}px) scale(${sc})`;
    plate.getBoundingClientRect();
    plate.style.transition = "";
    plate.style.transform = "";
  }

  let closeTimer = 0;
  function closeLit() {
    if (focused < 0) return;
    const el = sourceEl;
    focused = -1;
    focusedTile = -1;
    delete root.dataset.open;
    lit.setAttribute("aria-hidden", "true");
    html.style.overflow = "";
    if (!el) {
      plate.style.transform = "";
      return;
    }
    const from = plate.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    const dxp = to.left + to.width / 2 - (from.left + from.width / 2);
    const dyp = to.top + to.height / 2 - (from.top + from.height / 2);
    const sc = Math.max(0.04, to.width / Math.max(1, from.width));
    plate.style.transform = `translate(${dxp}px, ${dyp}px) scale(${sc})`;
    closeTimer = window.setTimeout(() => {
      plate.style.transition = "none";
      plate.style.transform = "";
      plate.getBoundingClientRect();
      plate.style.transition = "";
    }, 640);
  }
  listen(lit, "click", (e) => {
    if (e.target.closest("[data-close]")) closeLit();
  });

  // ---- Grid toggle (globe ↔ flat view) ------------------------------------
  function toggleGrid(on) {
    const next = on ?? root.dataset.grid !== "1";
    if (next) {
      root.dataset.grid = "1";
      gridBtn.setAttribute("aria-pressed", "true");
      gridEl?.setAttribute("aria-hidden", "false");
    } else {
      delete root.dataset.grid;
      gridBtn.setAttribute("aria-pressed", "false");
      gridEl?.setAttribute("aria-hidden", "true");
    }
  }
  listen(gridBtn, "click", () => toggleGrid());
  listen(rows, "click", (e) => {
    const fig = e.target.closest("figure");
    if (!fig) return;
    openLit(+fig.dataset.idx, fig);
  });
  listen(window, "keydown", (e) => {
    if (e.key !== "Escape") return;
    if (focused >= 0) closeLit();
    else if (root.dataset.grid === "1") toggleGrid(false);
  });

  // ---- Images: load lazily when the section approaches the viewport -------
  function loadImages() {
    if (loadedImages) return;
    loadedImages = true;
    SHOTS.forEach((s, i) => {
      liftForScreen(thumb(s.id), cardDecodeMax()).then((url) => {
        if (disposed) return;
        decoded[i] = url;
        const gimg = gridFigs[i]?.querySelector("img");
        if (gimg) gimg.src = url;
        cards.forEach((card, t) => {
          if (tileShot[t] !== i) return;
          const img = card.querySelector("img");
          img.onload = () => img.classList.add(styles.in);
          img.src = url;
          if (img.complete) img.classList.add(styles.in);
        });
      });
    });
  }

  // ---- Visibility / resize ------------------------------------------------
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) loadImages();
      }
    },
    { rootMargin: "100% 0px" },
  );
  io.observe(root);
  const vis = new IntersectionObserver(
    (entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) startLoop();
    },
    { threshold: 0.05 },
  );
  vis.observe(root);

  const ro = new ResizeObserver(() => layout());
  ro.observe(stage);

  layout();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    clearTimeout(closeTimer);
    io.disconnect();
    vis.disconnect();
    ro.disconnect();
    cleanups.forEach((fn) => fn());
    html.style.overflow = "";
    delete root.dataset.open;
    delete root.dataset.grabbing;
    delete root.dataset.grid;
  };
}
