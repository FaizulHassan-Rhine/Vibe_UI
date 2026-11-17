"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./SiteNav.module.css";

const LINKS = [
  {
    id: "noa",
    label: "Noa",
    href: "#noa",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    id: "reelmark",
    label: "Reelmark",
    href: "#reelmark",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="m10 8 7 4-7 4V8Z" />
      </svg>
    ),
  },
  {
    id: "vasari",
    label: "Vasari",
    href: "#vasari",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4.5 8.5h15v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9Z" />
        <path d="M8 8.5V6.8A2.8 2.8 0 0 1 10.8 4h2.4A2.8 2.8 0 0 1 16 6.8v1.7" />
        <path d="M8 13h8M8 16h5" />
      </svg>
    ),
  },
  {
    id: "blendy",
    label: "Blendy",
    href: "#blendy",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M8 3h8l-1.2 3.5H9.2L8 3Z" />
        <path d="M9.2 6.5h5.6L16 20.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20.5L9.2 6.5Z" />
        <path d="M10 11c.8 1.4 2 2.2 2 3.6 0 1.1-.9 1.9-2 1.9" />
      </svg>
    ),
  },
  {
    id: "distill",
    label: "Distill",
    href: "#distill",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 3s-6.5 7-6.5 11.2a6.5 6.5 0 1 0 13 0C18.5 10 12 3 12 3Z" />
      </svg>
    ),
  },
  {
    id: "stride",
    label: "Stride",
    href: "/stride",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 17c2.2-1.2 3.5-3.4 4.2-6.2.4-1.5 1.6-2.5 3.1-2.5H16" />
        <path d="M14 8.3 18.5 4M18.5 4H15M18.5 4v3.5" />
        <path d="M5 19.5h9.5c1.8 0 3.2-1 3.8-2.6L20 13" />
      </svg>
    ),
  },
  {
    id: "kolibrie",
    label: "Kolibrie",
    href: "/kolibrie",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 13c3-1 5.5-4.5 6.5-8 2.5 2 5.5 3.2 9 3-2.2 2.2-4 5-4.5 8.5" />
        <path d="M10.5 13.5c1.2 1.8 1.6 3.7 1.2 5.5" />
        <path d="M14 10.5c1.8.2 3.5.8 5 1.8" />
      </svg>
    ),
  },
] as const;

const SECTION_IDS = ["noa", "reelmark", "vasari", "blendy", "distill"] as const;

export default function SiteNav() {
  const dockRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef("noa");
  const [active, setActive] = useState("noa");

  useEffect(() => {
    const dock = dockRef.current;
    const hl = hlRef.current;
    if (!dock || !hl) return;

    const syncHl = (id: string) => {
      const link = dock.querySelector<HTMLElement>(`[data-nav="${id}"]`);
      if (!link) return;
      const vertical = window.matchMedia("(min-width: 721px)").matches;
      if (vertical) {
        hl.style.top = `${link.offsetTop}px`;
        hl.style.height = `${link.offsetHeight}px`;
        hl.style.left = "";
        hl.style.width = "";
      } else {
        hl.style.left = `${link.offsetLeft}px`;
        hl.style.width = `${link.offsetWidth}px`;
        hl.style.top = "";
        hl.style.height = "";
      }
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
      const mid = window.innerHeight * 0.4;
      let current: string = "noa";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= mid) current = id;
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

  const onSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav className={styles.nav} aria-label="Site">
      <div className={styles.dock} ref={dockRef}>
        <span className={styles.hl} ref={hlRef} aria-hidden />
        {LINKS.map((l) =>
          l.href.startsWith("/") ? (
            <Link
              key={l.id}
              href={l.href}
              className={styles.link}
              data-nav={l.id}
              data-active={active === l.id ? "1" : "0"}
              aria-label={l.label}
              title={l.label}
            >
              {l.icon}
              <span className={styles.tip}>{l.label}</span>
            </Link>
          ) : (
            <a
              key={l.id}
              href={l.href}
              className={styles.link}
              data-nav={l.id}
              data-active={active === l.id ? "1" : "0"}
              aria-label={l.label}
              title={l.label}
              onClick={(e) => onSectionClick(e, l.id)}
            >
              {l.icon}
              <span className={styles.tip}>{l.label}</span>
            </a>
          ),
        )}
      </div>
    </nav>
  );
}
