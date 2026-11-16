const VIDEO_SRC =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/04fd3d5f-99d7-476e-98a4-46c08518ffb3.mp4";

const CARD_COUNT = 10;
const PITCH = 196;
const LOOP = CARD_COUNT * PITCH;
const CENTER = 720;
const NORM = 706;
const AUTO_SPEED = 50; // u / second, right → left
const CORNER = 15;

function uValue(root) {
  const frame = root.querySelector("[data-frame]");
  const raw = getComputedStyle(frame).getPropertyValue("--u").trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function isMobile() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Rounded trapezoid: TL, TR, BR, BL in frame units → CSS path() */
function roundedQuadPath(x0, y0, x1, y1, x2, y2, x3, y3, r) {
  const pts = [
    [x0, y0],
    [x1, y1],
    [x2, y2],
    [x3, y3],
  ];

  const out = [];
  for (let i = 0; i < 4; i++) {
    const prev = pts[(i + 3) % 4];
    const curr = pts[i];
    const next = pts[(i + 1) % 4];

    const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
    const toNext = [next[0] - curr[0], next[1] - curr[1]];
    const lenPrev = Math.hypot(toPrev[0], toPrev[1]) || 1;
    const lenNext = Math.hypot(toNext[0], toNext[1]) || 1;
    const rr = Math.min(r, lenPrev * 0.45, lenNext * 0.45);

    const p1 = [
      curr[0] + (toPrev[0] / lenPrev) * rr,
      curr[1] + (toPrev[1] / lenPrev) * rr,
    ];
    const p2 = [
      curr[0] + (toNext[0] / lenNext) * rr,
      curr[1] + (toNext[1] / lenNext) * rr,
    ];

    if (i === 0) out.push(`M ${p1[0]} ${p1[1]}`);
    else out.push(`L ${p1[0]} ${p1[1]}`);
    out.push(`Q ${curr[0]} ${curr[1]} ${p2[0]} ${p2[1]}`);
  }
  out.push("Z");
  return `path("${out.join(" ")}")`;
}

function cardGeometry(t) {
  const x = CENTER + t * (1 + 0.083 * (t / NORM) ** 2);
  const d = Math.abs(x - CENTER) / NORM;
  const w = 170 + 48 * d * d;
  const left = x - w / 2;
  const right = x + w / 2;
  const qL = Math.abs(left - CENTER) / NORM;
  const qR = Math.abs(right - CENTER) / NORM;
  const hL = 280 + 92 * qL ** 2.6;
  const hR = 280 + 92 * qR ** 2.6;
  const cy = 687 - 12 * d * d;
  return { x, w, left, right, hL, hR, cy, d };
}

function layoutCard(el, geo, u, mobile) {
  const { hL, hR, cy, w, x } = geo;
  const maxH = Math.max(hL, hR);
  const band = el.parentElement;
  const bandW = band.clientWidth;
  const bandH = band.clientHeight;

  // Spread across full carousel width (100vw), keep vertical rhythm from frame --u
  const kX = bandW / 1440;
  const kY = mobile ? Math.min(kX * 1.1, bandH / 400) : u;

  const wPx = w * kX;
  const hLpx = hL * kY;
  const hRpx = hR * kY;
  const hPx = Math.max(hLpx, hRpx);
  const leftPx = bandW / 2 + (x - CENTER) * kX - wPx / 2;
  const topPx = mobile
    ? bandH / 2 - hPx / 2
    : cy * kY - maxH * kY / 2;

  const y0 = hPx / 2 - hLpx / 2;
  const y1 = hPx / 2 - hRpx / 2;
  const corner = CORNER * Math.min(kX, kY);

  el.style.width = `${wPx}px`;
  el.style.height = `${hPx}px`;
  el.style.transform = `translate(${leftPx}px, ${topPx}px)`;
  el.style.clipPath = roundedQuadPath(
    0,
    y0,
    wPx,
    y1,
    wPx,
    y1 + hRpx,
    0,
    y0 + hLpx,
    corner
  );

  return { wPx, hPx, k: kX };
}

function fitMedia(card, geo, sizes) {
  const { wPx, hPx } = sizes;
  const tileH = Math.max(hPx, wPx / 0.7111);
  const tileW = tileH * 0.7111;
  const idx = Number(card.dataset.tile);
  const col = idx % 5;
  const row = (idx / 5) | 0;

  const sheets = card.querySelectorAll("[data-sheet]");
  sheets.forEach((sheet) => {
    sheet.style.width = `${tileW * 5}px`;
    sheet.style.height = `${tileH * 2}px`;
    sheet.style.transform = `translate(${-col * tileW}px, ${-row * tileH}px)`;
  });

  const poster = card.querySelector("[data-poster]");
  if (poster) {
    poster.style.backgroundSize = `${tileW * 5}px ${tileH * 2}px`;
    poster.style.backgroundPosition = `${-col * tileW}px ${-row * tileH}px`;
  }
}

function drawIn(svg, duration = 900, delay = 0) {
  const nodes = svg.querySelectorAll("path, polyline, line");
  nodes.forEach((node, i) => {
    let len = 120;
    try {
      if (typeof node.getTotalLength === "function") len = node.getTotalLength();
    } catch (_) {}
    node.style.strokeDasharray = `${len}`;
    node.style.strokeDashoffset = `${len}`;
    node.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      {
        duration,
        delay: delay + i * 80,
        fill: "forwards",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  });
}

function runEntrance(root) {
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => [...root.querySelectorAll(sel)];

  const logo = q("[data-logo]");
  if (logo) {
    logo.animate(
      [
        { opacity: 0, transform: "translateY(-12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 700,
        delay: 80,
        fill: "forwards",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  }

  const badge = q("[data-badge]");
  if (badge) {
    badge.animate(
      [
        { opacity: 0, transform: "scale(0.92)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 550,
        delay: 280,
        fill: "forwards",
        easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      }
    );
  }

  qa("[data-line]").forEach((el, i) => {
    el.animate(
      [
        { opacity: 0, filter: "blur(12px)", transform: "translateY(28px)" },
        { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
      ],
      {
        duration: 800,
        delay: 380 + i * 120,
        fill: "forwards",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  });

  const sub = q("[data-subline]");
  if (sub) {
    sub.animate(
      [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 700,
        delay: 700,
        fill: "forwards",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  }

  const carousel = q("[data-carousel]");
  if (carousel) {
    const from = isMobile() ? "translateY(24px)" : "translate(-50%, 40px)";
    const to = isMobile() ? "translateY(0)" : "translate(-50%, 0)";
    carousel.animate(
      [
        { opacity: 0, transform: from },
        { opacity: 1, transform: to },
      ],
      {
        duration: 900,
        delay: 820,
        fill: "forwards",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  }

  qa("[data-draw]").forEach((svg, i) => drawIn(svg, 900, 1000 + i * 120));

  qa("[data-note]").forEach((el, i) => {
    el.animate(
      [
        { opacity: 0 },
        { opacity: 1 },
      ],
      {
        duration: 600,
        delay: 1200 + i * 100,
        fill: "forwards",
        easing: "ease-out",
      }
    );
  });
}

export function mountReelmark(root) {
  const carousel = root.querySelector("[data-carousel]");
  const cards = [...root.querySelectorAll("[data-card]")];
  const videos = cards.map((c) => c.querySelector("video"));
  let disposed = false;
  let raf = 0;
  const cleanups = [];

  // Shared clock via WAAPI
  const clock = document.documentElement.animate(
    [{ opacity: 1 }, { opacity: 1 }],
    { duration: 1e9, iterations: 1 }
  );
  clock.pause();
  clock.currentTime = 0;
  cleanups.push(() => clock.cancel());

  let scroll = 0;
  let velocity = 0; // u/s in scroll-space (positive → cards move left)
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let dragSamples = [];
  let auto = !reducedMotion();
  let autoAnchorScroll = 0;
  let autoAnchorTime = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerMoved = false;
  let activeCard = null;
  let openTile = -1;

  const lightbox = root.querySelector("[data-lightbox]");
  const lightboxMedia = root.querySelector("[data-lightbox-media]");
  const lightboxPoster = root.querySelector("[data-lightbox-poster]");
  const lightboxVideo = root.querySelector("[data-lightbox-video]");

  function fitLightboxTile(tileIndex) {
    if (!lightboxMedia || !lightboxPoster || !lightboxVideo) return;
    const w = lightboxMedia.clientWidth || 360;
    const h = lightboxMedia.clientHeight || 640;
    const tileH = Math.max(h, w / 0.7111);
    const tileW = tileH * 0.7111;
    const col = tileIndex % 5;
    const row = (tileIndex / 5) | 0;
    const x = -col * tileW;
    const y = -row * tileH;

    lightboxPoster.style.width = `${tileW * 5}px`;
    lightboxPoster.style.height = `${tileH * 2}px`;
    lightboxPoster.style.transform = `translate(${x}px, ${y}px)`;
    lightboxPoster.style.backgroundSize = `${tileW * 5}px ${tileH * 2}px`;
    lightboxPoster.style.backgroundPosition = `${x}px ${y}px`;
    lightboxPoster.classList.add("is-ready");

    lightboxVideo.style.width = `${tileW * 5}px`;
    lightboxVideo.style.height = `${tileH * 2}px`;
    lightboxVideo.style.transform = `translate(${x}px, ${y}px)`;
    lightboxVideo.classList.add("is-ready");
  }

  function openLightbox(tileIndex) {
    if (!lightbox || !lightboxVideo) return;
    openTile = tileIndex;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    fitLightboxTile(tileIndex);

    const source = videos[tileIndex];
    if (!lightboxVideo.getAttribute("src")) {
      lightboxVideo.src = VIDEO_SRC;
    }
    const syncAndPlay = () => {
      fitLightboxTile(tileIndex);
      if (source && source.duration) {
        try {
          lightboxVideo.currentTime = source.currentTime;
        } catch (_) {}
      }
      lightboxVideo.muted = true;
      lightboxVideo.play().catch(() => {});
    };
    if (lightboxVideo.readyState >= 2) syncAndPlay();
    else lightboxVideo.addEventListener("loadeddata", syncAndPlay, { once: true });
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    openTile = -1;
    document.body.style.overflow = "";
    if (lightboxVideo) lightboxVideo.pause();
  }

  function syncVideos(masterTime) {
    for (const v of videos) {
      if (!v || !v.duration || !Number.isFinite(v.duration)) continue;
      const target = masterTime % v.duration;
      if (Math.abs(v.currentTime - target) > 0.08) {
        try {
          v.currentTime = target;
        } catch (_) {}
      }
    }
  }

  function render() {
    const u = uValue(root);
    const mobile = isMobile();
    // Keep cards whose unpushed centers are near the viewport strip
    for (let i = 0; i < cards.length; i++) {
      let base = i * PITCH - scroll;
      // Wrap into a centered window around 0..LOOP, then shift so mean is near center
      base = ((base % LOOP) + LOOP) % LOOP;
      // Place strip so that when scroll=0, card 0 is near left; recenter:
      // Convert to offset from center: treat positions 0..LOOP mapped with origin at CENTER
      let t = base - LOOP / 2;
      // Duplicate wrap neighbors for seamless edges
      if (t > LOOP / 2) t -= LOOP;
      if (t < -LOOP / 2) t += LOOP;

      // Also spawn wrap copies conceptually by picking nearest t to center
      const candidates = [t, t + LOOP, t - LOOP];
      let best = candidates[0];
      let bestAbs = Math.abs(best);
      for (const c of candidates) {
        if (Math.abs(c) < bestAbs) {
          best = c;
          bestAbs = Math.abs(c);
        }
      }
      t = best;

      const geo = cardGeometry(t);
      const sizes = layoutCard(cards[i], geo, u, mobile);
      fitMedia(cards[i], geo, sizes);

      // Hide far-off cards (wider strip so more of the arc stays visible)
      const hide = Math.abs(geo.x - CENTER) > 1180;
      cards[i].style.visibility = hide ? "hidden" : "visible";
    }
  }

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);

    const now = performance.now();
    const tClock = clock.currentTime || 0;
    // Use rAF dt for physics; clock for continuous auto reference
    if (!frame._last) frame._last = now;
    let dt = (now - frame._last) / 1000;
    if (dt > 0.05) dt = 0.05;
    frame._last = now;

    if (!dragging && !reducedMotion()) {
      if (Math.abs(velocity) > 2) {
        scroll += velocity * dt;
        velocity *= Math.pow(0.05, dt); // ~95% decay / second
        autoAnchorScroll = scroll;
        autoAnchorTime = tClock;
      } else {
        velocity = 0;
        if (auto) {
          const elapsed = ((tClock - autoAnchorTime) / 1000) || 0;
          scroll = autoAnchorScroll + AUTO_SPEED * elapsed;
        }
      }
    }

    // Keep scroll bounded
    scroll = ((scroll % LOOP) + LOOP) % LOOP;

    render();

    const master = videos.find((v) => v && v.readyState >= 2 && v.duration);
    if (master && !reducedMotion()) {
      syncVideos(master.currentTime);
    }
  }

  // Pointer drag
  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    pointerMoved = false;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    activeCard = e.target.closest?.("[data-card]") || null;
    carousel.classList.add("is-dragging");
    lastX = e.clientX;
    lastT = performance.now();
    dragSamples = [];
    velocity = 0;
    autoAnchorScroll = scroll;
    autoAnchorTime = clock.currentTime || 0;
    try {
      carousel.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dxTotal = e.clientX - pointerStartX;
    const dyTotal = e.clientY - pointerStartY;
    if (Math.hypot(dxTotal, dyTotal) > 8) pointerMoved = true;

    const dx = e.clientX - lastX;
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastT) / 1000);
    const pxPerUnit = carousel.clientWidth / 1440;
    const du = dx / pxPerUnit;
    scroll -= du;
    const vInst = -du / dt;
    dragSamples.push({ t: now, v: vInst });
    dragSamples = dragSamples.filter((s) => now - s.t < 100);
    lastX = e.clientX;
    lastT = now;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    carousel.classList.remove("is-dragging");
    if (dragSamples.length) {
      velocity = dragSamples.reduce((a, s) => a + s.v, 0) / dragSamples.length;
    }
    autoAnchorScroll = scroll;
    autoAnchorTime = clock.currentTime || 0;

    if (!pointerMoved && activeCard) {
      const tile = Number(activeCard.dataset.tile);
      if (Number.isFinite(tile)) openLightbox(tile);
    }
    activeCard = null;
  }

  carousel.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  const onLightboxClick = (e) => {
    if (e.target.closest("[data-lightbox-close]")) closeLightbox();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") closeLightbox();
  };
  const onLightboxResize = () => {
    if (lightbox && !lightbox.hidden && openTile >= 0) {
      fitLightboxTile(openTile);
    }
  };
  lightbox?.addEventListener("click", onLightboxClick);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onLightboxResize);

  cleanups.push(() => {
    carousel.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    lightbox?.removeEventListener("click", onLightboxClick);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onLightboxResize);
    closeLightbox();
  });

  // Video setup
  if (!reducedMotion()) {
    let masterReady = false;
    videos.forEach((v, i) => {
      if (!v) return;
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = "auto";
      v.src = VIDEO_SRC;

      const markReady = () => {
        const sheets = cards[i].querySelectorAll("[data-sheet]");
        sheets.forEach((s) => s.classList.add("is-ready"));
      };

      v.addEventListener(
        "loadeddata",
        () => {
          markReady();
          if (!masterReady) {
            masterReady = true;
            v.play().catch(() => {});
          } else {
            const master = videos[0];
            if (master && master.duration) {
              try {
                v.currentTime = master.currentTime;
              } catch (_) {}
            }
            v.play().catch(() => {});
          }
        },
        { once: true }
      );
    });

    // Keep all videos locked to first
    const syncTimer = setInterval(() => {
      const master = videos[0];
      if (!master || !master.duration) return;
      for (let i = 1; i < videos.length; i++) {
        const v = videos[i];
        if (!v || !v.duration) continue;
        if (Math.abs(v.currentTime - master.currentTime) > 0.1) {
          try {
            v.currentTime = master.currentTime;
          } catch (_) {}
        }
      }
    }, 250);
    cleanups.push(() => clearInterval(syncTimer));
  } else {
    // posters only
    cards.forEach((card) => {
      const poster = card.querySelector("[data-poster]");
      if (poster) poster.classList.add("is-ready");
      const v = card.querySelector("video");
      if (v) v.remove();
    });
  }

  const onResize = () => render();
  window.addEventListener("resize", onResize);
  cleanups.push(() => window.removeEventListener("resize", onResize));

  if (reducedMotion()) {
    root.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
    });
    root.querySelectorAll("[data-draw] path, [data-draw] polyline, [data-draw] line").forEach((n) => {
      n.style.strokeDashoffset = "0";
    });
  } else {
    runEntrance(root);
    clock.play();
  }

  render();
  raf = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    for (const fn of cleanups) fn();
    videos.forEach((v) => {
      if (!v) return;
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
  };
}
