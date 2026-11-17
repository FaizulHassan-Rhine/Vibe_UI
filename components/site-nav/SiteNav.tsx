"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./SiteNav.module.css";

const LINKS = [
  { id: "noa", label: "Noa", href: "#noa" },
  { id: "reelmark", label: "Reelmark", href: "#reelmark" },
  { id: "vasari", label: "Vasari", href: "#vasari" },
  { id: "blendy", label: "Blendy", href: "#blendy" },
  { id: "stride", label: "Stride", href: "/stride" },
] as const;

export default function SiteNav() {
  const pillRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef("noa");
  const [active, setActive] = useState("noa");

  useEffect(() => {
    const pill = pillRef.current;
    const hl = hlRef.current;
    if (!pill || !hl) return;

    const syncHl = (id: string) => {
      const link = pill.querySelector<HTMLElement>(`[data-nav="${id}"]`);
      if (!link) return;
      const pr = pill.getBoundingClientRect();
      const lr = link.getBoundingClientRect();
      hl.style.left = `${lr.left - pr.left}px`;
      hl.style.width = `${lr.width}px`;
    };

    const setCurrent = (id: string) => {
      if (activeRef.current === id) {
        syncHl(id);
        return;
      }
      activeRef.current = id;
      setActive(id);
      syncHl(id);
    };

    const onScroll = () => {
      const mid = window.innerHeight * 0.35;
      let current = "noa";
      for (const id of ["noa", "reelmark", "vasari", "blendy"]) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= mid) current = id;
      }
      setCurrent(current);
    };

    const onResize = () => syncHl(activeRef.current);

    onScroll();
    requestAnimationFrame(() => syncHl(activeRef.current));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <nav className={styles.nav} aria-label="Site">
      <div className={styles.pill} ref={pillRef}>
        <span className={styles.hl} ref={hlRef} aria-hidden />
        {LINKS.map((l) =>
          l.href.startsWith("/") ? (
            <Link
              key={l.id}
              href={l.href}
              data-nav={l.id}
              data-active={active === l.id ? "1" : "0"}
            >
              {l.label}
            </Link>
          ) : (
            <a
              key={l.id}
              href={l.href}
              data-nav={l.id}
              data-active={active === l.id ? "1" : "0"}
            >
              {l.label}
            </a>
          ),
        )}
      </div>
    </nav>
  );
}
