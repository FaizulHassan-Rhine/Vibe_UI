"use client";

import { useEffect, useRef } from "react";
import styles from "./VasariHero.module.css";

export default function VasariHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { mountVasari } = await import("./mountVasari");
      if (!active || !rootRef.current) return;
      cleanup = mountVasari(rootRef.current);
    })();

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={styles.section}
      id="vasari"
      aria-label="Leon Vasari Film Archive"
      data-vasari
    >
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.probe} data-probe aria-hidden="true" />

      <div className={`${styles.kanji} ${styles.kanjiLeft}`} aria-hidden="true">
        映画
      </div>
      <div className={`${styles.kanji} ${styles.kanjiRight}`} aria-hidden="true">
        の記憶
      </div>

      <div className={styles.floor} aria-hidden="true" />

      <div className={styles.shelf} data-shelf>
        <div className={styles.stage} data-stage />
      </div>

      <div className={styles.play} data-play aria-hidden="true" />

      <div className={styles.caption} data-caption>
        <div className={styles.mask} data-mask="title">
          <span className={`${styles.capTitle} ${styles.slide}`} data-line="title" />
        </div>
        <div className={styles.mask} data-mask="sub">
          <span className={`${styles.capSub} ${styles.slide}`} data-line="sub" />
        </div>
        <div className={styles.capRule} aria-hidden="true" />
        <div className={styles.mask} data-mask="meta">
          <span className={`${styles.capMeta} ${styles.slide}`} data-line="meta" />
        </div>
      </div>

      <button className={`${styles.arrow} ${styles.arrowPrev}`} type="button" data-prev data-btn aria-label="Previous film">
        <svg viewBox="0 0 24 12" aria-hidden="true">
          <path d="M6 1L1 6l5 5M1 6h23" />
        </svg>
      </button>
      <button className={`${styles.arrow} ${styles.arrowNext}`} type="button" data-next data-btn aria-label="Next film">
        <svg viewBox="0 0 24 12" aria-hidden="true">
          <path d="M18 1l5 5-5 5M23 6H0" />
        </svg>
      </button>

      <div className={styles.timeline} data-timeline>
        <div className={styles.tlLine} />
        <div className={styles.tlTicks} data-ticks />
        <div className={styles.tlDot} data-dot />
        <button className={styles.tlHit} type="button" data-tl-hit data-btn aria-label="Jump to year" />
      </div>

      <div className={styles.cursor} data-cursor aria-hidden="true">
        <div className={styles.curRing} />
        <div className={styles.curDot} />
        <div className={styles.curLabel}>
          OPEN
          <br />
          開く
        </div>
      </div>

      <div className={styles.detail} data-detail>
        <button className={`${styles.detailClose} ${styles.box} ${styles.lbl}`} type="button" data-detail-close data-btn>
          Close / 閉じる
        </button>
        <div className={`${styles.detailBrand} ${styles.lbl}`}>Leon Vasari —— Film Archive</div>
        <div className={styles.detailInner}>
          <div className={styles.detailCopy}>
            <div className={styles.detailMask}>
              <p className={`${styles.detailSub} ${styles.lbl}`} data-d-sub />
            </div>
            <div className={styles.detailMask}>
              <h2 className={styles.detailTitle} data-d-title />
            </div>
            <div className={styles.detailMask}>
              <p className={styles.detailMeta} data-d-meta />
            </div>
            <div className={styles.detailMask}>
              <p className={styles.detailSyn} data-d-syn />
            </div>
            <div className={styles.detailMask}>
              <p className={styles.detailCredit} data-d-credit>
                Written and directed by Leon Vasari. 監督作品
              </p>
            </div>
            <div className={styles.detailMask}>
              <button className={styles.detailWatch} type="button" data-btn data-d-watch>
                Watch the Film / 映画を見る
              </button>
            </div>
          </div>
          <svg
            className={styles.detailPoster}
            viewBox="0 0 474 900"
            data-poster
            aria-hidden="true"
          >
            <defs>
              <filter id="vasari-ink" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.011"
                  numOctaves="3"
                  seed="7"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="120"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
              <clipPath id="vasari-poster-clip">
                <rect width="474" height="900" />
              </clipPath>
              <mask id="vasari-blot-mask">
                <rect width="474" height="900" fill="#000" />
                <g data-blots>
                  <circle cx="150" cy="330" r="0" fill="#fff" data-delay="0" />
                  <circle cx="340" cy="600" r="0" fill="#fff" data-delay="120" />
                  <circle cx="250" cy="120" r="0" fill="#fff" data-delay="220" />
                  <circle cx="90" cy="760" r="0" fill="#fff" data-delay="300" />
                  <circle cx="400" cy="250" r="0" fill="#fff" data-delay="360" />
                  <circle cx="260" cy="860" r="0" fill="#fff" data-delay="420" />
                  <circle cx="230" cy="470" r="0" fill="#fff" data-delay="180" />
                </g>
              </mask>
            </defs>
            <g clipPath="url(#vasari-poster-clip)">
              <image
                data-poster-img
                preserveAspectRatio="none"
                width="474"
                height="900"
                filter="url(#vasari-ink)"
                mask="url(#vasari-blot-mask)"
              />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
