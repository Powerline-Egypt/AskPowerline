"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { projects } from "@/lib/content";
import { Reveal } from "@/components/Primitives";

/**
 * Powerline Projects — an auto-looping strip you can also grab and drag.
 * The track scrolls on its own (JS rAF, not scroll-bound); holding it pauses
 * the drift and follows the pointer left/right, releasing flings it with
 * momentum, then it resumes. The loop is seamless in both directions.
 *
 * Each card is a self-branded project image (the name is on the image itself);
 * a small sector chip is overlaid in the corner.
 */
export default function Projects() {
  const loop = [...projects, ...projects];
  const vpRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const vp = vpRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let baseWidth = track.scrollWidth / 2;
    const measure = () => { baseWidth = track.scrollWidth / 2; };
    const ro = new ResizeObserver(measure);
    ro.observe(track);

    let offset = 0;
    let dragging = false;
    let hovering = false;
    let lastX = 0;
    let lastMoveT = 0;
    let velocity = 0;
    const SPEED = reduce ? 0 : 42;

    const wrap = () => {
      if (baseWidth > 0) {
        offset = (((offset % baseWidth) + baseWidth) % baseWidth) - baseWidth;
      }
    };
    const apply = () => {
      track.style.transform = `translate3d(${offset}px,0,0)`;
    };

    let raf;
    let lastT = null;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (lastT == null) { lastT = t; apply(); return; }
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      if (dragging) return;
      if (Math.abs(velocity) > 4) {
        offset += velocity * dt;
        velocity *= Math.pow(0.92, dt * 60);
      } else {
        velocity = 0;
        if (!hovering) offset -= SPEED * dt;
      }
      wrap();
      apply();
    };
    raf = requestAnimationFrame(tick);

    const onDown = (e) => {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastMoveT = performance.now();
      vp.style.cursor = "grabbing";
      if (e.pointerId != null) { try { vp.setPointerCapture(e.pointerId); } catch {} }
    };
    const onMove = (e) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dts = Math.max(0.001, (now - lastMoveT) / 1000);
      offset += dx;
      velocity = Math.max(-2600, Math.min(2600, dx / dts));
      lastX = e.clientX;
      lastMoveT = now;
      wrap();
      apply();
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      vp.style.cursor = "grab";
      if (performance.now() - lastMoveT > 90) velocity = 0;
      if (e && e.pointerId != null) { try { vp.releasePointerCapture(e.pointerId); } catch {} }
    };
    const onEnter = () => { hovering = true; };
    const onLeave = () => { hovering = false; };

    vp.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    vp.addEventListener("pointerenter", onEnter);
    vp.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      vp.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      vp.removeEventListener("pointerenter", onEnter);
      vp.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section id="projects" className="pj">
      <div className="container">
        <Reveal>
          <div className="pj-head">
            <span className="eyebrow">Powerline Projects</span>
            <h2 className="pj-title">
              Power that built <span className="text-orange">landmarks.</span>
            </h2>
            <p className="pj-lead">
              From hospitals and ports to mega-developments, our boards energise
              the places that shape Egypt.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="pj-marquee" ref={vpRef}>
            <div className="pj-track" ref={trackRef}>
              {loop.map((p, i) => (
                <article className="pj-card" key={i}>
                  <Image
                    className="pj-card-img"
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="(max-width: 900px) 86vw, 30rem"
                    style={{ objectFit: "cover" }}
                    draggable={false}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {p.type && <span className="pj-type">{p.type}</span>}
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <style jsx>{`
        .pj {
          padding: clamp(4rem, 10vh, 7rem) 0;
          background: transparent;
        }
        .pj-head {
          text-align: center;
          margin-bottom: clamp(2rem, 5vh, 3rem);
        }
        .pj-head :global(.eyebrow) {
          justify-content: center;
        }
        .pj-title {
          font-family: var(--font-head);
          font-weight: 800;
          text-transform: uppercase;
          line-height: 1.04;
          font-size: clamp(1.8rem, 4vw, 3rem);
          margin-top: 1rem;
          color: #fff;
        }
        .text-orange {
          color: var(--orange);
        }
        .pj-lead {
          color: var(--text-dim);
          font-size: 1.02rem;
          max-width: 52ch;
          margin: 1.1rem auto 0;
        }

        /* ── the looping strip (JS-driven; grab to drag) ── */
        .pj-marquee {
          overflow: hidden;
          cursor: grab;
          touch-action: pan-y;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .pj-marquee:active {
          cursor: grabbing;
        }
        .pj-track {
          display: flex;
          width: max-content;
          will-change: transform;
          user-select: none;
        }
        :global(.pj-card-img) {
          -webkit-user-drag: none;
          user-select: none;
        }

        /* self-branded 16:9 image cards */
        .pj-card {
          flex: 0 0 auto;
          margin-right: clamp(1.4rem, 2.6vw, 2.4rem);
          width: clamp(21rem, 38vw, 31rem);
          aspect-ratio: 16 / 9;
          position: relative;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          background: #0b0b0d;
          transition: border-color 0.4s ease, transform 0.5s var(--ease), box-shadow 0.5s ease;
        }
        .pj-card:hover {
          border-color: rgba(232, 114, 42, 0.5);
          transform: translateY(-6px);
          box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.7);
        }
        :global(.pj-card-img) {
          z-index: 0;
          transform: scale(1.02);
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pj-card:hover :global(.pj-card-img) {
          transform: scale(1.08);
        }
        /* sector chip — top-left, clear of the image's own (bottom-left) name */
        .pj-type {
          position: absolute;
          top: clamp(0.9rem, 1.8vw, 1.3rem);
          left: clamp(0.9rem, 1.8vw, 1.3rem);
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.42rem 0.85rem;
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--orange);
          background: rgba(5, 5, 6, 0.6);
          border: 1px solid rgba(232, 114, 42, 0.45);
          border-radius: 99px;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .pj-type::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--orange);
          box-shadow: 0 0 10px var(--orange);
        }

        @media (max-width: 900px) {
          .pj-card {
            width: 86vw;
            max-width: 32rem;
          }
        }
      `}</style>
    </section>
  );
}
