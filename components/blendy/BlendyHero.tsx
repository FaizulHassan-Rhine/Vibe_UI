"use client";

import { useEffect, useRef } from "react";
import styles from "./BlendyHero.module.css";

export default function BlendyHero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { mountBlendy } = await import("./mountBlendy");
      if (!active || !rootRef.current) return;
      cleanup = mountBlendy(rootRef.current);
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
      id="blendy"
      aria-label="Blendy — Real fruit smoothies"
      data-blendy
    />
  );
}
