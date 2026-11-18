"use client";

import { useEffect, useRef } from "react";
import "./noa.css";
import { GRAIN_SVG, SEA_STILL, SEA_VIDEO } from "./data";

export default function NoaSection() {
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
        const { mountNoa } = await import("./mountNoa");
        if (disposed || !rootRef.current) return;
        cleanup = mountNoa(rootRef.current);
      } catch (err) {
        console.warn("[noa] mount failed", err);
      }
    };

    // Start (loader + 100% counter) only once the user actually reaches this section.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting && en.intersectionRatio >= 0.45)) {
          io.disconnect();
          void start();
        }
      },
      { threshold: [0, 0.45, 0.6, 1] },
    );
    io.observe(root);

    return () => {
      disposed = true;
      io.disconnect();
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-noa
      id="noa-sea"
      style={{ ["--grain" as string]: `url("${GRAIN_SVG}")` }}
      aria-label="Video Gallery"
    >
      <section className="stage" id="view-home" data-view-home>
        <header className="galleryHead">
          <div className="gh-main">
            <p className="gh-kicker">
              <span className="gh-dot" />
              <span className="wmask">
                <span style={{ transitionDelay: ".05s" }}>FILM LIBRARY</span>
              </span>
              <span className="gh-sep">/</span>
              <span className="wmask">
                <span style={{ transitionDelay: ".12s" }}>16 SHORTS &amp; SHOWREELS</span>
              </span>
            </p>
            <h2 className="gh-title">
              <span className="wmask">
                <span style={{ transitionDelay: ".10s" }}>Video</span>
              </span>{" "}
              <span className="wmask">
                <span className="gh-italic" style={{ transitionDelay: ".20s" }}>
                  Gallery
                </span>
              </span>
            </h2>
          </div>
          <p className="gh-hint">
            <span className="wmask">
              <span style={{ transitionDelay: ".35s" }}>Spin the ring, hover a frame to play,</span>
            </span>
            <br />
            <span className="wmask">
              <span style={{ transitionDelay: ".42s" }}>click to open the film.</span>
            </span>
          </p>
        </header>

        <div className="frame is-open" data-frame>
          <div className="scene" data-scene data-parallax="10">
            <img src={SEA_STILL} alt="" />
            <video data-sea muted loop playsInline preload="none" poster={SEA_STILL} />
            <div className="grain" />
          </div>
          <div className="petals back" data-petals-back data-parallax="22" />
          <div className="wall" data-wall>
            <div className="lens" data-lens>
              <div className="ring" data-ring />
            </div>
          </div>
          <div className="mist" data-mist data-parallax="34" />
          <div className="petals front" data-petals-front data-parallax="48" />
          <div className="motes" data-motes data-parallax="40" />
        </div>
      </section>

      <div className="loader" data-loader>
        <div className="loaderName" data-loader-name>
          <i>
            <span style={{ transitionDelay: ".10s" }}>R</span>
          </i>
          <i>
            <span style={{ transitionDelay: ".18s" }}>e</span>
          </i>
          <i>
            <span style={{ transitionDelay: ".26s" }}>e</span>
          </i>
          <i>
            <span style={{ transitionDelay: ".34s" }}>l</span>
          </i>
          <i>
            <span style={{ transitionDelay: ".42s" }}>.</span>
          </i>
        </div>
        <div className="loaderCap" data-loader-cap />
        <div className="loaderOdo" data-loader-odo>
          <div className="odoMask">
            <div className="odoCol" data-odo="0">
              {"0123456789".split("").map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
          <div className="odoMask">
            <div className="odoCol" data-odo="1">
              {"0123456789".split("").map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
          <div className="odoMask">
            <div className="odoCol" data-odo="2">
              {"0123456789".split("").map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
          <span className="odoPct">%</span>
        </div>
        <button type="button" className="skip" data-skip aria-label="Skip intro">
          ↗
        </button>
      </div>

      {/* sea video source set in mount */}
      <template data-sea-src={SEA_VIDEO} />
    </div>
  );
}
