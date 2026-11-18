"use client";

import { useEffect, useRef } from "react";
import "./ostra.css";
import { QUAD, WORK_CARDS, WORK_SHEETS } from "./data";

export default function OstraSection() {
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
        const { mountOstra } = await import("./mountOstra");
        if (disposed || !rootRef.current) return;
        cleanup = mountOstra(rootRef.current);
      } catch (err) {
        console.warn("[ostra] mount failed", err);
        document.documentElement.classList.remove("anim");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting && en.intersectionRatio >= 0.12)) {
          io.disconnect();
          void start();
        }
      },
      { threshold: [0, 0.12, 0.35, 1], rootMargin: "80px 0px" },
    );
    io.observe(root);

    return () => {
      disposed = true;
      io.disconnect();
      cleanup?.();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      data-ostra
      id="ostra-noor"
      aria-label="Image Gallery"
    >
      <div className="heroStage">
        <div className="heroAura" aria-hidden />

        <div className="heroSplit">
          <header className="galleryHead">
            <p className="gh-kicker" data-reveal data-reveal-on="load">
              <span className="gh-dot" />
              <span>Photo library</span>
              <span className="gh-rule" aria-hidden />
              <span className="gh-count">32 stills</span>
            </p>
            <h1 className="gh-title" aria-label="Image Gallery">
              <span className="hmask" aria-hidden>
                <span data-h1-line="0">IMAGE</span>
              </span>
              <span className="hmask" aria-hidden>
                <span className="gh-alt" data-h1-line="1">
                  Gallery
                </span>
              </span>
            </h1>
            <p className="gh-hint" data-reveal data-reveal-on="load">
              Drag the globe · click a frame to open
            </p>
          </header>

          <div className="globeWrap" data-globe-wrap>
            <div className="globeGlow" aria-hidden />
            <div className="globeFallback" aria-hidden />
            <canvas
              className="globeCanvas"
              data-globe
              role="img"
              aria-label="A slowly turning globe of photographs: red wine by candlelight, clay cups on the wheel, figs on terracotta, linen tables and stone walls. Drag to spin it."
            />
          </div>
        </div>
      </div>

      <div className="lit" data-lit aria-hidden="true">
        <button type="button" className="litScrim" data-lit-close aria-label="Close" />
        <div className="litPlate" data-lit-plate>
          <div className="litShot">
            <div className="litPhoto" data-lit-photo />
            <button type="button" className="litClose" data-lit-close>
              Close
            </button>
          </div>
          <div className="litMeta">
            <h3 className="litTitle" data-lit-title />
            <p className="litWhere" data-lit-where />
          </div>
        </div>
      </div>

      <div className="col albumIntro">
        <p className="albumEyebrow" data-reveal>
          Image album
        </p>
        <h2 className="albumTitle" data-reveal>
          <span className="hmask">
            <span>Selected</span>
          </span>{" "}
          <span className="hmask">
            <span className="albumAlt">stills</span>
          </span>
        </h2>
        <p className="albumLead" data-reveal>
          A short strip of frames from the same world as the globe — warm light, clay, linen and
          wine. Scroll or let it slide; open any frame for the full plate.
        </p>
      </div>

      <div className="col">
        <div className="work" data-work data-album>
          <div className="workTrack" data-work-track>
            {WORK_CARDS.map((c, i) => (
              <a
                key={c.n}
                className="card"
                href="#ostra-noor"
                aria-label={`View photo ${c.n}: ${c.name}`}
                data-reveal
                data-card-i={i}
                data-album-card
                data-sheet={c.sheet}
                data-quad={c.quad}
                data-title={c.name}
                data-place={c.place}
              >
                <span className="cardIdx">{c.n}</span>
                <div
                  className="cardImg"
                  style={{
                    backgroundImage: `url(${WORK_SHEETS[c.sheet as "w1" | "w2"]})`,
                    backgroundPosition: QUAD[c.quad as keyof typeof QUAD],
                  }}
                >
                  <span className="cardPill">View Photo</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="col sign">
        <p className="thanks" data-reveal>
          End of the album — drag the globe above for more frames from the same set.
        </p>
      </div>
    </section>
  );
}
