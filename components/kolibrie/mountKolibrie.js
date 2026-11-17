import { SHEETS, UNDERLINE_PATHS, insetCell } from "./data";

const CDN = {
  gsap: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js",
  st: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js",
  split: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js",
  draw: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/DrawSVGPlugin.min.js",
  inertia: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/InertiaPlugin.min.js",
  lenis: "https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js",
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(src));
    document.body.appendChild(s);
  });
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function finePointer() {
  return (
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches
  );
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function fillCrops(root) {
  root.querySelectorAll("[data-crop]").forEach((box) => {
    if (box.querySelector(".cell")) return;
    const [sheetKey, cellStr] = box.getAttribute("data-crop").split(":");
    const sheet = SHEETS[sheetKey];
    if (!sheet) return;
    const cell = insetCell(sheet.cells[+cellStr]);
    const [cx, cy, cw, ch] = cell;
    const ar = cw / ch;
    const cellEl = document.createElement("div");
    cellEl.className = "cell";
    cellEl.style.setProperty("--ar", String(ar));
    const img = document.createElement("img");
    img.src = sheet.src;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.width = `${(sheet.w / cw) * 100}%`;
    img.style.height = `${(sheet.h / ch) * 100}%`;
    img.style.left = `${(-cx / cw) * 100}%`;
    img.style.top = `${(-cy / ch) * 100}%`;
    cellEl.appendChild(img);
    box.appendChild(cellEl);
  });
}

/** Manual split fallback when SplitText Club plugin is unavailable */
function manualSplit(el, mode) {
  const text = el.textContent;
  el.setAttribute("aria-label", text.trim());
  const words = [];
  const lines = [];
  const chars = [];

  // Preserve existing child structure roughly by splitting text nodes
  const html = el.innerHTML;
  // Simple approach: wrap by words then chars for chars mode
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const parent = node.parentNode;
    if (!parent || !node.textContent) return;
    const frag = document.createDocumentFragment();
    const parts = node.textContent.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement("span");
      word.className = "word";
      if (mode === "chars") {
        [...part].forEach((ch) => {
          const c = document.createElement("span");
          c.className = "char";
          c.textContent = ch;
          word.appendChild(c);
          chars.push(c);
        });
      } else {
        word.textContent = part;
      }
      words.push(word);
      frag.appendChild(word);
    });
    parent.replaceChild(frag, node);
  });

  // line mask wrappers — treat each top-level block/br-separated as a line
  const lineEls = [];
  const kids = [...el.childNodes];
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const line = document.createElement("div");
    line.className = "line";
    const mask = document.createElement("div");
    mask.style.overflow = "hidden";
    mask.appendChild(line);
    buf.forEach((n) => line.appendChild(n));
    el.appendChild(mask);
    lineEls.push(line);
    lines.push(line);
    buf = [];
  };
  // Rebuild: if we already mutated, wrap existing content in one line if no br
  if (!el.querySelector(".line")) {
    const content = [...el.childNodes];
    el.innerHTML = "";
    let current = [];
    content.forEach((n) => {
      if (n.nodeName === "BR") {
        const line = document.createElement("div");
        line.className = "line";
        const mask = document.createElement("div");
        mask.style.overflow = "hidden";
        current.forEach((c) => line.appendChild(c));
        mask.appendChild(line);
        el.appendChild(mask);
        lines.push(line);
        current = [];
      } else {
        current.push(n);
      }
    });
    if (current.length) {
      const line = document.createElement("div");
      line.className = "line";
      const mask = document.createElement("div");
      mask.style.overflow = "hidden";
      current.forEach((c) => line.appendChild(c));
      mask.appendChild(line);
      el.appendChild(mask);
      lines.push(line);
    }
  }

  el._split = { chars: [...el.querySelectorAll(".char")], words, lines: [...el.querySelectorAll(".line")] };
  return el._split;
}

function splitElement(el, mode, gsap) {
  if (el._split) return el._split;
  const SplitText = window.SplitText;
  if (SplitText) {
    try {
      const type = mode === "chars" ? "chars,words,lines" : "lines,words";
      const split = new SplitText(el, {
        type,
        linesClass: "line",
        charsClass: "char",
        wordsClass: "word",
        mask: "lines",
        autoSplit: false,
      });
      el._split = split;
      return split;
    } catch {
      /* fall through */
    }
  }
  return manualSplit(el, mode);
}

export function mountKolibrie(root, styles) {
  const cleanups = [];
  let disposed = false;
  let lenis = null;
  let gsap = null;
  let ScrollTrigger = null;
  let ready = false;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  fillCrops(root);

  // Paint over the global night body while Kolibrie is mounted.
  const prevBodyBg = document.body.style.background;
  document.body.style.background = "#faf3e4";
  cleanups.push(() => {
    document.body.style.background = prevBodyBg;
  });

  function revealAll() {
    ready = true;
    document.documentElement.setAttribute("data-page-ready", "");
    root.classList.add(styles.isReady || "isReady");
    if (reducedMotion()) {
      document.documentElement.setAttribute("data-reduced", "");
      root.classList.add(styles.reduced || "reduced");
    }
    const main = q("[data-main]");
    if (main) {
      main.style.opacity = "1";
      main.style.visibility = "visible";
    }
    qa("[data-text-reveal], [data-scroll-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.visibility = "visible";
      el.style.transform = "";
    });
    const wipe = q("[data-wipe]");
    if (wipe) wipe.setAttribute("data-transition-ready", "");
  }

  // Failsafe: never leave a black / empty screen.
  const failsafe = setTimeout(() => {
    if (!ready) revealAll();
  }, 2500);
  cleanups.push(() => clearTimeout(failsafe));

  // Fluid rem scale on html while this page is mounted
  const htmlEl = document.documentElement;
  const prevHtmlFs = htmlEl.style.fontSize;
  const setFs = () => {
    const w = window.innerWidth;
    // Zoomed-out scale; on short windows also respect height so nothing crops.
    htmlEl.style.fontSize =
      w <= 600
        ? "calc(100vw / 24.375)"
        : w <= 991
          ? "calc(100vw / 60)"
          : "min(calc(100vw / 108), calc(100vh / 56))";
  };
  setFs();
  window.addEventListener("resize", setFs);
  cleanups.push(() => {
    window.removeEventListener("resize", setFs);
    htmlEl.style.fontSize = prevHtmlFs;
  });

  import("./data").then(({ HERO_VIDEO }) => {
    const video = q("[data-hero-video]");
    if (!video) return;
    const apply = () => {
      if (reducedMotion()) {
        video.removeAttribute("src");
        video.load();
      } else {
        video.src = HERO_VIDEO;
        video.play().catch(() => {});
      }
    };
    apply();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => apply();
    mq.addEventListener?.("change", onMq);
    cleanups.push(() => mq.removeEventListener?.("change", onMq));
  });

  async function boot() {
    try {
      await loadScript(CDN.gsap);
      await loadScript(CDN.st);
      await Promise.allSettled([
        loadScript(CDN.split),
        loadScript(CDN.draw),
        loadScript(CDN.inertia),
        loadScript(CDN.lenis),
      ]);
    } catch (err) {
      console.warn("[kolibrie] GSAP load failed", err);
      revealAll();
      return;
    }

    gsap = window.gsap;
    ScrollTrigger = window.ScrollTrigger;
    if (!gsap) {
      revealAll();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);
    if (window.DrawSVGPlugin) gsap.registerPlugin(window.DrawSVGPlugin);
    if (window.InertiaPlugin) gsap.registerPlugin(window.InertiaPlugin);

    const reduced = reducedMotion();
    if (reduced) {
      root.classList.add(styles.reduced || "reduced");
      document.documentElement.setAttribute("data-reduced", "");
    }

    // Lenis + ScrollTrigger (needed so the Latest drops pin peels in place)
    if (!reduced && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.165, wheelMultiplier: 1.25 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
      // After layout settles, refresh pin distances
      requestAnimationFrame(() => ScrollTrigger.refresh());
      cleanups.push(() => {
        lenis.destroy();
        lenis = null;
      });
    }

    // In-page links
    qa("[data-lenis-link]").forEach((a) => {
      const onClick = (e) => {
        const href = a.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        e.preventDefault();
        const target = href === "#top" ? 0 : document.querySelector(href);
        if (lenis && target !== null && target !== 0) {
          lenis.scrollTo(target, { duration: 1.4 });
        } else if (lenis && target === 0) {
          lenis.scrollTo(0, { duration: 1.4 });
        } else if (typeof target === "number") {
          window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        } else if (target) {
          target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        }
      };
      a.addEventListener("click", onClick);
      cleanups.push(() => a.removeEventListener("click", onClick));
    });

    let pageInited = false;
    function initPage() {
      if (pageInited) return;
      pageInited = true;
      const safe = (fn) => {
        try {
          fn();
        } catch (err) {
          console.warn(`[kolibrie] ${fn.name} failed`, err);
        }
      };
      // Layout-critical pieces first so a decorative failure can't break them.
      safe(setupStack);
      safe(setupTheme);
      safe(setupHeroCard);
      safe(setupDrawLines);
      safe(setupScrollReveals);
      safe(setupFontWeightHover);
      safe(setupMarquee);
      safe(setupCursorLabel);
      safe(setupTeamParallax);
      safe(setupMomentum);
      ScrollTrigger.refresh();
    }

    function revealText(el, mode, delay = 0) {
      el.style.visibility = "visible";
      const split = splitElement(el, mode, gsap);
      const targets = mode === "chars" ? split.chars : split.lines;
      if (!targets?.length) return gsap.timeline();
      gsap.set(targets, { yPercent: 135 });
      return gsap.to(targets, {
        yPercent: 0,
        duration: 1,
        ease: "expo.out",
        stagger: mode === "chars" ? 0.0175 : 0.07,
        delay,
        onComplete: () => el.dispatchEvent(new CustomEvent("reveal:done")),
      });
    }

    // Load sequence
    const fontsReady = Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 1500)),
    ]);

    await fontsReady;
    if (disposed) return;

    const main = q("[data-main]");
    const wipe = q("[data-wipe]");
    const path = q("[data-wipe-path]");

    if (reduced) {
      revealAll();
      initPage();
      return;
    }

    // Keep page cream visible under the wipe; only hide main briefly.
    gsap.set(main, { autoAlpha: 0 });
    if (path) {
      try {
        if (window.DrawSVGPlugin) {
          gsap.set(path, { drawSVG: "0% 100%", strokeWidth: "30%" });
        } else {
          const len = path.getTotalLength();
          path.style.strokeDasharray = String(len);
          path.style.strokeDashoffset = "0";
          path.style.strokeWidth = "30%";
        }
      } catch {
        /* ignore wipe setup errors */
      }
    }

    const tl = gsap.timeline({
      onComplete: () => {
        if (!ready) revealAll();
      },
    });
    tl.addLabel("reveal", 0.4);
    tl.call(
      () => {
        try {
          revealAll();
          qa("[data-text-reveal]").forEach((el) => {
            const mode = el.getAttribute("data-text-reveal") || "chars";
            const group = el.closest("[data-text-reveal-group]");
            let extra = 0;
            if (group) {
              const items = [...group.querySelectorAll("[data-text-reveal]")];
              extra = Math.max(0, items.indexOf(el)) * 0.12;
            }
            // Reset opacity so the char tween can take over from hidden
            el.style.opacity = "";
            revealText(el, mode, 0.15 + extra);
          });
        } catch (err) {
          console.warn("[kolibrie] reveal failed", err);
        }
        try {
          initPage();
        } catch (err) {
          console.warn("[kolibrie] init failed", err);
        }
      },
      null,
      "reveal",
    );

    if (path) {
      if (window.DrawSVGPlugin) {
        tl.to(
          path,
          {
            drawSVG: "100% 100%",
            strokeWidth: "5%",
            duration: 1.25,
            ease: "power1.inOut",
            onComplete: () => wipe?.setAttribute("data-transition-ready", ""),
          },
          "reveal",
        );
      } else {
        try {
          const len = path.getTotalLength();
          tl.to(
            path,
            {
              strokeDashoffset: -len,
              strokeWidth: "5%",
              duration: 1.25,
              ease: "power1.inOut",
              onComplete: () => wipe?.setAttribute("data-transition-ready", ""),
            },
            "reveal",
          );
        } catch {
          wipe?.setAttribute("data-transition-ready", "");
        }
      }
    } else {
      wipe?.setAttribute("data-transition-ready", "");
    }

    tl.call(
      () => {
        const always = q("[data-draw-always]");
        if (always) drawOnce(always, 0.6);
      },
      null,
      "reveal+=1.3",
    );

    function setupDrawLines() {
      let idx = Math.floor(Math.random() * UNDERLINE_PATHS.length);
      qa("[data-draw-line]").forEach((host) => {
        const box = host.matches("[data-draw-box]")
          ? host
          : host.querySelector("[data-draw-box]");
        if (!box || box.hasAttribute("data-draw-always")) return;

        let busy = false;
        const enter = () => {
          if (busy) return;
          busy = true;
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", "0 0 310 40");
          svg.setAttribute("preserveAspectRatio", "none");
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", UNDERLINE_PATHS[idx % UNDERLINE_PATHS.length]);
          idx++;
          svg.appendChild(p);
          box.innerHTML = "";
          box.appendChild(svg);
          if (window.DrawSVGPlugin) {
            gsap.set(p, { drawSVG: "0%" });
            gsap.to(p, {
              drawSVG: "100%",
              duration: 0.5,
              ease: "power2.inOut",
              onComplete: () => {
                busy = false;
              },
            });
          } else {
            const len = p.getTotalLength();
            p.style.strokeDasharray = String(len);
            p.style.strokeDashoffset = String(len);
            gsap.to(p, {
              strokeDashoffset: 0,
              duration: 0.5,
              ease: "power2.inOut",
              onComplete: () => {
                busy = false;
              },
            });
          }
          box._path = p;
        };
        const leave = () => {
          const p = box._path;
          if (!p) return;
          const done = () => {
            box.innerHTML = "";
            box._path = null;
          };
          if (window.DrawSVGPlugin) {
            gsap.to(p, {
              drawSVG: "100% 100%",
              duration: 0.5,
              ease: "power2.inOut",
              onComplete: done,
            });
          } else {
            const len = p.getTotalLength();
            gsap.to(p, {
              strokeDashoffset: -len,
              duration: 0.5,
              ease: "power2.inOut",
              onComplete: done,
            });
          }
        };
        host.addEventListener("mouseenter", enter);
        host.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          host.removeEventListener("mouseenter", enter);
          host.removeEventListener("mouseleave", leave);
        });
      });
    }

    function drawOnce(box, dur = 0.6) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 310 40");
      svg.setAttribute("preserveAspectRatio", "none");
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", UNDERLINE_PATHS[0]);
      svg.appendChild(p);
      box.innerHTML = "";
      box.appendChild(svg);
      if (window.DrawSVGPlugin) {
        gsap.set(p, { drawSVG: "0%" });
        gsap.to(p, { drawSVG: "100%", duration: dur, ease: "power2.inOut" });
      } else {
        const len = p.getTotalLength();
        p.style.strokeDasharray = String(len);
        p.style.strokeDashoffset = String(len);
        gsap.to(p, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" });
      }
    }

    function setupScrollReveals() {
      if (reduced) {
        qa("[data-scroll-reveal]").forEach((el) => {
          el.style.visibility = "visible";
        });
        return;
      }
      qa("[data-scroll-reveal-group]").forEach((group) => {
        const items = [...group.querySelectorAll("[data-scroll-reveal]")];
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: group,
            start: "top 85%",
            once: true,
          },
        });
        items.forEach((el, i) => {
          const mode = el.getAttribute("data-scroll-reveal") || "lines";
          el.style.visibility = "visible";
          if (mode === "element") {
            gsap.set(el, { y: 24, autoAlpha: 0 });
            tl.to(el, { y: 0, autoAlpha: 1, duration: 0.8, ease: "expo.out" }, i * 0.12);
          } else {
            const split = splitElement(el, mode, gsap);
            const targets = mode === "chars" ? split.chars : split.lines;
            gsap.set(targets, { yPercent: 135 });
            tl.to(
              targets,
              {
                yPercent: 0,
                duration: 1,
                ease: "expo.out",
                stagger: mode === "chars" ? 0.0175 : 0.07,
              },
              i * 0.12,
            );
          }
        });
      });
    }

    function setupFontWeightHover() {
      if (reduced || !finePointer()) return;
      const chars = [];

      const collect = (el) => {
        const rest = +(el.getAttribute("data-fw-rest") || 700);
        const near = +(el.getAttribute("data-fw-near") || 200);
        const radius = +(el.getAttribute("data-fw-radius") || 400);
        // Reuse chars already created by a parent split; re-splitting nested
        // spans injects block-level line wrappers and breaks the headline.
        const existing = [...el.querySelectorAll(".char")];
        const split = el._split
          ? el._split
          : existing.length
            ? { chars: existing }
            : splitElement(el, "chars", gsap);
        (split.chars || []).forEach((c) => {
          // Only attach to chars that are under this marked element as nearest ancestor
          const nearest = c.closest("[data-font-weight-hover]");
          if (nearest !== el) return;
          const prev = getComputedStyle(c).fontVariationSettings || "";
          const kept = prev
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && !/"wght"/.test(s) && !/'wght'/.test(s));
          c.style.fontVariationSettings = [...kept, `"wght" var(--wght)`].join(", ");
          c.style.setProperty("--wght", String(rest));
          const qt = gsap.quickTo(c, "--wght", { duration: 0.4, ease: "power2.out" });
          chars.push({ el: c, rest, near, radius, qt, cx: 0, cy: 0 });
        });
      };

      const bootChars = () => {
        qa("[data-font-weight-hover]").forEach(collect);
        measure();
      };

      const headings = qa("[data-font-weight-hover][data-text-reveal], [data-font-weight-hover][data-scroll-reveal]");
      let pending = headings.length;
      if (!pending) bootChars();
      headings.forEach((h) => {
        const done = () => {
          pending--;
          if (pending <= 0) bootChars();
        };
        h.addEventListener("reveal:done", done, { once: true });
        setTimeout(done, 2500);
      });

      const measure = () => {
        chars.forEach((c) => {
          const r = c.el.getBoundingClientRect();
          c.cx = r.left + r.width / 2 + window.scrollX;
          c.cy = r.top + r.height / 2 + window.scrollY;
        });
      };

      let ptr = { x: 0, y: 0 };
      let lastScrollY = window.scrollY;
      const onMove = (e) => {
        ptr.x = e.pageX;
        ptr.y = e.pageY;
      };
      const onScroll = () => {
        const dy = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        ptr.y += dy;
        measure();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", measure);
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", measure);
      });

      gsap.ticker.add(() => {
        chars.forEach((c) => {
          const d = Math.hypot(ptr.x - c.cx, ptr.y - c.cy);
          const f = d >= c.radius ? 0 : 1 - d / c.radius;
          const target = clamp(c.rest + (c.near - c.rest) * f, Math.min(c.rest, c.near), Math.max(c.rest, c.near));
          const cur = parseFloat(getComputedStyle(c.el).getPropertyValue("--wght")) || c.rest;
          if (Math.abs(cur - target) >= 1) c.qt(target);
        });
      });
    }

    function setupHeroCard() {
      const hero = q("[data-hero]");
      const card = q("[data-hero-card]");
      const media = q("[data-hero-card-media]");
      if (!hero || !card || !media) return;

      const crops = [...media.querySelectorAll("[data-crop]")];
      let photo = 0;
      let travel = 0;
      let lastX = 0;
      let lastY = 0;
      let placed = false;
      let idleTimer = 0;
      let hiddenOverLink = false;

      crops.forEach((c, i) => c.setAttribute("data-on", i === 0 ? "1" : "0"));

      // Phone: static tilted card
      if (window.innerWidth <= 600) {
        gsap.set(card, { opacity: 1, visibility: "visible" });
        return;
      }

      // Desktop / tablet with fine pointer: follow mouse
      if (window.innerWidth < 992 || !finePointer()) {
        gsap.set(card, { opacity: 0 });
        return;
      }

      gsap.set(card, { opacity: 0, x: 0, y: 0, rotation: 0 });
      const qx = gsap.quickTo(card, "x", { duration: 1, ease: "power4.out" });
      const qy = gsap.quickTo(card, "y", { duration: 1, ease: "power4.out" });
      const qr = gsap.quickTo(card, "rotation", { duration: 1, ease: "power4.out" });
      const qmx = gsap.quickTo(media, "xPercent", { duration: 0.6, ease: "power2.out" });
      const qmy = gsap.quickTo(media, "yPercent", { duration: 0.7, ease: "power2.out" });

      const cardPos = (e) => {
        const hr = hero.getBoundingClientRect();
        // Offset from hero centre (card is already translate -50% -50% at 50%/50%)
        return {
          x: e.clientX - (hr.left + hr.width / 2),
          y: e.clientY - (hr.top + hr.height / 2),
        };
      };

      const onMove = (e) => {
        const overUi = !!e.target.closest?.("a, button");
        if (overUi) {
          if (!hiddenOverLink) {
            hiddenOverLink = true;
            gsap.to(card, { opacity: 0, duration: 0.25, ease: "power2.out", overwrite: "auto" });
          }
          return;
        }
        hiddenOverLink = false;

        const { x, y } = cardPos(e);
        if (!placed) {
          gsap.set(card, { x, y });
          gsap.to(card, { opacity: 1, duration: 0.3, ease: "power2.out" });
          placed = true;
          lastX = e.clientX;
          lastY = e.clientY;
        }

        const dx = (e.clientX - lastX) / 2;
        const dy = (e.clientY - lastY) / 2;
        qx(x);
        qy(y);
        qr((e.clientX - lastX) / 4);
        qmx(-clamp(dx, -8, 8));
        qmy(-clamp(dy, -8, 8));

        travel += Math.abs(dx) + Math.abs(dy);
        if (travel > 300) {
          travel = 0;
          crops[photo]?.setAttribute("data-on", "0");
          photo = (photo + 1) % crops.length;
          crops[photo]?.setAttribute("data-on", "1");
        }
        lastX = e.clientX;
        lastY = e.clientY;

        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          qr(0);
          qmx(0);
          qmy(0);
        }, 66);

        gsap.to(card, { opacity: 1, duration: 0.2, overwrite: "auto" });
      };

      const onLeave = () => {
        placed = false;
        travel = 0;
        hiddenOverLink = false;
        gsap.to(card, { opacity: 0, duration: 0.3, ease: "power2.out" });
        qr(0);
        qmx(0);
        qmy(0);
      };

      hero.addEventListener("pointermove", onMove);
      hero.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        hero.removeEventListener("pointermove", onMove);
        hero.removeEventListener("pointerleave", onLeave);
        clearTimeout(idleTimer);
      });
    }

    function setupMarquee() {
      const rootM = q("[data-marquee]");
      const wrap = q("[data-marquee-wrap]");
      const col = q("[data-marquee-collection]");
      if (!rootM || !wrap || !col || reduced) return;

      const c1 = col.cloneNode(true);
      const c2 = col.cloneNode(true);
      wrap.append(c1, c2);
      const cols = [col, c1, c2];

      const f = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;
      const dur = 30 * (col.offsetWidth / window.innerWidth) * f;

      gsap.set(cols, { xPercent: -100 });
      const tween = gsap.to(cols, {
        xPercent: -200,
        duration: dur,
        ease: "none",
        repeat: -1,
        modifiers: {
          xPercent: gsap.utils.unitize((v) => {
            const n = parseFloat(v);
            return ((((n + 100) % 100) + 100) % 100) - 100;
          }),
        },
      });
      // Simpler seamless loop:
      tween.kill();
      gsap.set(cols, { xPercent: 0 });
      const loop = gsap.to(cols, {
        xPercent: -100,
        duration: Math.max(8, dur),
        ease: "none",
        repeat: -1,
      });
      loop.totalProgress(0.5);

      ScrollTrigger.create({
        trigger: rootM,
        onUpdate: (self) => {
          loop.timeScale(self.direction === 1 ? -1 : 1);
        },
      });
      gsap.fromTo(
        wrap,
        { x: "10vw" },
        {
          x: "-10vw",
          ease: "none",
          scrollTrigger: {
            trigger: rootM,
            start: "top bottom",
            end: "bottom top",
            scrub: 0,
          },
        },
      );
    }

    function setupStack() {
      const section = q("[data-featured-stack]");
      const pin = q("[data-work-pin]");
      const stack = q("[data-stack]");
      const badge = q("[data-badge]");
      const slides = qa("[data-slide]");
      if (!section || !pin || !stack || slides.length < 2) return;

      // Only the pinned 3D peel on desktop. Below 992px keep the vertical list.
      if (window.innerWidth < 992) {
        stack.classList.remove(styles.isDesktopStack || "isDesktopStack");
        section.style.minHeight = "";
        slides.forEach((s) => gsap.set(s, { clearProps: "all" }));
        return;
      }

      stack.classList.add(styles.isDesktopStack || "isDesktopStack");

      const count = slides.length;
      // Small depth + upward offset so each card behind peeks out as a coloured strip
      const depth = 50;
      const offsetY = 22;
      const offsetX = 0;
      const tilt = 0;
      // One viewport of pin + one viewport per peel so every card gets scroll time
      const runwayVh = 100 + (count - 1) * 100;
      section.style.minHeight = `${runwayVh}vh`;

      const placeSlide = (s, b) => {
        gsap.set(s, {
          xPercent: -50,
          yPercent: -50,
          x: b * offsetX,
          y: -b * offsetY,
          z: -b * depth,
          rotation: b * tilt,
          zIndex: count - b,
          opacity: 1,
          visibility: "visible",
          force3D: true,
        });
      };

      slides.forEach((s, b) => placeSlide(s, b));

      // Section min-height is the runway; pin the frame in place (no extra pinSpacing)
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          pin,
          pinSpacing: false,
          scrub: 0.45,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 2,
        },
      });

      for (let b = 0; b < count - 1; b++) {
        // Front card peels down out of the shared slot
        tl.to(
          slides[b],
          {
            y: () => window.innerHeight * 0.92,
            x: b * offsetX,
            rotation: b * tilt + 3,
            ease: "power2.in",
            duration: 1,
          },
          b,
        );
        tl.to(
          slides[b],
          { opacity: 0, duration: 0.35, ease: "power1.in" },
          b + 0.55,
        );
        // Cards behind step forward into the same place
        for (let j = b + 1; j < count; j++) {
          const C = j - b - 1;
          tl.to(
            slides[j],
            {
              z: -C * depth,
              y: -C * offsetY,
              x: C * offsetX,
              rotation: C * tilt,
              zIndex: count - C,
              duration: 1,
            },
            b,
          );
        }
      }
      // Hold the final card for a beat before the section releases
      const peelEnd = count - 1;
      tl.to({}, { duration: 0.8 }, peelEnd);
      if (badge) {
        gsap.set(badge, { transformOrigin: "50% 50%" });
        tl.to(badge, { rotation: 220, duration: peelEnd + 0.8, ease: "none" }, 0);
      }

      // Keep stack positions correct after fonts/images settle
      const refresh = () => ScrollTrigger.refresh();
      requestAnimationFrame(refresh);
      window.addEventListener("load", refresh);
      cleanups.push(() => window.removeEventListener("load", refresh));

      if (!reduced && finePointer()) {
        const qx = gsap.quickTo(stack, "rotationX", { duration: 0.6, ease: "power3" });
        const qy = gsap.quickTo(stack, "rotationY", { duration: 0.6, ease: "power3" });
        const onMove = (e) => {
          const r = pin.getBoundingClientRect();
          if (!r.height || !r.width) return;
          qx(-((e.clientY - r.top) / r.height - 0.5) * 6);
          qy(((e.clientX - r.left) / r.width - 0.5) * 10);
        };
        const onLeave = () => {
          qx(0);
          qy(0);
        };
        pin.addEventListener("pointermove", onMove);
        pin.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          pin.removeEventListener("pointermove", onMove);
          pin.removeEventListener("pointerleave", onLeave);
        });
      }
    }

    function setupCursorLabel() {
      if (!finePointer()) return;
      const label = q("[data-cursor-label]");
      const track = q("[data-cursor-track]");
      if (!label || !track) return;
      const spans = [...track.querySelectorAll("span")];
      const qx = gsap.quickTo(label, "x", { duration: 0.4, ease: "power3" });
      const qy = gsap.quickTo(label, "y", { duration: 0.4, ease: "power3" });
      let active = null;
      let placed = false;
      let pauseTimer = 0;

      const sync = (e) => {
        const x = e?.clientX ?? 0;
        const y = e?.clientY ?? 0;
        if (!placed && e) {
          gsap.set(label, { x, y });
          placed = true;
        }
        if (e) {
          qx(x);
          qy(y);
        }
        const el = document.elementFromPoint(x, y);
        const host = el?.closest?.("[data-cursor-marquee-text]");
        if (host && host !== active) {
          active = host;
          const text = host.getAttribute("data-cursor-marquee-text") || "View case →";
          spans.forEach((s) => {
            s.textContent = text;
          });
          const dur = Math.max(0.8, text.length / 5);
          spans.forEach((s) => {
            s.style.animationDuration = `${dur}s`;
          });
          label.setAttribute("data-cursor-marquee-status", "active");
        } else if (!host && active) {
          active = null;
          label.setAttribute("data-cursor-marquee-status", "not-active");
          clearTimeout(pauseTimer);
          pauseTimer = setTimeout(() => {
            spans.forEach((s) => {
              s.style.animationPlayState = "paused";
            });
          }, 400);
        }
      };
      window.addEventListener("pointermove", sync);
      window.addEventListener("scroll", () => sync({ clientX: 0, clientY: 0 }), { passive: true });
      // keep last pointer for scroll checks
      let last = { clientX: 0, clientY: 0 };
      window.addEventListener("pointermove", (e) => {
        last = e;
        sync(e);
      });
      window.addEventListener(
        "scroll",
        () => {
          sync(last);
        },
        { passive: true },
      );
      cleanups.push(() => clearTimeout(pauseTimer));
    }

    function setupTeamParallax() {
      const section = q("[data-team]");
      const photos = qa("[data-photo]");
      if (!section || !photos.length || reduced) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 992px)",
          tablet: "(min-width: 480px) and (max-width: 991px)",
          mobile: "(max-width: 479px)",
        },
        (ctx) => {
          const { desktop, tablet } = ctx.conditions;
          const k = desktop ? 1 : tablet ? 0.5 : 0.3;
          const distance = 320 * k;
          photos.forEach((p) => {
            const speed = +p.getAttribute("data-speed") || 1;
            gsap.fromTo(
              p,
              { y: distance * speed },
              {
                y: -distance * speed,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "clamp(top bottom)",
                  end: "clamp(bottom top)",
                  scrub: true,
                  invalidateOnRefresh: true,
                  refreshPriority: -1,
                },
              },
            );
          });
        },
      );
      cleanups.push(() => mm.revert());
    }

    function setupMomentum() {
      if (reduced || !finePointer() || !window.InertiaPlugin) {
        // lightweight fallback spring
        if (reduced || !finePointer()) return;
      }
      let vx = 0;
      let vy = 0;
      let lx = 0;
      let ly = 0;
      const onMove = (e) => {
        vx = e.clientX - lx;
        vy = e.clientY - ly;
        lx = e.clientX;
        ly = e.clientY;
      };
      window.addEventListener("pointermove", onMove);
      cleanups.push(() => window.removeEventListener("pointermove", onMove));

      qa("[data-momentum]").forEach((target) => {
        const enter = (e) => {
          const r = target.getBoundingClientRect();
          const F = e.clientX - (r.left + r.width / 2);
          const R = e.clientY - (r.top + r.height / 2);
          const hyp = Math.hypot(F, R) || 1;
          const torque = (F * vy - R * vx) / hyp;
          if (window.InertiaPlugin) {
            gsap.to(target, {
              inertia: {
                x: { velocity: clamp(vx * 30, -1080, 1080), end: 0 },
                y: { velocity: clamp(vy * 30, -1080, 1080), end: 0 },
                rotation: { velocity: clamp(torque * 20, -60, 60), end: 0 },
                resistance: 200,
              },
            });
          } else {
            gsap.fromTo(
              target,
              { x: clamp(vx * 8, -40, 40), y: clamp(vy * 8, -40, 40) },
              { x: 0, y: 0, duration: 0.9, ease: "power3.out" },
            );
          }
        };
        target.addEventListener("mouseenter", enter);
        cleanups.push(() => target.removeEventListener("mouseenter", enter));
      });
    }

    function setupTheme() {
      const night = "#141110";
      const cream = "#faf3e4";
      const darkClass = styles.themeDark || "themeDark";

      const applyTheme = (theme) => {
        const dark = theme === "dark";
        if (dark) {
          document.documentElement.setAttribute("data-theme", "dark");
          root.classList.add(darkClass);
          document.body.style.background = night;
          root.style.backgroundColor = night;
        } else {
          document.documentElement.removeAttribute("data-theme");
          root.classList.remove(darkClass);
          document.body.style.background = cream;
          root.style.backgroundColor = cream;
        }
      };

      qa("[data-page-theme]").forEach((el) => {
        const theme = el.getAttribute("data-page-theme");
        ScrollTrigger.create({
          trigger: el,
          start: "top 35%",
          // Stay dark to the very end of the page
          end: "bottom top",
          refreshPriority: -1,
          onEnter: () => applyTheme(theme),
          onEnterBack: () => applyTheme(theme),
          onLeave: () => applyTheme(null),
          onLeaveBack: () => applyTheme(null),
        });
      });
    }
  }

  boot().catch((err) => {
    console.error("[kolibrie]", err);
    revealAll();
  });

  return () => {
    disposed = true;
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    try {
      ScrollTrigger?.getAll?.().forEach((t) => t.kill());
    } catch {
      /* ignore */
    }
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-page-ready");
    document.documentElement.removeAttribute("data-reduced");
    root.classList.remove(styles.themeDark || "themeDark");
    root.style.backgroundColor = "";
  };
}
