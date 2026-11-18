"use client";

import { useEffect, useRef } from "react";
import "./vante.css";

export default function VanteSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let started = false;

    const start = async () => {
      if (started || disposed) return;
      started = true;
      try {
        const { mountVante } = await import("./mountVante");
        if (disposed || !rootRef.current) return;
        cleanup = mountVante(rootRef.current);
      } catch (err) {
        console.warn("[vante] mount failed", err);
      }
    };

    // Defer WebGL work until the section is near the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          io.disconnect();
          void start();
        }
      },
      { rootMargin: "80% 0px" },
    );
    io.observe(root);

    return () => {
      disposed = true;
      io.disconnect();
      cleanup?.();
    };
  }, []);

  return (
    <div ref={rootRef} data-vante id="vante" aria-label="Vante — Craft in Motion">
      <div id="track">
        <main className="stage" id="stage">
          <h1 aria-label="Craft in motion">
            <div className="hl" id="l1" aria-hidden="true">
              <span>CRAFT IN</span>
            </div>
            <div className="hl" id="l2" aria-hidden="true">
              <span>MOTION</span>
            </div>
          </h1>
          <div id="cap">Exploring ideas through daily design practice.</div>
          <div id="rule" />
          <canvas id="gl" />
          <div id="name" />
        </main>
      </div>
    </div>
  );
}
