import { CARDS, IMAGES, formatTokens } from "./data";

const DROPLET = `<svg viewBox="0 0 19 23" fill="none" aria-hidden="true"><path d="M9.5 1.2C9.5 1.2 1.2 9.4 1.2 14.2a8.3 8.3 0 0 0 16.6 0C17.8 9.4 9.5 1.2 9.5 1.2Z" fill="currentColor"/><path d="M7.2 9.8c1.6-1.8 3.8-2.6 5.6-2.2" stroke="var(--bg,#EEF0F2)" stroke-width="1.7" stroke-linecap="round"/></svg>`;

const CHEVRON = `<svg viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1.2 4 4l3-2.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const MOUNTAIN = `<svg viewBox="0 0 54 42" fill="none" aria-hidden="true"><path d="M3 38 18 10l9 14 8-12 16 26" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const PALETTE = [
  "#FF4A12",
  "#FF5A1F",
  "#FF6B2C",
  "#FF8A3D",
  "#FFB06A",
  "#FFD9B5",
  "#FFF3E6",
];

function hash(a, b, c) {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483647)) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function kNav(styles, items, active) {
  const menu = items
    .map((label) => {
      const on = label === active;
      return `<span class="${on ? styles.kPill : ""}">${label}</span>`;
    })
    .join("");
  return `<div class="${styles.kNav}">
    <div class="${styles.kLogo}">${MOUNTAIN}<span>Kessler</span></div>
    <div class="${styles.kMenu}">${menu}</div>
  </div>`;
}

function cardHtml(styles, card) {
  const nav = (items, active) => kNav(styles, items, active);
  switch (card.id) {
    case "home":
      return `<div class="${styles.card} ${styles.cardHome}" data-card="${card.id}" style="--img-dunes:url('${IMAGES.dunes}')">
        ${nav(["PRODUCTS", "IMPACT", "ABOUT"], null)}
        <div class="${styles.homeStats}">
          <div class="${styles.homeStat}"><div class="${styles.homeNum}">200x</div><div class="${styles.homeLabel}">stronger</div></div>
          <div class="${styles.homeStat}"><div class="${styles.homeNum}">87%</div><div class="${styles.homeLabel}">lower emissions</div></div>
        </div>
        <div class="${styles.homeTag}">Advanced materials for a stronger tomorrow.</div>
      </div>`;
    case "price":
      return `<div class="${styles.card} ${styles.cardPrice}" data-card="${card.id}">
        ${nav(["PRODUCTS", "PRICING", "CONTACT"], "PRICING")}
        <div class="${styles.priceAmount}"><sup>$</sup>2,400</div>
        <div class="${styles.priceSub}">PER MONTH · INDUSTRIAL</div>
        <div class="${styles.pricePlans}">
          <div class="${styles.priceRow}"><span>Pilot</span><span>$299</span></div>
          <div class="${styles.priceRow}"><span>Industrial</span><span>$2,400</span></div>
          <div class="${styles.priceRow}"><span>Foundry</span><span>Custom</span></div>
        </div>
        <div class="${styles.priceCta}">Start a pilot</div>
      </div>`;
    case "case":
      return `<div class="${styles.card} ${styles.cardCase}" data-card="${card.id}" style="--img-mineral:url('${IMAGES.mineral}')">
        <div class="${styles.caseBg}"></div><div class="${styles.caseVeil}"></div>
        ${nav(["PRODUCTS", "IMPACT", "ABOUT"], null)}
        <div class="${styles.caseKicker}">CASE STUDY · ATLAS RAIL</div>
        <div class="${styles.caseTitle}">How Atlas Rail cut track weight by a third in eighteen months</div>
        <div class="${styles.caseStats}">
          <div class="${styles.caseStat}"><div class="${styles.caseNum}">34%</div><div class="${styles.caseLabel}">lighter track</div></div>
          <div class="${styles.caseStat}"><div class="${styles.caseNum}">3.4x</div><div class="${styles.caseLabel}">service life</div></div>
          <div class="${styles.caseStat}"><div class="${styles.caseNum}">0</div><div class="${styles.caseLabel}">unplanned closures</div></div>
        </div>
      </div>`;
    case "vision":
      return `<div class="${styles.card} ${styles.cardVision}" data-card="${card.id}">
        ${nav(["PRODUCTS", "VISION", "ABOUT"], "VISION")}
        <div class="${styles.visionTiles}">
          <div class="${styles.visionTile}" style="background-image:url('${IMAGES.foundry}')"></div>
          <div class="${styles.visionTile}" style="background-image:url('${IMAGES.mesa}')"></div>
          <div class="${styles.visionQuote}">The Kessler vision: <em>materials that outlast the people who made them.</em></div>
        </div>
        <div class="${styles.visionFoot}">
          <span>How Kessler pours alloy<br/>at the edge of the desert</span>
          <span>Manifesto · 6 min</span>
        </div>
      </div>`;
    case "alloy":
      return `<div class="${styles.card} ${styles.cardAlloy}" data-card="${card.id}" style="--img-fire:url('${IMAGES.fire}')">
        <div class="${styles.alloyBg}"></div><div class="${styles.alloyVeil}"></div>
        ${nav(["PRODUCTS", "IMPACT", "ABOUT"], null)}
        <div class="${styles.alloyTitle}">The carbon‑negative<br/><em>alloy.</em></div>
        <div class="${styles.alloySpecs}">
          <div class="${styles.alloyRow}"><span>Product</span><span>K-Alloy 7</span></div>
          <div class="${styles.alloyRow}"><span>Tensile</span><span>1,940 MPa</span></div>
          <div class="${styles.alloyRow}"><span>Datasheet</span><span>PDF ↗</span></div>
        </div>
      </div>`;
    case "journal":
      return `<div class="${styles.card} ${styles.cardJournal}" data-card="${card.id}">
        ${nav(["PRODUCTS", "JOURNAL", "ABOUT"], "JOURNAL")}
        <div class="${styles.journalTitle}">Journal<em>field notes from the flats</em></div>
        <div class="${styles.journalPosts}">
          <div class="${styles.journalPost}">
            <div class="${styles.journalThumb}" style="background-image:url('${IMAGES.saltflat}')"></div>
            <div class="${styles.journalKicker}">FIELD NOTES</div>
            <div class="${styles.journalPostTitle}">Mining nothing but light on the salt flats</div>
          </div>
          <div class="${styles.journalPost}">
            <div class="${styles.journalThumb}" style="background-image:url('${IMAGES.mesa}')"></div>
            <div class="${styles.journalKicker}">PLANTS</div>
            <div class="${styles.journalPostTitle}">Atacama, year one</div>
          </div>
          <div class="${styles.journalPost}">
            <div class="${styles.journalThumb}" style="background-image:url('${IMAGES.dunes}')"></div>
            <div class="${styles.journalKicker}">PROCESS</div>
            <div class="${styles.journalPostTitle}">Why we melt sand at noon</div>
          </div>
        </div>
      </div>`;
    default:
      return "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function codeHtml(styles, card) {
  const meta = `<!-- distilled: ${formatTokens(card.distilled)} tokens -->
<!-- original: ${formatTokens(card.original)} tokens -->
<!-- ${card.url} -->`;
  // Escape so tags render as source code, not real DOM nodes.
  return `<div class="${styles.code}" data-code="${card.id}">
    <pre class="${styles.codeHtml}">${escapeHtml(card.html)}</pre>
    <pre class="${styles.codeMeta}">${escapeHtml(meta)}</pre>
  </div>`;
}

function buildDom(root, styles) {
  root.innerHTML = `
    <div class="${styles.stage}" data-stage>
      <div class="${styles.hero}">
        <div>
          <p class="${styles.eyebrow}">AI READABILITY</p>
          <h2 class="${styles.headline}">Built for people.<br/><em>Read by machines.</em></h2>
        </div>
        <div>
          <p class="${styles.para}">Distill detects AI agents at the edge and serves them a clean, token‑light version of every page, without changing a pixel of what people see.</p>
          <a class="${styles.cta}" href="#distill">Explore Distill</a>
        </div>
      </div>

      <div class="${styles.badge}" data-badge>
        <div class="${styles.badgeLabel}">Token reduction</div>
        <div class="${styles.badgePill}">
          <div class="${styles.badgeNum}" data-badge-num>−0</div>
          <div class="${styles.badgePct}" data-badge-pct>91% less</div>
        </div>
      </div>

      <div class="${styles.scan}" data-scan aria-hidden="true">
        <i class="${styles.scanCore}"></i>
        <b class="${styles.scanHalo}"></b>
      </div>

      <div class="${styles.belt}" data-belt>
        <div class="${styles.codes}" data-codes>
          ${CARDS.map((c) => codeHtml(styles, c)).join("")}
        </div>
        <div class="${styles.cards}" data-cards>
          ${CARDS.map((c) => cardHtml(styles, c)).join("")}
        </div>
        <canvas class="${styles.fx}" data-fx></canvas>
      </div>
    </div>
  `;
}

export function mountDistill(root, styles) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  buildDom(root, styles);

  const belt = root.querySelector("[data-belt]");
  const canvas = root.querySelector("[data-fx]");
  const ctx = canvas.getContext("2d", { alpha: true });
  const cardEls = [...root.querySelectorAll("[data-card]")];
  const codeEls = [...root.querySelectorAll("[data-code]")];
  const badgeNum = root.querySelector("[data-badge-num]");
  const badgePct = root.querySelector("[data-badge-pct]");

  let cw = 0;
  let ch = 0;
  let gap = 0;
  let span = 0;
  let period = 0;
  let Lx = 0;
  let dpr = 1;
  let beltW = 0;
  let beltH = 0;
  let off = 0;
  let vel = 0;
  let hover = 0;
  let hoverTarget = 0;
  let dragging = false;
  let lastPtrX = 0;
  let lastPtrT = 0;
  let shown = 0;
  let crossingId = -1;
  let sparks = [];
  let raf = 0;
  let lastT = performance.now();
  let disposed = false;

  const positions = new Array(CARDS.length).fill(0);
  const cuts = new Array(CARDS.length).fill(0);

  function measure() {
    const first = cardEls[0];
    if (!first) return;
    const r = first.getBoundingClientRect();
    cw = r.width || window.innerWidth * 0.46;
    ch = r.height || window.innerHeight * 0.52;
    const gapRaw = getComputedStyle(root).getPropertyValue("--gap").trim();
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${gapRaw}`;
    root.appendChild(probe);
    gap = probe.getBoundingClientRect().width || window.innerWidth * 0.0475;
    probe.remove();
    span = cw + gap;
    period = span * CARDS.length;
    Lx = window.innerWidth / 2;
    const br = belt.getBoundingClientRect();
    beltW = br.width;
    beltH = br.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(beltW * dpr));
    canvas.height = Math.max(1, Math.round(beltH * dpr));
    canvas.style.width = `${beltW}px`;
    canvas.style.height = `${beltH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!Number.isFinite(off) || off === 0) {
      off = window.innerWidth / 2 - 0.62 * cw;
      vel = reduced ? 0 : -0.075 * window.innerWidth;
    }
  }

  function autoSpeed() {
    return reduced ? 0 : -0.075 * window.innerWidth;
  }

  function applyTransforms() {
    const radius = getComputedStyle(cardEls[0]).borderRadius || "1.6vw";
    for (let i = 0; i < CARDS.length; i++) {
      const x = mod(off + i * span + span, period) - span;
      positions[i] = x;
      const cut = clamp(Lx - x, 0, cw);
      cuts[i] = cut;
      const card = cardEls[i];
      const code = codeEls[i];
      card.style.transform = `translate3d(${x}px,0,0)`;
      code.style.transform = `translate3d(${x}px,0,0)`;
      if (cut > 0) {
        card.style.clipPath = `inset(0 0 0 ${cut}px round 0 ${radius} ${radius} 0)`;
        card.style.webkitClipPath = card.style.clipPath;
        card.style.webkitMaskImage = `linear-gradient(90deg, transparent ${cut}px, #000 ${cut + 26}px)`;
        card.style.maskImage = card.style.webkitMaskImage;
        code.style.clipPath = `inset(0 ${cw - cut}px 0 0)`;
        code.style.webkitClipPath = code.style.clipPath;
        code.style.visibility = "visible";
      } else {
        card.style.clipPath = "";
        card.style.webkitClipPath = "";
        card.style.webkitMaskImage = "";
        card.style.maskImage = "";
        code.style.clipPath = "";
        code.style.webkitClipPath = "";
        code.style.visibility = "hidden";
      }
    }
  }

  function updateBadge(dt) {
    let idx = -1;
    let best = -1;
    for (let i = 0; i < CARDS.length; i++) {
      const cut = cuts[i];
      if (cut > 0 && cut < cw && cut > best) {
        best = cut;
        idx = i;
      }
    }
    if (idx < 0) return;
    const card = CARDS[idx];
    const progress = cuts[idx] / cw;
    const target = Math.round(card.saved * progress);
    if (crossingId !== idx) {
      crossingId = idx;
      shown = target;
      badgePct.textContent = `${card.pct}% less`;
    } else {
      shown += (target - shown) * Math.min(1, dt * 14);
    }
    const n = Math.round(shown);
    badgeNum.textContent = `−${formatTokens(n)}`;
  }

  function drawFx(t) {
    ctx.clearRect(0, 0, beltW, beltH);
    const cardTop = 70;
    const localLx = Lx; // belt is full width, left-aligned to viewport

    for (let i = 0; i < CARDS.length; i++) {
      const x = positions[i];
      const cut = cuts[i];
      if (cut <= 0) continue;
      if (x + cw <= localLx) continue;

      // Haze
      const hazeW = Math.min(150, x + cw - localLx);
      if (hazeW > 0) {
        const g = ctx.createLinearGradient(localLx, 0, localLx + 150, 0);
        g.addColorStop(0, "rgba(255,96,40,.42)");
        g.addColorStop(1, "rgba(255,96,40,0)");
        ctx.fillStyle = g;
        ctx.fillRect(localLx, cardTop, hazeW, ch);
      }

      // Dithered particles
      const R = 0.3 * cw;
      const cols = Math.ceil(cw / 3);
      const rows = Math.ceil(ch / 3);
      const maxCol = Math.min(cols, Math.ceil((cut + R) / 3) + 1);
      const minCol = Math.max(0, Math.floor(cut / 3) - 1);
      const twinkleSeed = Math.floor(t * 9) + 97;

      for (let gx = minCol; gx < maxCol; gx++) {
        const sx = x + gx * 3;
        const d = sx - localLx;
        if (d < 0 || d > R) continue;
        const p = Math.pow(1 - d / R, 1.7);

        for (let row = -5; row < rows + 5; row++) {
          const inside = row >= 0 && row < rows;
          const chance = inside ? p * 0.96 : p * 0.18;
          if (chance <= 0) continue;
          if (hash(gx, row, i) >= chance) continue;
          if (!reduced && hash(gx, row, twinkleSeed) < 0.18) continue;

          const h2 = hash(row, gx, i + 31);
          let colorIdx;
          if (d < 10) colorIdx = 4 + Math.floor(h2 * 3);
          else colorIdx = Math.floor(h2 * h2 * 7);
          colorIdx = clamp(colorIdx, 0, 6);

          const size = 1.1 + h2 * 1.7;
          const jx = reduced ? 0 : (hash(gx, row, i + 7) - 0.5) * 1.6;
          const jy = reduced ? 0 : (hash(row, gx, i + 13) - 0.5) * 1.6;
          const px = sx + jx;
          const py = cardTop + row * 3 + jy;
          ctx.fillStyle = PALETTE[colorIdx];
          ctx.fillRect(px, py, size, size);
        }
      }

      // Spawn sparks
      if (!reduced) {
        for (let s = 0; s < 3; s++) {
          if (Math.random() > 0.7) continue;
          sparks.push({
            x: localLx + Math.random() * 30,
            y: cardTop - 10 + Math.random() * (ch + 20),
            vx: -30 + Math.random() * 70 + vel * 0.6,
            vy: -25 + Math.random() * 50,
            size: 0.8 + Math.random() * 1.8,
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            life: 0.3 + Math.random() * 0.8,
            max: 0,
          });
          sparks[sparks.length - 1].max = sparks[sparks.length - 1].life;
        }
      }
    }

    // Draw / age sparks
    const next = [];
    for (const sp of sparks) {
      if (sp.life <= 0) continue;
      const alpha = Math.min(1, sp.life * 2.2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = sp.color;
      ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
      ctx.globalAlpha = 1;
      next.push(sp);
    }
    sparks = next;
    if (sparks.length > 400) sparks = sparks.slice(-300);
  }

  function tick(now) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
    lastT = now;

    hover += (hoverTarget - hover) * Math.min(1, 4 * dt);

    if (!dragging) {
      const target = autoSpeed() * (1 - 0.65 * hover);
      const k = 1 - Math.exp(-2.2 * dt);
      vel += (target - vel) * k;
      off += vel * dt;
    }

    // Age sparks with frame dt
    for (const sp of sparks) {
      sp.life -= dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
    }

    applyTransforms();
    updateBadge(dt);
    drawFx(now / 1000);

    raf = requestAnimationFrame(tick);
  }

  // Pointer / wheel
  const onEnter = () => {
    hoverTarget = 1;
  };
  const onLeave = () => {
    hoverTarget = 0;
  };
  const onDown = (e) => {
    dragging = true;
    belt.classList.add(styles.beltGrabbing);
    lastPtrX = e.clientX;
    lastPtrT = performance.now();
    try {
      belt.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onMove = (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastPtrX;
    const dtMs = Math.max(8, now - lastPtrT);
    off += dx;
    const inst = (dx / dtMs) * 1000;
    vel = inst * 0.8 + vel * 0.2;
    lastPtrX = e.clientX;
    lastPtrT = now;
    applyTransforms();
  };
  const onUp = () => {
    dragging = false;
    belt.classList.remove(styles.beltGrabbing);
  };
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    vel += -e.deltaX * 6;
  };

  belt.addEventListener("pointerenter", onEnter);
  belt.addEventListener("pointerleave", onLeave);
  belt.addEventListener("pointerdown", onDown);
  belt.addEventListener("pointermove", onMove);
  belt.addEventListener("pointerup", onUp);
  belt.addEventListener("pointercancel", onUp);
  belt.addEventListener("wheel", onWheel, { passive: false });

  const onResize = () => {
    measure();
    applyTransforms();
  };
  window.addEventListener("resize", onResize);

  // Preload images
  Object.values(IMAGES).forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  measure();
  applyTransforms();
  lastT = performance.now();
  raf = requestAnimationFrame(tick);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    belt.removeEventListener("pointerenter", onEnter);
    belt.removeEventListener("pointerleave", onLeave);
    belt.removeEventListener("pointerdown", onDown);
    belt.removeEventListener("pointermove", onMove);
    belt.removeEventListener("pointerup", onUp);
    belt.removeEventListener("pointercancel", onUp);
    belt.removeEventListener("wheel", onWheel);
    root.innerHTML = "";
  };
}
