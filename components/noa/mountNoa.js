import {
  BACK_PETALS,
  FRONT_PETALS,
  MOTES,
  SEA_VIDEO,
  SITES,
  WORLDS,
} from "./data";

const N = SITES.length;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function spring(stiffness, damping, mass = 1) {
  let x = 0,
    v = 0,
    tx = 0;
  return {
    set(t) {
      tx = t;
    },
    jump(t) {
      x = tx = t;
      v = 0;
    },
    value() {
      return x;
    },
    step(dt) {
      const acc = (stiffness * (tx - x) - damping * v) / mass;
      v += acc * dt;
      x += v * dt;
      return x;
    },
  };
}

export function mountNoa(root) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => innerWidth <= 820;
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const frame = q("[data-frame]");
  const wall = q("[data-wall]");
  const lens = q("[data-lens]");
  const ring = q("[data-ring]");
  const loader = q("[data-loader]");
  const seaHome = q("[data-sea]");
  if (!frame || !wall || !ring || !loader) return () => {};

  seaHome.src = SEA_VIDEO;
  let disposed = false;
  let entered = false;
  let interactive = false;
  let formation = reduced ? 1 : 0;
  let expansion = reduced ? 1 : 0;
  let postersLoaded = 0;
  let m = 0;
  let dragging = false;
  let dragMarked = false;
  let dragStart = 0;
  let dragM0 = 0;
  let lastDragEnd = 0;
  let hoverE = 1;
  let raf = 0;
  let pointerOverCard = false;

  const rot = spring(150, 27, 1);
  const px = spring(40, 18, 1);
  const py = spring(40, 18, 1);
  rot.jump(0);

  // ---- petals / motes ----
  function fillPetals(host, list) {
    if (!host) return;
    list.forEach((item, i) => {
      const [l, t, w, dur, delay] = item;
      const el = document.createElement("span");
      el.className = "petal" + (i % 3 === 0 ? " mir" : "");
      el.style.left = l + "%";
      el.style.top = t + "%";
      el.style.width = w + "px";
      el.style.height = w * 0.62 + "px";
      el.style.background = i % 2 === 0 ? "#FFFFFF" : "#D6EEF3";
      el.style.animationDuration = dur + "s";
      el.style.animationDelay = delay + "s";
      host.appendChild(el);
    });
  }
  fillPetals(q("[data-petals-back]"), BACK_PETALS);
  fillPetals(q("[data-petals-front]"), FRONT_PETALS);
  fillPetals(q("[data-build-petals]"), [...BACK_PETALS, ...FRONT_PETALS]);
  const motesHost = q("[data-motes]");
  MOTES.forEach(([l, t, s, dur, delay]) => {
    const el = document.createElement("span");
    el.className = "mote";
    el.style.left = l + "%";
    el.style.top = t + "%";
    el.style.width = s + "px";
    el.style.height = s + "px";
    el.style.animationDuration = dur + "s";
    el.style.animationDelay = delay + "s";
    motesHost?.appendChild(el);
  });

  // ---- cards ----
  const cards = [];
  for (let e = 0; e < N; e++) {
    const a = document.createElement("a");
    a.className = "card";
    a.target = "_blank";
    a.rel = "noopener";
    const tilt = document.createElement("div");
    tilt.className = "tilt";
    const fr = document.createElement("div");
    fr.className = "frameRing";
    const face = document.createElement("div");
    face.className = "face";
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    const vid = document.createElement("video");
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = "none";
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<i></i><span></span>`;
    const label = document.createElement("div");
    label.className = "label";
    label.innerHTML = `<div class="w"></div><div class="t"></div><span class="arr">↗</span>`;
    const dim = document.createElement("div");
    dim.className = "dim";
    face.append(img, vid, chip, label, dim);
    tilt.append(fr, face);
    a.appendChild(tilt);
    ring.appendChild(a);
    const tx = spring(180, 24);
    const ty = spring(180, 24);
    const tz = spring(180, 24);
    cards.push({ el: a, tilt, img, vid, chip, label, fr, dim, tx, ty, tz, site: -1 });
  }

  function siteForSlot(e, rotation) {
    const a = Math.floor((360 * e) / N + rotation + 180) / 360;
    return (((e - Math.floor(a) * N + Math.min(3, N - 1)) % N) + N) % N;
  }

  function assignCard(card, si) {
    if (card.site === si) return;
    card.site = si;
    const s = SITES[si];
    const w = WORLDS[s.world];
    card.el.href = s.href;
    card.el.dataset.w = s.world;
    card.el.style.width = 160 * s.ratio + "px";
    card.el.style.left = -(160 * s.ratio) / 2 + "px";
    card.el.style.setProperty("--world", w.color);
    card.el.style.setProperty("--on", w.on);
    card.img.src = s.posterUrl;
    card.chip.querySelector("span").textContent = `No. ${String(si + 1).padStart(2, "0")}`;
    card.label.querySelector(".w").textContent = w.label;
    card.label.querySelector(".t").textContent = s.title;
    card.vid.pause();
    card.vid.removeAttribute("src");
    card.vid.load();
    card.vid.classList.remove("is-on");
  }

  // preload posters
  const posterPromises = SITES.map(
    (s) =>
      new Promise((res) => {
        const im = new Image();
        im.onload = im.onerror = () => {
          postersLoaded += 1;
          setOdo(Math.round((postersLoaded / N) * 100));
          res();
        };
        im.src = s.posterUrl;
      }),
  );

  // ---- odometer ----
  const odoCols = qa("[data-odo]");
  function setOdo(n) {
    const str = String(clamp(n, 0, 100)).padStart(3, "0");
    odoCols.forEach((col, i) => {
      const d = +str[i];
      col.style.transform = `translateY(${-d}em)`;
      col.parentElement.style.visibility = i === 0 && d === 0 ? "hidden" : "";
      if (i === 1 && str[0] === "0" && d === 0) col.parentElement.style.visibility = "hidden";
      else if (i > 0) col.parentElement.style.visibility = "";
    });
  }
  setOdo(0);

  // type caption
  const cap = q("[data-loader-cap]");
  const CAP = "LOADING SITES";
  let capI = 0;
  let capTimer = 0;
  setTimeout(() => {
    if (disposed) return;
    capTimer = setInterval(() => {
      if (disposed) return clearInterval(capTimer);
      capI += 1;
      if (cap) cap.textContent = CAP.slice(0, capI);
      if (capI >= CAP.length) clearInterval(capTimer);
    }, 45);
  }, 350);

  // ---- geometry ----
  function wallScale() {
    if (phone()) return 0.8;
    if (innerHeight <= 760) return 0.9;
    return 1.1;
  }
  function geom(e) {
    const tilt = -22 * (1 - e);
    const radius = 460 + 1340 * e;
    const anchor = -radius * Math.sin((tilt * Math.PI) / 180) + 460 * Math.sin((-22 * Math.PI) / 180) * (1 - e);
    const perspective = 1000 + (760 - 1000) * e;
    const roll = -20 * (1 - e);
    const cardScale = 0.52 + (2.3 - 0.52) * e * e;
    return { tilt, radius, anchor, perspective, roll, cardScale };
  }

  function placeCards(nowRot, form, exp) {
    const g = geom(exp);
    const ws = wallScale();
    const fit =
      Math.min(1.05, (innerWidth - 32) / 1240, (0.66 * innerHeight) / 800) / ws;
    const A = ws * (fit + (1 - fit) * exp);
    const fr = frame.getBoundingClientRect();
    const introOff = 0.44 * innerHeight - (fr.top + fr.height / 2);
    root.style.setProperty("--intro-offset", `${introOff * (1 - exp) + g.anchor * A}px`);
    root.style.setProperty("--intro-tilt", `${g.tilt}deg`);
    root.style.setProperty("--intro-roll", `${g.roll}deg`);
    root.style.setProperty("--intro-x", `${160 * Math.sin((g.roll * Math.PI) / 180) * A}px`);
    root.style.setProperty("--intro-sz", String(A));
    root.style.setProperty("--intro-scale", String(fit + (1 - fit) * exp));
    lens.style.setProperty("--lens-p", `${g.perspective * A}px`);
    lens.style.setProperty(
      "--lens-o",
      `50% calc(50% + ${introOff * (1 - exp)}px)`,
    );

    const useRot = entered ? nowRot : 0;
    for (let e = 0; e < N; e++) {
      const card = cards[e];
      const si = siteForSlot(e, useRot);
      assignCard(card, si);
      const angle =
        ((((360 * e) / N + useRot + 180) % 360) + 360) % 360 - 180;
      const n = (angle + 180) % 360;
      const a = n / 360;
      const i = clamp((form - 0.7 * a) / 0.3, 0, 1);
      const s = 1 - (1 - i) ** 3;
      const yaw = -180 + n * s;
      const c = g.radius - (1 - s) * a * 24;
      const x = -Math.sin((yaw * Math.PI) / 180) * c;
      const z = -Math.cos((yaw * Math.PI) / 180) * c;
      const appear = Math.min(1, 2.5 * i);
      const behind = z * Math.cos((g.tilt * Math.PI) / 180) >= g.perspective - 70;
      const cull = entered && Math.abs(angle) > 96;
      card.el.style.opacity = behind || cull ? "0" : String(appear);
      card.el.style.pointerEvents = behind || cull || appear < 0.5 ? "none" : "auto";
      const flip = z > (g.radius * g.radius) / g.perspective ? 180 : 0;
      const hx = card.tx.value();
      const hy = card.ty.value();
      const hz = card.tz.value();
      card.tilt.style.transform = `rotateX(${hx}deg) rotateY(${hy}deg) translateZ(${hz}px)`;
      card.el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${yaw + flip}deg) scale(${g.cardScale})`;

      // video play rules
      const play =
        !reduced &&
        form > 0.5 &&
        Math.abs(angle) <= 78 &&
        document.visibilityState === "visible" &&
        appear > 0.5 &&
        !behind;
      if (play) {
        if (!card.vid.src) {
          card.vid.src = SITES[si].videoUrl;
          card.vid.addEventListener(
            "playing",
            () => card.vid.classList.add("is-on"),
            { once: true },
          );
        }
        card.vid.play().catch(() => {});
      } else if (card.vid.src) {
        card.vid.pause();
      }
    }
  }

  // ---- open frame metrics ----
  function measureOpen() {
    // relative to the section (the loader covers the section, not the page)
    const r = frame.getBoundingClientRect();
    const s = root.getBoundingClientRect();
    frame.style.setProperty("--ft", Math.max(0, r.top - s.top) + "px");
    frame.style.setProperty("--fl", Math.max(0, r.left - s.left) + "px");
    frame.style.setProperty("--fr", Math.max(0, s.right - r.right) + "px");
    frame.style.setProperty("--fb", Math.max(0, s.bottom - r.bottom) + "px");
  }

  // ---- intro ----
  function finishIntro(skipAnim = false) {
    if (entered) return;
    entered = true;
    interactive = true;
    formation = 1;
    expansion = 1;
    loader.style.opacity = "0";
    loader.style.transition = "opacity .9s";
    setTimeout(() => loader.remove(), 1000);
    frame.classList.remove("is-open");
    root.dataset.entered = "";
    setTimeout(() => {
      interactive = true;
    }, skipAnim ? 0 : 1900);
    syncSea();
  }

  async function runIntro() {
    measureOpen();
    loader.classList.add("is-in");
    if (reduced) {
      await Promise.all(posterPromises);
      setOdo(100);
      finishIntro(true);
      return;
    }
    const t0 = performance.now();
    const formDur = 2600;
    const failsafe = setTimeout(() => setOdo(100), 9000);
    const tick = (now) => {
      if (disposed) return;
      formation = clamp((now - t0) / formDur, 0, 1);
      // intro spin toward ~78
      if (!dragging) {
        const boost = 0.5 + 0.5 * expansion;
        m += 0.3 * boost * clamp((78 - m) / 20, 0, 1) * hoverE;
        rot.set(m);
      }
      if (formation < 1 || postersLoaded < N) {
        requestAnimationFrame(tick);
      } else {
        clearTimeout(failsafe);
        reveal();
      }
    };
    requestAnimationFrame(tick);
    await Promise.all(posterPromises);
  }

  function reveal() {
    const t0 = performance.now();
    const dur = 1900;
    loader.style.transition = "opacity .9s";
    loader.style.opacity = "0";
    setTimeout(() => loader?.remove(), 1000);
    frame.classList.remove("is-open");
    root.dataset.entered = "";
    const expTick = (now) => {
      if (disposed) return;
      const t = clamp((now - t0) / dur, 0, 1);
      // cubic-bezier(.5,0,.15,1) approx
      const e = 1 - Math.pow(1 - t, 2.6);
      expansion = e;
      if (t < 1) requestAnimationFrame(expTick);
      else {
        expansion = 1;
        entered = true;
        interactive = true;
      }
    };
    requestAnimationFrame(expTick);
    setTimeout(() => {
      entered = true;
    }, 1050);
  }

  q("[data-skip]")?.addEventListener("click", () => {
    postersLoaded = N;
    setOdo(100);
    finishIntro(true);
  });
  addEventListener("keydown", (e) => {
    if ((e.key === "Escape" || e.key === "Tab") && !entered) {
      postersLoaded = N;
      setOdo(100);
      finishIntro(true);
    }
  });

  // ---- views ----
  function syncSea() {
    const play = (v, on) => {
      if (!v) return;
      if (on && !reduced) {
        v.play()
          .then(() => v.classList.add("is-on"))
          .catch(() => {});
      } else {
        v.pause();
      }
    };
    play(seaHome, entered);
  }

  // ---- ring interaction ----
  wall.addEventListener("pointerdown", (e) => {
    if (!interactive || e.button !== 0) return;
    if (e.target.closest(".card") && e.pointerType === "touch") return;
    dragging = true;
    dragMarked = false;
    dragStart = e.clientX;
    dragM0 = m;
    wall.classList.add("is-grabbing");
    try {
      wall.setPointerCapture(e.pointerId);
    } catch {}
  });
  wall.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart;
    if (Math.abs(dx) > 4) dragMarked = true;
    m = dragM0 + 0.2 * dx;
    rot.set(m);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    wall.classList.remove("is-grabbing");
    if (dragMarked) lastDragEnd = performance.now();
  };
  wall.addEventListener("pointerup", endDrag);
  wall.addEventListener("pointercancel", endDrag);
  wall.addEventListener("click", (e) => {
    if (performance.now() - lastDragEnd < 50) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  addEventListener(
    "wheel",
    (e) => {
      // Only spin the ring while the pointer is over it; everywhere else the page scrolls normally.
      if (!interactive) return;
      if (!(e.target instanceof Element) || !e.target.closest("[data-wall]")) return;
      if (e.ctrlKey || e.metaKey) return;
      if (e.target.closest("input,textarea,button")) return;
      e.preventDefault();
      let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) d *= 16;
      if (e.deltaMode === 2) d *= innerHeight;
      m += 0.5 * clamp(d, -480, 480);
      rot.set(m);
    },
    { passive: false },
  );

  // card hover tilt
  cards.forEach((card) => {
    card.el.addEventListener("pointermove", (e) => {
      if (!interactive) return;
      const r = card.el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.tx.set(-20 * y);
      card.ty.set(24 * x);
      card.tz.set(45);
    });
    card.el.addEventListener("pointerleave", () => {
      card.tx.set(0);
      card.ty.set(0);
      card.tz.set(0);
    });
  });

  // ---- parallax ----
  addEventListener("pointermove", (e) => {
    if (reduced || !matchMedia("(pointer:fine)").matches) return;
    px.set((e.clientX / innerWidth) * 2 - 1);
    py.set((e.clientY / innerHeight) * 2 - 1);
  });

  // ---- chrome hide ----
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
  // Sticky takeover: once Noa fills most of the viewport, keep Kolibrie chrome away.
  const io = new IntersectionObserver(
    (entries) => {
      const on = entries.some((en) => en.isIntersecting && en.intersectionRatio > 0.08);
      hideChrome(on);
    },
    { threshold: [0, 0.08, 0.2, 0.5, 0.8] },
  );
  io.observe(root);

  // ---- loop ----
  let last = performance.now();
  let probe = 0;
  function loop(now) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, 0.05);
    const k = clamp(((now - last) / 16.67), 0, 3);
    last = now;

    if (!dragging && interactive && !reduced) {
      probe = (probe + 1) % 3;
      if (probe === 0) {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        pointerOverCard = !!el?.closest?.(".card");
      }
      const targetE = pointerOverCard ? 0.2 : 1;
      hoverE += (targetE - hoverE) * Math.min(1, 0.08 * k);
      m += 0.3 * hoverE * k;
      rot.set(m);
    }
    if (reduced) rot.jump(m);
    else rot.step(dt);

    cards.forEach((c) => {
      c.tx.step(dt);
      c.ty.step(dt);
      c.tz.step(dt);
    });
    px.step(dt);
    py.step(dt);
    const pvx = px.value();
    const pvy = py.value();
    qa("[data-parallax]").forEach((el) => {
      const d = +el.dataset.parallax || 10;
      el.style.transform = `translate(${-pvx * d}px,${-pvy * d * 0.5}px)`;
    });

    placeCards(rot.value(), formation, expansion);
  }

  measureOpen();
  addEventListener("resize", measureOpen);
  raf = requestAnimationFrame(loop);
  void runIntro();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    if (capTimer) clearInterval(capTimer);
    io.disconnect();
    hideChrome(false);
    removeEventListener("resize", measureOpen);
  };
}
