"use client";

import { useEffect, useRef } from "react";
import styles from "./ReelmarkHero.module.css";

const TILES = 10;

function LeafMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2c4.5 2.2 8 6.6 8 12.2 0 3.4-1.8 5.8-4.2 7.1-.4-3.8-2.2-7.2-5-9.8 2.6 3.2 4 6.8 4.2 10.7C11.8 23 8 21.2 6.2 17.6 4.2 13.6 5.2 7.4 12 2Z"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.2 1.6v8.8L10.4 6 3.2 1.6Z" />
    </svg>
  );
}

export default function ReelmarkHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { mountReelmark } = await import("./mountReelmark");
      if (disposed || !rootRef.current) return;
      cleanup = mountReelmark(rootRef.current);
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={styles.section}
      id="reelmark"
      aria-label="Reelmark"
    >
      <div className={styles.frame} data-frame>
        <a className={styles.logo} href="#reelmark" data-logo data-reveal>
          <LeafMark className={styles.logoSvg} />
          Reelmark
        </a>

        <div className={styles.badge} data-badge data-reveal>
          Trusted by 120,000+ indie makers
        </div>

        <h2 className={styles.headline}>
          <span data-line data-reveal>
            Captivate Crowds
          </span>
          <span data-line data-reveal>
            with Snackable Reels
          </span>
        </h2>

        <p className={styles.subline} data-subline data-reveal>
          Grow your brand with short, snappy product clips by
          <br />
          our handpicked video makers. Our crew is ready to
          <br />
          lift your next launch higher.
        </p>

        <svg
          className={`${styles.slash} ${styles.draw}`}
          viewBox="0 0 54 54"
          data-draw
          data-note
          aria-hidden="true"
        >
          <path d="M18 8 L8 46" />
          <path d="M34 6 L22 48" />
        </svg>

        <div className={styles.noteSeen} data-note data-reveal>
          {"Be seen\nwith clips"}
        </div>
        <svg
          className={`${styles.arrowSeen} ${styles.draw}`}
          viewBox="0 0 180 220"
          data-draw
          aria-hidden="true"
        >
          <path d="M40 8 C 28 70, 18 120, 48 170 C 68 202, 110 208, 150 188" />
          <path d="M128 172 L152 190 L122 198" />
        </svg>

        <div className={styles.carousel} data-carousel data-reveal>
          {Array.from({ length: TILES }, (_, i) => (
            <button
              type="button"
              className={styles.card}
              data-card
              data-tile={i}
              key={i}
              aria-label={`Open reel ${i + 1}`}
            >
              <div className={styles.media}>
                <div
                  className={`${styles.sheet} ${styles.poster}`}
                  data-sheet
                  data-poster
                />
                <video
                  className={`${styles.sheet} ${styles.video}`}
                  data-sheet
                  muted
                  playsInline
                  loop
                  preload="metadata"
                />
              </div>
              <div className={styles.play}>
                <PlayIcon />
              </div>
            </button>
          ))}
        </div>

      </div>

      <div
        className={styles.lightbox}
        data-lightbox
        hidden
        role="dialog"
        aria-modal="true"
        aria-label="Reel preview"
      >
        <button
          type="button"
          className={styles.lightboxBackdrop}
          data-lightbox-close
          aria-label="Close reel"
        />
        <div className={styles.lightboxPanel}>
          <button
            type="button"
            className={styles.lightboxClose}
            data-lightbox-close
            aria-label="Close"
          >
            ×
          </button>
          <div className={styles.lightboxMedia} data-lightbox-media>
            <div
              className={`${styles.sheet} ${styles.poster}`}
              data-lightbox-poster
            />
            <video
              className={`${styles.sheet} ${styles.video}`}
              data-lightbox-video
              muted
              playsInline
              loop
              controls
            />
          </div>
        </div>
      </div>
    </section>
  );
}
