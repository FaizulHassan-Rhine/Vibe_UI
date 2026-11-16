import { FILMS, SHEET, CROP, cropBackground, posterSvgAttrs } from "./data.js";

const N = FILMS.length;
const COPIES = 3;
const TOTAL = N * COPIES;
const P = 1400;
const EASE = "cubic-bezier(.2,.8,.2,1)";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(x) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function wrapRel(v, s) {
  let r = ((v - s) % TOTAL + TOTAL) % TOTAL;
  if (r >= TOTAL / 2) r -= TOTAL;
  return r;
}

function B(r) {
  if (Math.abs(r) < 1) return (r + Math.sin(Math.PI * r) / Math.PI) / 2;
  return Math.sign(r) * 0.5;
}

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function finePointer() {
  return matchMedia("(pointer: fine)").matches;
}

function preloadSheets() {
  return Promise.all(
    Object.values(SHEET).map(
      ([url]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        })
    )
  );
}

function buildXs(U) {
  // Integrate scl(u): each 2px step adds 2/(1+(u/U)^1.6) == step * scl
  const step = 2;
  const max = U * 3;
  const XS = [0];
  let acc = 0;
  for (let u = step; u <= max + 0.001; u += step) {
    const mid = u - step / 2;
    acc += 2 / (1 + (mid / U) ** 1.6);
    XS.push(acc);
  }
  return { XS, step };
}

function xsc(u, XS, step) {
  const a = Math.abs(u);
  const i = Math.min(XS.length - 1, Math.floor(a / step));
  const t = (a - i * step) / step;
  const v = i >= XS.length - 1 ? XS[XS.length - 1] : lerp(XS[i], XS[i + 1], t);
  return Math.sign(u || 1) * v;
}

function applyCrop(el, key) {
  const style = cropBackground(key);
  Object.assign(el.style, style);
}

export function mountVasari(root) {
  const reduced = reducedMotion();
  const shelf = root.querySelector("[data-shelf]");
  const stage = root.querySelector("[data-stage]");
  const probe = root.querySelector("[data-probe]");
  const play = root.querySelector("[data-play]");
  const ticksEl = root.querySelector("[data-ticks]");
  const dot = root.querySelector("[data-dot]");
  const tlHit = root.querySelector("[data-tl-hit]");
  const cursor = root.querySelector("[data-cursor]");
  const detail = root.querySelector("[data-detail]");
  const posterImg = root.querySelector("[data-poster-img]");
  const blotCircles = [...root.querySelectorAll("[data-blots] circle")];

  if (finePointer()) root.classList.add("fine-pointer");

  // Timeline ticks 1955–1990
  for (let y = 1955; y <= 1990; y++) {
    const left = ((y - 1955) / 35) * 100;
    const major = y % 5 === 0;
    const tick = document.createElement("div");
    tick.className = major
      ? `${root.querySelector("[data-ticks]").parentElement.className.includes("timeline") ? "" : ""}`
      : "";
    // Use module-agnostic classes via data attrs + inline styles for ticks
    tick.style.cssText = `position:absolute;top:12px;left:${left}%;width:1px;transform:translateX(-50%);background:#1F3FB0;height:${major ? 13 : 7}px;opacity:${major ? 0.75 : 0.4}`;
    ticksEl.appendChild(tick);
    if (major) {
      const lab = document.createElement("div");
      lab.textContent = String(y);
      lab.style.cssText = `position:absolute;top:28px;left:${left}%;font-family:var(--font-inter-tight),system-ui,sans-serif;font-weight:500;font-size:9.5px;color:#1F3FB0;${
        y === 1955
          ? "transform:none"
          : y === 1990
            ? "transform:translateX(-100%)"
            : "transform:translateX(-50%)"
      }`;
      if ((y - 1955) % 10 !== 0 && y !== 1955 && y !== 1990) {
        lab.classList.add("tlLabelHideMobile");
        lab.style.cssText += ";";
        // mobile hide via media query class on section child - add attribute
        lab.dataset.minorLabel = "1";
      }
      // Hide every other on mobile via CSS attribute
      if ((y - 1955) / 5 % 2 === 1 && y !== 1955 && y !== 1990) {
        lab.setAttribute("data-hide-sm", "");
      }
      ticksEl.appendChild(lab);
    }
  }

  // Add mobile hide rule dynamically
  const styleTag = document.createElement("style");
  styleTag.textContent = `@media(max-width:767px){[data-hide-sm]{display:none!important}}`;
  root.appendChild(styleTag);

  // Build tapes
  const tapes = [];
  for (let copy = 0; copy < COPIES; copy++) {
    for (let i = 0; i < N; i++) {
      const film = FILMS[i];
      const v = copy * N + i;
      const el = document.createElement("div");
      el.className = root.querySelector("[data-stage]").previousElementSibling
        ? ""
        : "";
      // Get hashed class from an existing tape template - create with inline critical 3d styles
      el.style.cssText =
        "position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;will-change:transform";
      el.dataset.v = String(v);
      el.dataset.i = String(i);

      const sp = document.createElement("div");
      sp.style.cssText =
        "position:absolute;top:calc(var(--H)/-2);height:var(--H);border-radius:2px;backface-visibility:hidden;overflow:hidden;background-repeat:no-repeat;pointer-events:auto;cursor:pointer";
      sp.dataset.face = "sp";
      applyCrop(sp, `spine-${film.id}`);
      const spShade = document.createElement("div");
      spShade.style.cssText =
        "position:absolute;inset:0;background:#000;pointer-events:none;opacity:0";
      sp.appendChild(spShade);

      const cv = document.createElement("div");
      cv.style.cssText =
        "position:absolute;top:calc(var(--H)/-2);height:var(--H);border-radius:2px;backface-visibility:hidden;overflow:hidden;background-repeat:no-repeat;box-shadow:0 34px 60px -30px rgba(20,16,10,.6);pointer-events:auto;cursor:pointer";
      cv.dataset.face = "cv";
      applyCrop(cv, `cover-${film.id}`);
      const cvShade = document.createElement("div");
      cvShade.style.cssText =
        "position:absolute;inset:0;background:#000;pointer-events:none;opacity:0";
      cv.appendChild(cvShade);

      el.appendChild(sp);
      el.appendChild(cv);
      stage.appendChild(el);
      tapes.push({
        el,
        sp,
        cv,
        spShade,
        cvShade,
        v,
        i,
        lift: 0,
        liftT: 0,
      });
    }
  }

  let H = probe.offsetHeight || 200;
  let ws = (H * 142) / 840;
  let d = (H * 474) / 900;
  let gap = H * 0.035;
  let U = window.innerWidth < 768 ? H * 1.05 : H * 1.3;
  let xsPack = buildXs(U);

  function F(r) {
    return r * (ws + gap) + (d - ws + 1.4 * gap) * B(r);
  }

  function scl(u) {
    return 1 / (1 + (Math.abs(u) / U) ** 1.6);
  }

  function measure() {
    H = probe.offsetHeight || 200;
    ws = (H * 142) / 840;
    d = (H * 474) / 900;
    gap = H * 0.035;
    U = window.innerWidth < 768 ? H * 1.05 : H * 1.3;
    xsPack = buildXs(U);
    root.style.setProperty("--ws", `${ws}px`);
    root.style.setProperty("--d", `${d}px`);
    tapes.forEach((t) => {
      t.sp.style.width = `${ws}px`;
      t.sp.style.transform = `translateZ(${(d / 2).toFixed(3)}px)`;
      t.cv.style.width = `${d}px`;
      t.cv.style.transform = `rotateY(90deg) translateZ(${(ws / 2).toFixed(3)}px)`;
    });
  }
  measure();

  let s = 5 + N;
  let T = s;
  let active = 5;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let T0 = T;
  let wheelTimer = 0;
  let detailOpen = false;
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  let tiltX = 0;
  let tiltY = 0;
  let tlYear = FILMS[active].year;
  let playScale = 1;
  let disposed = false;
  let raf = 0;
  const cleanups = [];
  const anims = [];

  function setCaption(film, dir = 1, instant = false) {
    const fields = [
      ["title", film.title],
      ["sub", `${film.romaji} / ${film.kanji}`],
      ["meta", `${film.year} — ${film.genre}`],
    ];
    fields.forEach(([key, text]) => {
      const mask = root.querySelector(`[data-mask="${key}"]`);
      if (!mask) return;
      const olds = [...mask.querySelectorAll("[data-line]")];
      const span = document.createElement("span");
      span.dataset.line = key;
      span.className = olds[0]?.className || "";
      span.textContent = text;
      span.style.display = "block";
      span.style.width = "100%";
      mask.appendChild(span);

      if (instant || reduced) {
        olds.forEach((o) => o.remove());
        span.style.transform = "none";
        return;
      }

      span.style.transform = `translateY(${dir * 105}%)`;
      const a1 = span.animate(
        [{ transform: `translateY(${dir * 105}%)` }, { transform: "translateY(0)" }],
        { duration: 650, easing: EASE, fill: "forwards" }
      );
      anims.push(a1);
      olds.forEach((old) => {
        const from = old.style.transform || "translateY(0)";
        const a2 = old.animate(
          [{ transform: from }, { transform: `translateY(${-dir * 105}%)` }],
          { duration: 650, easing: EASE, fill: "forwards" }
        );
        a2.onfinish = () => old.remove();
        anims.push(a2);
      });
    });
  }

  setCaption(FILMS[active], 1, true);

  function goTo(index, shortest = true) {
    let cur = ((Math.round(T) % N) + N) % N;
    let delta = index - cur;
    if (shortest) {
      if (delta > N / 2) delta -= N;
      if (delta < -N / 2) delta += N;
    }
    T = Math.round(T) + delta;
  }

  function step(dir) {
    T = Math.round(T) + dir;
  }

  function activeCoverRect() {
    const coverEl = tapes.find((t) => t.i === active && Math.abs(wrapRel(t.v, s)) < 0.6)?.cv;
    if (coverEl) {
      const r = coverEl.getBoundingClientRect();
      if (r.width > 8 && r.height > 8) return r;
    }
    // Fallback: approximate centered cover from geometry
    const rootRect = root.getBoundingClientRect();
    const cyRatio = parseFloat(getComputedStyle(root).getPropertyValue("--cy")) / 100 || 0.41;
    const cx = rootRect.left + rootRect.width / 2;
    const cy = rootRect.top + rootRect.height * cyRatio;
    return {
      top: cy - H / 2,
      left: cx - d / 2,
      right: cx + d / 2,
      bottom: cy + H / 2,
      width: d,
      height: H,
    };
  }

  function insetFromCover(rect) {
    const rootRect = root.getBoundingClientRect();
    return {
      top: Math.max(0, rect.top - rootRect.top),
      left: Math.max(0, rect.left - rootRect.left),
      right: Math.max(0, rootRect.right - rect.right),
      bottom: Math.max(0, rootRect.bottom - rect.bottom),
    };
  }

  function openDetail() {
    if (detailOpen || !detail) return;
    detailOpen = true;
    const film = FILMS[active];
    T = Math.round(T);
    s = T;

    root.querySelector("[data-d-sub]").textContent = `${film.romaji} / ${film.kanji}`;
    root.querySelector("[data-d-title]").textContent = film.title;
    root.querySelector("[data-d-meta]").textContent = `${film.year} / ${film.genre} / ${film.min} min`;
    root.querySelector("[data-d-syn]").textContent = film.synopsis;

    const attrs = posterSvgAttrs(film.id);
    posterImg.setAttribute("href", attrs.href);
    posterImg.setAttributeNS("http://www.w3.org/1999/xlink", "href", attrs.href);
    posterImg.setAttribute("x", String(attrs.x));
    posterImg.setAttribute("y", String(attrs.y));
    posterImg.setAttribute("width", String(attrs.width));
    posterImg.setAttribute("height", String(attrs.height));

    const blots = [...root.querySelectorAll("[data-blots] circle")];
    blots.forEach((c) => c.setAttribute("r", "0"));

    const inset = insetFromCover(activeCoverRect());
    const from = `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px round 3px)`;

    detail.dataset.open = "1";
    detail.style.display = "block";
    detail.style.pointerEvents = "auto";
    detail.style.clipPath = from;

    // Cancel prior detail animations
    detail.getAnimations?.().forEach((a) => a.cancel());

    const dur = reduced ? 1 : 1050;
    const sheetAnim = detail.animate(
      [{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }],
      { duration: dur, easing: "cubic-bezier(.76, 0, .18, 1)", fill: "forwards" }
    );
    anims.push(sheetAnim);

    const lines = [
      ...detail.querySelectorAll(
        "[data-d-sub],[data-d-title],[data-d-meta],[data-d-syn],[data-d-credit],[data-d-watch]"
      ),
    ];
    lines.forEach((el, i) => {
      el.getAnimations?.().forEach((a) => a.cancel());
      const delay = reduced ? 0 : 620 + i * 75;
      const anim = el.animate(
        [{ transform: "translateY(110%)" }, { transform: "translateY(0%)" }],
        {
          duration: reduced ? 1 : 900,
          delay,
          easing: EASE,
          fill: "both",
        }
      );
      anims.push(anim);
    });

    blots.forEach((c) => {
      const delay = Number(c.dataset.delay || 0);
      if (reduced) {
        c.setAttribute("r", "720");
        return;
      }
      c.setAttribute("r", "0");
      const start = performance.now() + 520 + delay;
      const grow = (now) => {
        if (disposed || !detailOpen) return;
        const t = (now - start) / 1250;
        if (t < 0) {
          requestAnimationFrame(grow);
          return;
        }
        const e = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
        c.setAttribute("r", String(720 * e));
        if (t < 1) requestAnimationFrame(grow);
      };
      requestAnimationFrame(grow);
    });
  }

  function closeDetail() {
    if (!detailOpen || !detail) return;
    const inset = insetFromCover(activeCoverRect());
    const to = `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px round 3px)`;
    const dur = reduced ? 1 : 850;

    detail.getAnimations?.().forEach((a) => a.cancel());
    const a = detail.animate(
      [{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: to }],
      { duration: dur, easing: "cubic-bezier(.76, 0, .18, 1)", fill: "forwards" }
    );
    a.onfinish = () => {
      detail.dataset.open = "0";
      detail.style.display = "none";
      detail.style.clipPath = "";
      detail.style.pointerEvents = "none";
      detailOpen = false;
    };
    anims.push(a);
  }

  function hitTape(clientX, clientY) {
    const stack = document.elementsFromPoint?.(clientX, clientY) || [
      document.elementFromPoint(clientX, clientY),
    ];
    for (const el of stack) {
      const tape = el?.closest?.("[data-v]");
      if (tape && stage.contains(tape)) return tape;
    }
    return null;
  }

  function nearActiveCover(clientX, clientY) {
    if (Math.abs(T - s) > 0.35) return false;
    const rect = activeCoverRect();
    const padX = rect.width * 0.15;
    const padY = rect.height * 0.1;
    return (
      clientX >= rect.left - padX &&
      clientX <= rect.right + padX &&
      clientY >= rect.top - padY &&
      clientY <= rect.bottom + padY
    );
  }

  // Pointer / drag — capture only after drag starts so clicks hit tapes
  let pointerId = null;
  function onPointerDown(e) {
    if (detailOpen) return;
    if (e.target.closest("button,a,[data-btn],[data-tl-hit],[data-detail]")) return;
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    T0 = T;
    pointerId = e.pointerId;
  }

  function onPointerMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (!dragMoved && Math.abs(dx) > 5) {
      dragMoved = true;
      try {
        shelf.setPointerCapture(pointerId ?? e.pointerId);
      } catch (_) {}
    }
    if (dragMoved) T = T0 - dx / (ws + gap);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    try {
      if (pointerId != null) shelf.releasePointerCapture(pointerId);
    } catch (_) {}
    pointerId = null;

    if (dragMoved) {
      T = Math.round(T);
      return;
    }

    const tapeEl = hitTape(e.clientX, e.clientY);
    if (tapeEl) {
      const v = Number(tapeEl.dataset.v);
      const r = wrapRel(v, s);
      if (Math.abs(r) < 0.5) openDetail();
      else T = Math.round(T + r);
      return;
    }

    // OPEN-cursor zone: click center cover even if 3D hit-test misses
    if (nearActiveCover(e.clientX, e.clientY)) openDetail();
  }

  shelf.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  cleanups.push(() => {
    shelf.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  });

  root.querySelector("[data-prev]")?.addEventListener("click", () => step(-1));
  root.querySelector("[data-next]")?.addEventListener("click", () => step(1));
  root.querySelector("[data-detail-close]")?.addEventListener("click", closeDetail);

  function onKey(e) {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
    if (e.key === "Enter" && !detailOpen) openDetail();
    if (e.key === "Escape") closeDetail();
  }
  window.addEventListener("keydown", onKey);
  cleanups.push(() => window.removeEventListener("keydown", onKey));

  function onWheel(e) {
    if (detailOpen) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    T += (delta / (ws + gap)) * 0.5;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      T = Math.round(T);
    }, 160);
  }
  shelf.addEventListener("wheel", onWheel, { passive: false });
  cleanups.push(() => shelf.removeEventListener("wheel", onWheel));

  tlHit?.addEventListener("click", (e) => {
    const rect = tlHit.getBoundingClientRect();
    const t = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const year = 1955 + t * 35;
    let best = 0;
    let bestD = Infinity;
    FILMS.forEach((f, i) => {
      const dlt = Math.abs(f.year - year);
      if (dlt < bestD) {
        bestD = dlt;
        best = i;
      }
    });
    goTo(best);
  });

  function onResize() {
    measure();
  }
  window.addEventListener("resize", onResize);
  cleanups.push(() => window.removeEventListener("resize", onResize));

  preloadSheets();

  let last = performance.now();
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    if (dt > 0.05) dt = 0.05;
    last = now;

    const kSpring = dragging ? 18 : 5.2;
    if (reduced) s = T;
    else s += (T - s) * (1 - Math.exp(-kSpring * dt));

    // keep in middle copy
    if (s > N * 2 + 4) {
      s -= N;
      T -= N;
    } else if (s < N - 4) {
      s += N;
      T += N;
    }

    const nextActive = ((Math.round(s) % N) + N) % N;
    if (nextActive !== active) {
      const dir = Math.sign(T - s) || 1;
      active = nextActive;
      setCaption(FILMS[active], dir);
    }

    // timeline year
    const f0 = Math.floor(s);
    const frac = s - f0;
    const i0 = ((f0 % N) + N) % N;
    const i1 = (i0 + 1) % N;
    let yTarget;
    if (FILMS[i0].year === 1989 && FILMS[i1].year === 1958) {
      yTarget = frac < 0.5 ? FILMS[i0].year : FILMS[i1].year;
    } else {
      yTarget = lerp(FILMS[i0].year, FILMS[i1].year, frac);
    }
    if (Math.abs(yTarget - tlYear) > 6 || reduced) tlYear = yTarget;
    else tlYear += (yTarget - tlYear) * (1 - Math.exp(-14 * dt));
    const tlT = (tlYear - 1955) / 35;
    if (dot) dot.style.left = `${tlT * 100}%`;

    // cursor smooth
    cx += (mx - cx) * (1 - Math.exp(-16 * dt));
    cy += (my - cy) * (1 - Math.exp(-16 * dt));
    if (cursor) cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;

    const rootRect = root.getBoundingClientRect();
    const shelfCy = rootRect.top + rootRect.height * (getComputedStyle(root).getPropertyValue("--cy").includes("%")
      ? parseFloat(getComputedStyle(root).getPropertyValue("--cy")) / 100
      : 0.41);

    const onCover =
      !detailOpen &&
      Math.abs(T - s) < 0.3 &&
      Math.abs(mx - (rootRect.left + rootRect.width / 2)) < 0.55 * d &&
      Math.abs(my - shelfCy) < 0.55 * H;

    let tiltYT;
    let tiltXT;
    if (onCover) {
      tiltYT = ((mx - (rootRect.left + rootRect.width / 2)) / (0.55 * d)) * 8;
      tiltXT = (-(my - shelfCy) / (H / 2)) * 5;
    } else {
      tiltYT = ((mx - (rootRect.left + rootRect.width / 2)) / rootRect.width) * 4;
      tiltXT = 0;
    }
    if (reduced) {
      tiltY = tiltYT;
      tiltX = tiltXT;
    } else {
      tiltY += (tiltYT - tiltY) * (1 - Math.exp(-7 * dt));
      tiltX += (tiltXT - tiltX) * (1 - Math.exp(-7 * dt));
    }

    playScale = detailOpen ? 0 : smoothstep(Math.max(0, 1 - Math.abs(T - s) * 3));
    if (play) {
      const W = rootRect.width;
      play.style.left = `${W / 2 - d / 2 - 6}px`;
      play.style.top = `${shelfCy - rootRect.top + 0.36 * H}px`;
      play.style.setProperty("--play-scale", String(playScale));
      play.style.transform = `translate(0, -50%) scale(${playScale})`;
    }

    // cursor states
    if (cursor && finePointer()) {
      cursor.classList.remove("open", "spine", "btn");
      const overBtn = document.elementFromPoint(mx, my)?.closest?.("[data-btn],a,button");
      if (detailOpen) {
        /* keep default */
      } else if (onCover) cursor.classList.add("open");
      else if (overBtn) cursor.classList.add("btn");
      else {
        const overTape = document.elementFromPoint(mx, my)?.closest?.("[data-v]");
        if (overTape) {
          const r = wrapRel(Number(overTape.dataset.v), s);
          if (Math.abs(r) > 0.5) cursor.classList.add("spine");
        }
      }
    }

    // hover lift
    let hoverV = -1;
    if (!detailOpen) {
      const el = document.elementFromPoint(mx, my)?.closest?.("[data-v]");
      if (el) hoverV = Number(el.dataset.v);
    }

    tapes.forEach((tape) => {
      const r = wrapRel(tape.v, s);
      // Sharper open curve so neighbors stay as spines (avoids black cover slabs)
      const oLin = Math.max(0, 1 - Math.abs(r));
      const o = smoothstep(oLin) * smoothstep(oLin);
      const u = F(r);
      if (Math.abs(u) > U * 1.95) {
        tape.el.style.visibility = "hidden";
        return;
      }
      tape.el.style.visibility = "visible";

      const wantLift = hoverV === tape.v && Math.abs(r) > 0.5 ? 1 : 0;
      if (reduced) tape.lift = wantLift;
      else tape.lift += (wantLift - tape.lift) * (1 - Math.exp(-12 * dt));

      const sc = scl(u);
      const k = 1 / Math.max(sc, 0.0001);
      const z = P * (1 - k) + o * H * 0.1;
      const x = xsc(u, xsPack.XS, xsPack.step) * k;
      const y =
        (H * 0.5 * (1 - sc) * 0.42 + o * H * 0.012 - tape.lift * H * 0.05) * k;
      const turn = Math.sign(u || 1) * Math.min(1, Math.abs(u) / U) * 22;
      const rotY = turn * (1 - o) - 90 * o + tiltY * o;
      const rotX = tiltX * o;

      tape.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      tape.el.style.zIndex = String(Math.round(3000 + z));

      // Crossfade faces — hide cover when spine, hide spine when open
      tape.sp.style.opacity = String(1 - o);
      tape.cv.style.opacity = String(o);
      tape.sp.style.visibility = o > 0.98 ? "hidden" : "visible";
      tape.cv.style.visibility = o < 0.02 ? "hidden" : "visible";

      const spineShade = Math.min(0.55, (1 - sc) * 0.38);
      const coverShade = (1 - o) * 0.5;
      tape.spShade.style.opacity = String(spineShade);
      tape.cvShade.style.opacity = String(coverShade);
    });
  }

  raf = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    clearTimeout(wheelTimer);
    anims.forEach((a) => a.cancel?.());
    cleanups.forEach((fn) => fn());
    document.body.style.overflow = "";
  };
}
