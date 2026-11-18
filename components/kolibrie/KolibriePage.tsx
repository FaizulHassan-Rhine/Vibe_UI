"use client";

import { useEffect, useRef } from "react";
import styles from "./KolibriePage.module.css";
import { OstraSection } from "@/components/ostra";
import { VanteSection } from "@/components/vante";
import {
  HERO_CARD_CROPS,
  HERO_PLATE,
  HERO_VIDEO,
  TEAM_PHOTOS,
  WIPE_PATH,
  WORK_CARDS,
} from "./data";

const MARQUEE_ICONS = [
  <svg key="1" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M20 4v32M4 20h32M8 8l24 24M32 8L8 32" />
  </svg>,
  <svg key="2" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M8 10h8a8 8 0 0 1 0 20H8V10Zm16 0h8a8 8 0 0 1 0 20h-8V10Z" />
  </svg>,
  <svg key="3" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M4 12c6 6 10-6 16 0s10-6 16 0M4 20c6 6 10-6 16 0s10-6 16 0M4 28c6 6 10-6 16 0s10-6 16 0" />
  </svg>,
  <svg key="4" viewBox="0 0 40 40" fill="currentColor">
    <path d="M20 6l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Zm0 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" />
  </svg>,
  <svg key="5" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M6 28h28M6 22h28M6 16h28M8 16a12 12 0 0 1 24 0" />
  </svg>,
  <svg key="6" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M8 30a10 10 0 0 1 20 0M4 30a14 14 0 0 1 28 0" />
  </svg>,
  <svg key="7" viewBox="0 0 40 40" fill="currentColor">
    <path d="M20 2l3 12 12 3-12 3-3 12-3-12-12-3 12-3 3-12Z" />
  </svg>,
  <svg key="8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <circle cx="20" cy="20" r="12" />
    <path d="M20 8v24M8 20h24" />
  </svg>,
];

function Crop({ crop }: { crop: string }) {
  return <div className={styles.crop} data-crop={crop} />;
}

export default function KolibriePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { mountKolibrie } = await import("./mountKolibrie");
      if (disposed || !rootRef.current) return;
      cleanup = mountKolibrie(rootRef.current, styles);
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <>
    <div ref={rootRef} className={styles.root} data-kolibrie>
      <div className={styles.wipe} data-wipe>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden>
          <path data-wipe-path d={WIPE_PATH} />
        </svg>
      </div>

      <div className={styles.cursorLabel} data-cursor-label>
        <div className={styles.cursorCard}>
          <div className={styles.cursorTrack} data-cursor-track>
            <span>View case →</span>
            <span>View case →</span>
          </div>
        </div>
      </div>

      <nav className={styles.nav} data-nav>
        <a className={styles.logo} href="#top" data-lenis-link>
          Kolibrie
        </a>
        <div className={styles.navPill}>
          <a className={styles.navLink} href="#team" data-lenis-link data-draw-line>
            About
            <span className={`${styles.navUnderline} ${styles.drawLine}`} data-draw-box />
          </a>
          <a className={styles.navLink} href="#work" data-lenis-link data-draw-line>
            Work
            <span className={`${styles.navUnderline} ${styles.drawLine}`} data-draw-box />
          </a>
          <a className={styles.navLink} href="#work" data-lenis-link data-draw-line>
            Services
            <span className={`${styles.navUnderline} ${styles.drawLine}`} data-draw-box />
          </a>
        </div>
        <a className={styles.navContact} href="#team" data-lenis-link>
          <span className={styles.dot} aria-hidden />
          Contact
        </a>
      </nav>

      <main className={styles.main} data-main id="top">
        <section className={styles.hero} data-hero data-cursor-cards>
          <video
            className={styles.heroVideo}
            data-hero-video
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            poster={HERO_PLATE}
          />

          <div className={styles.cursorCardHero} data-hero-card>
            <div className={styles.cursorMedia} data-hero-card-media>
              {HERO_CARD_CROPS.map((crop, i) => (
                <div
                  key={crop}
                  className={styles.crop}
                  data-crop={crop}
                  data-on={i === 0 ? "1" : "0"}
                />
              ))}
            </div>
          </div>

          <div className={styles.heroContent}>
            <h1
              className={styles.heroHeadline}
              data-text-reveal="chars"
              data-font-weight-hover
              data-fw-rest="700"
              data-fw-near="200"
              data-fw-radius="400"
            >
              Stories that
              <br />
              get{" "}
              <span
                className={styles.alt}
                data-font-weight-hover
                data-fw-rest="300"
                data-fw-near="800"
                data-fw-radius="400"
              >
                shared
              </span>
            </h1>
            <a className={styles.reelLink} href="#work" data-lenis-link>
              <span className={styles.reelText}>
                See the reel
                <span
                  className={`${styles.reelUnderline} ${styles.drawLine}`}
                  data-draw-box
                  data-draw-always
                />
              </span>
              <span className={styles.reelArrow} aria-hidden>
                <span className={styles.reelArrowInner}>
                  <svg viewBox="0 0 14 13">
                    <path
                      fill="currentColor"
                      d="M12.94 5.7 9.95 8 6.9 10.37l.84 1.86V0h-2.55v12.23l.85-1.86L3 8 0 5.7V9.05l6.47 4.95 6.47-4.95z"
                    />
                  </svg>
                  <svg viewBox="0 0 14 13">
                    <path
                      fill="currentColor"
                      d="M12.94 5.7 9.95 8 6.9 10.37l.84 1.86V0h-2.55v12.23l.85-1.86L3 8 0 5.7V9.05l6.47 4.95 6.47-4.95z"
                    />
                  </svg>
                </span>
              </span>
            </a>
          </div>

          <div className={styles.marquee} data-marquee>
            <div className={styles.marqueeWrap} data-marquee-wrap>
              <div className={styles.marqueeCollection} data-marquee-collection>
                {MARQUEE_ICONS.map((icon, i) => (
                  <div className={styles.marqueeItem} key={i}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.work} id="work" data-featured-stack data-work>
          <div className={styles.workPin} data-work-pin>
            <div className={styles.workCopy} data-scroll-reveal-group>
              <p className={styles.eyebrowS} data-scroll-reveal="lines">
                Made to be watched twice. A handful of what left our edit desk lately.
              </p>
              <h2
                className={styles.sectionHeadline}
                data-scroll-reveal="chars"
                data-font-weight-hover
                data-fw-rest="700"
                data-fw-near="200"
                data-fw-radius="400"
              >
                Latest{" "}
                <span
                  className={styles.alt}
                  data-font-weight-hover
                  data-fw-rest="300"
                  data-fw-near="800"
                  data-fw-radius="400"
                >
                  drops
                </span>
              </h2>
            </div>

            <div className={styles.stage} data-stage>
              <div className={styles.stack} data-stack>
                {WORK_CARDS.map((card) => (
                  <div className={styles.slide} data-slide key={card.title}>
                    <a
                      className={styles.card}
                      href="#work"
                      style={{ background: card.color }}
                      data-cursor-marquee-text="View case →"
                    >
                      <Crop crop={card.crop} />
                      <div className={styles.cardOverlay} />
                      <div className={styles.cardTitle}>{card.title}</div>
                    </a>
                  </div>
                ))}
              </div>

              <div className={styles.badge} data-badge aria-hidden>
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="98" fill="#ef4a23" />
                  <defs>
                    <path id="kol-badge-circle" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" />
                  </defs>
                  <text
                    fill="#faf3e4"
                    fontFamily="Archivo, sans-serif"
                    fontSize="24"
                    fontWeight="800"
                    letterSpacing="1"
                  >
                    <textPath href="#kol-badge-circle" textLength="436" lengthAdjust="spacing">
                      SCROLL · SAVE · SHARE · REPEAT ·
                    </textPath>
                  </text>
                  <g fill="none" stroke="#faf3e4" strokeWidth="5" strokeLinecap="round">
                    <circle cx="100" cy="100" r="17" />
                    <path d="M100 70v-12M100 142v-12M70 100h-12M142 100h-12M78 78l-8-8M130 130l-8-8M130 78l8-8M78 130l-8 8" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.team} id="team" data-page-theme="dark" data-team>
          <div className={styles.teamSticky}>
            <div className={styles.teamTitle} data-scroll-reveal-group>
              <div className={styles.stamp} data-stamp data-momentum>
                <svg viewBox="0 0 208 116" aria-hidden>
                  <ellipse cx="104" cy="58" rx="104" ry="58" fill="#faf3e4" stroke="#ef4a23" strokeWidth="10" />
                  <text
                    x="104"
                    y="70"
                    textAnchor="middle"
                    fill="#ef4a23"
                    fontFamily="Yellowtail, cursive"
                    fontSize="54"
                    transform="rotate(-8 104 58)"
                  >
                    Kolibrie
                  </text>
                </svg>
              </div>
              <p className={styles.eyebrowM} data-scroll-reveal="lines">
                The people behind the frames
              </p>
              <h2
                className={styles.teamHeadline}
                data-scroll-reveal="chars"
                data-font-weight-hover
                data-fw-rest="700"
                data-fw-near="200"
                data-fw-radius="400"
              >
                <span
                  className={styles.alt}
                  data-font-weight-hover
                  data-fw-rest="300"
                  data-fw-near="800"
                  data-fw-radius="400"
                >
                  Meet
                </span>{" "}
                the{" "}
                <span
                  className={styles.alt}
                  data-font-weight-hover
                  data-fw-rest="300"
                  data-fw-near="800"
                  data-fw-radius="400"
                >
                  flock
                </span>
              </h2>
              <p className={styles.para} data-scroll-reveal="lines">
                Twelve makers, one group chat. We shoot, cut and animate before the coffee goes cold.
              </p>
            </div>
          </div>

          <div className={styles.photos} data-photos>
            {TEAM_PHOTOS.map((p, i) => (
              <div
                key={i}
                className={`${styles.photo} ${p.side === "left" ? styles.photoLeft : styles.photoRight}`}
                data-photo
                data-speed={p.speed}
                data-momentum
                style={
                  {
                    ["--off" as string]: p.offset,
                    top: p.top,
                    width: p.width,
                    transform: `rotate(${p.rotate}deg)`,
                  } as React.CSSProperties
                }
              >
                <Crop crop={p.crop} />
                {p.name ? (
                  <span
                    className={styles.photoName}
                    style={{ ["--nr" as string]: `${p.nameRot}deg` }}
                  >
                    {p.name}
                  </span>
                ) : null}
                {p.caption ? <span className={styles.photoCaption}>{p.caption}</span> : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>

    <VanteSection />
    <OstraSection />
    </>
  );
}
