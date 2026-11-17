"use client";

import { useEffect, useRef } from "react";
import styles from "./DistillHero.module.css";

export default function DistillHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { mountDistill } = await import("./mountDistill");
      if (!active || !rootRef.current) return;
      cleanup = mountDistill(rootRef.current, styles);
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
      id="distill"
      aria-label="Distill — Built for people. Read by machines."
      data-distill
    />
  );
}
