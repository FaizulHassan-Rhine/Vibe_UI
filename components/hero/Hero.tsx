"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { mountHero } = await import("./mountHero");
        if (!active || !rootRef.current) return;
        cleanup = mountHero(rootRef.current);
      } catch (err) {
        console.error("[hero] failed to start", err);
        const counter = rootRef.current?.querySelector("[data-counter]");
        const label = rootRef.current?.querySelector("[data-label]");
        if (counter) counter.textContent = "Could not load";
        if (label) label.textContent = "Refresh to try again";
      }
    })();

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="noa"
      className={styles.hero}
      data-phase="loading"
      aria-label="Noa Ellsworth"
    >
      <div className={styles.stage} data-stage aria-hidden="true" />
      <div
        className={styles.loader}
        data-loader
        role="progressbar"
        aria-label="Loading the dots"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <svg viewBox="-110 -110 220 220" aria-hidden="true" />
        <span className={styles.counter} data-counter>
          000
        </span>
        <span className={styles.label} data-label>
          66,000 dots
        </span>
      </div>
      <Link className={styles.logo} href="/">
        Noa.
      </Link>
      <h1 className={styles.name}>Noa Ellsworth</h1>
      <p className={styles.tagline}>Grows quiet things with AI</p>
      <p className={styles.hint}>Move the light</p>
      <a className={styles.pill} href="#reelmark">
        How this page was made →
      </a>
    </section>
  );
}
