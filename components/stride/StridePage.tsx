"use client";

import { useEffect, useRef } from "react";
import styles from "./StridePage.module.css";
import { FLAVORS, BITS, sheetCrop, INTRO_URL } from "./data";

const NAV_LINKS = [
  { href: "#flavors", label: "Flavors" },
  { href: "#inside", label: "Inside" },
  { href: "#shop", label: "Shop" },
  { href: "#range", label: "Range" },
];

const BIT_LAYOUT = [
  { x: 0.12, y: 0.2, s: 120, r: -18, bit: 0 },
  { x: 0.86, y: 0.18, s: 96, r: 22, bit: 2 },
  { x: 0.07, y: 0.74, s: 84, r: 12, bit: 3 },
  { x: 0.655, y: 0.15, s: 78, r: -10, bit: 4 },
  { x: 0.205, y: 0.885, s: 70, r: 30, bit: 1 },
];

const ICONS = ["leaf", "grains", "heart", "bolt"] as const;

function Icon({ name }: { name: (typeof ICONS)[number] }) {
  if (name === "leaf")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 19c8-2 12-8 14-14-6 2-12 6-14 14Z" />
        <path d="M5 19c3-5 7-8 14-10" />
      </svg>
    );
  if (name === "grains")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <ellipse cx="8" cy="9" rx="2.2" ry="3.2" />
        <ellipse cx="12" cy="7" rx="2.2" ry="3.2" />
        <ellipse cx="16" cy="9" rx="2.2" ry="3.2" />
        <ellipse cx="10" cy="15" rx="2.2" ry="3.2" />
        <ellipse cx="14" cy="15" rx="2.2" ry="3.2" />
      </svg>
    );
  if (name === "heart")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z" />
    </svg>
  );
}

function nameLines(name: string) {
  const parts = name.toUpperCase().split(" ");
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}

export default function StridePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { mountStride } = await import("./mountStride");
        if (cancelled || !rootRef.current) return;
        dispose = mountStride(rootRef.current, styles);
      } catch (err) {
        console.warn("[stride] mount failed", err);
      }
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} data-stride>
      <canvas id="gl" className={styles.gl} aria-hidden />

      <nav className={styles.nav} data-nav>
        <a href="#flavors" className={styles.brand} aria-label="Stride home">
          <span className={styles.mark} />
          <span className={styles.word}>STRIDE</span>
        </a>
        <div className={styles.pill} data-pill>
          <span className={styles.pillHl} data-pill-hl />
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} data-nav-link={l.href.slice(1)}>
              {l.label}
            </a>
          ))}
        </div>
        <div className={styles.navRight}>
          <button type="button" className={styles.offChip}>
            % OFF
          </button>
          <button type="button" className={styles.basket} data-basket aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V7a3 3 0 0 1 6 0v1" />
            </svg>
            <span className={styles.badge} data-badge>
              0
            </span>
          </button>
          <button type="button" className={styles.dibs}>
            First dibs
          </button>
        </div>
      </nav>

      <div className={styles.intro} id="intro" data-intro>
        <video
          data-intro-video
          src={INTRO_URL}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <button type="button" className={styles.skip} data-skip>
          Skip intro
        </button>
        <div className={styles.logoStamp} data-logo>
          <span className={styles.logoMark} />
          <span className={styles.logoWord}>STRIDE</span>
        </div>
      </div>

      <section className={styles.hero} id="flavors" data-hero>
        <div className={styles.reveal} data-reveal />
        <div className={styles.rings} data-rings />
        <div className={styles.bits} data-bits>
          {BIT_LAYOUT.map((b, i) => {
            const crop = sheetCrop(BITS[b.bit], 0);
            return (
              <div
                key={i}
                className={styles.bit}
                data-bit={i}
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  width: `calc(${b.s} * var(--u))`,
                  height: `calc(${b.s} * var(--u))`,
                  transform: `translate(-50%, -50%) rotate(${b.r}deg)`,
                  ...crop,
                }}
              />
            );
          })}
        </div>
        <div className={styles.arc} data-arc />
        <button
          type="button"
          className={styles.play}
          id="play"
          data-play
          aria-label="Next flavour"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#1c1a1f" strokeWidth="1.9" strokeLinecap="round">
            <path d="M5 12h12" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
        <h1 className={styles.title} id="title" data-title aria-live="polite" />
        <div className={styles.count} id="count" data-count>
          02
        </div>
        <button
          type="button"
          className={styles.auto}
          id="auto"
          data-auto
          aria-pressed="true"
        >
          <span className={styles.autoRing} data-auto-ring>
            <svg viewBox="0 0 10 10" data-auto-icon>
              <rect x="2" y="1.5" width="2" height="7" rx="0.6" />
              <rect x="6" y="1.5" width="2" height="7" rx="0.6" />
            </svg>
          </span>
          AUTOPLAY
        </button>
      </section>

      <section className={styles.inside} id="inside" data-inside>
        <div className={styles.pin} data-pin>
          <div className={styles.inDark} data-in-dark />
          <div className={styles.frame} data-in-back>
            <div className={styles.inNum} data-in-num>
              01
            </div>
            <div className={styles.inBar} id="inBar" data-in-bar />
          </div>
        </div>
      </section>

      <div className={styles.inFront} id="inFront" data-in-front>
        <div className={styles.frame} data-in-front-frame>
          <h2 className={styles.inHead} data-in-head>
            REAL FOOD,
            <br />
            FIRST
          </h2>
          <div className={styles.inIcons} data-in-icons>
            {ICONS.map((name, i) => (
              <button
                key={name}
                type="button"
                className={styles.inIcon}
                data-in-icon={i}
                aria-label={`Step ${i + 1}`}
              >
                <Icon name={name} />
              </button>
            ))}
          </div>
          <p className={styles.inCap} data-in-cap>
            Oats, nuts, fruit.
            <br />
            Nothing you can&apos;t say.
          </p>
        </div>
        <div className={styles.storm} data-storm />
      </div>

      <section className={styles.shop} id="shop" data-shop>
        <h2 className={styles.shopHead} data-shop-head>
          <span className={styles.line}>
            <span>GRAB</span>
          </span>
          <span className={styles.line}>
            <span>A BAG</span>
          </span>
        </h2>
        <p className={styles.shopCap} data-shop-cap>
          Five bold flavours. Same
          <br />
          real ingredients. Pick your
          <br />
          favourite (or try them all).
        </p>
        <div className={styles.cards} data-cards>
          {FLAVORS.map((f, i) => {
            const crop = sheetCrop(f.wrap, 4);
            const [a, b] = nameLines(f.name);
            return (
              <article
                key={f.id}
                className={styles.card}
                data-card={i}
                style={{ ["--c" as string]: f.color }}
              >
                <div className={styles.cardName}>
                  {a}
                  {b ? (
                    <>
                      <br />
                      {b}
                    </>
                  ) : null}
                </div>
                <div className={styles.pk} data-pk={i} style={crop} />
                <button
                  type="button"
                  className={styles.addBtn}
                  data-add={i}
                  aria-label={`Add a bag of ${f.name} to the cart`}
                >
                  +
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.range} id="range" data-range>
        <div className={styles.glow} data-glow />
        <h2 className={styles.rangeHead} data-range-head>
          <span className={styles.line}>
            <span>BUILD YOUR</span>
          </span>
          <span className={styles.line}>
            <span>
              <span className={styles.packN}>3</span> PACK &amp;
            </span>
          </span>
          <span className={styles.line}>
            <span>SAVE $1.49</span>
          </span>
        </h2>
        <div className={styles.slots} data-slots>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.slot} data-slot={i}>
              <button type="button" className={styles.slotX} data-slot-x={i} aria-label="Remove">
                ×
              </button>
              <div className={styles.slotBar} data-slot-bar={i} />
            </div>
          ))}
        </div>
        <div className={styles.thumbs} data-thumbs>
          {FLAVORS.map((f, i) => {
            const crop = sheetCrop(f.wrap, 4);
            return (
              <button key={f.id} type="button" className={styles.thumb} data-thumb={i}>
                <span className={styles.thumbSq} style={{ ["--c" as string]: f.color }}>
                  <span className={styles.thumbBar} style={crop} />
                </span>
                <span className={styles.thumbName}>{f.name}</span>
                <span className={styles.thumbRing} data-thumb-ring={i} />
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.buy} id="buy" data-buy disabled>
          <span data-buy-label>Pick 3 more</span>
          <span className={styles.buyPrice}>$7.48</span>
        </button>
      </section>
    </div>
  );
}
