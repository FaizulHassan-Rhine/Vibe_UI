"use client";

import { useEffect, useRef } from "react";
import styles from "./GalleryHero.module.css";

export default function GalleryHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { mountGallery } = await import("./mountGallery");
      if (!active || !rootRef.current) return;
      cleanup = mountGallery(rootRef.current, styles);
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
      id="gallery"
      aria-label="Photo gallery"
      data-gallery
    >
      <div className={styles.stage} data-stage>
        <div className={styles.world} data-world>
          <div className={styles.orb} data-orb>
            <div className={styles.core} data-core aria-hidden />
          </div>
        </div>
      </div>

      <div className={styles.grid} data-grid aria-hidden="true">
        <div className={styles.rows} data-rows />
      </div>

      <button
        type="button"
        className={styles.gridBtn}
        data-grid-btn
        aria-label="Toggle grid view"
        aria-pressed="false"
      >
        <b />
        <b />
        <b />
        <b />
      </button>

      <div className={styles.lit} data-lit aria-hidden="true">
        <div className={styles.scrim} data-close />
        <div className={styles.plate} data-plate>
          <div className={styles.shot}>
            <img data-lit-img alt="" />
            <button type="button" className={styles.close} data-close>
              Close
            </button>
          </div>
          <div className={styles.meta}>
            <h2 className={styles.title} data-lit-title />
            <p className={styles.where} data-lit-where />
          </div>
        </div>
      </div>
    </section>
  );
}
