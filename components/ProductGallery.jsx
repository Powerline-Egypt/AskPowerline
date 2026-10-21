"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// `model3d` (optional) makes the first gallery slide an interactive, rotatable
// 3D model. It auto-loads when the gallery enters the viewport (live on page
// load). The product render is shown the whole time the viewer boots, and the
// interactive model is only revealed once it has actually rendered — so there's
// no blank "loading" screen.
export default function ProductGallery({ images, alt, badge, model3d, model3dPoster }) {
  const imgs = images && images.length ? images : [];
  const items = model3d
    ? [{ kind: "3d", poster: model3dPoster || imgs[0] }, ...imgs.map((src) => ({ kind: "img", src }))]
    : imgs.map((src) => ({ kind: "img", src }));

  const [active, setActive] = useState(0);
  const [load3d, setLoad3d] = useState(false);
  const [ready3d, setReady3d] = useState(false);
  const wrapRef = useRef(null);

  // Auto-mount the viewer once the gallery is on screen (immediate at the top).
  useEffect(() => {
    if (!model3d || load3d) return;
    const el = wrapRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setLoad3d(true);
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          setLoad3d(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [model3d, load3d]);

  // Reveal the model only once it has rendered a frame (keeps the product image
  // up until then, so the load feels instant). Same-origin iframe, so we can peek in.
  useEffect(() => {
    if (!load3d || ready3d) return;
    const start = Date.now();
    const id = setInterval(() => {
      try {
        const r = wrapRef.current?.querySelector("iframe.viewer")?.contentWindow?.__plgear?.st?.renderer;
        if (r && r.info && r.info.render && r.info.render.frame > 0) {
          setReady3d(true);
          clearInterval(id);
          return;
        }
      } catch (e) {
        /* iframe not ready yet */
      }
      if (Date.now() - start > 9000) {
        setReady3d(true);
        clearInterval(id);
      }
    }, 120);
    return () => clearInterval(id);
  }, [load3d, ready3d]);

  if (!items.length) return null;
  const cur = items[active];
  const is3d = cur.kind === "3d";

  const Rotate = (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1015-6.7L21 7" />
      <path d="M21 3v4h-4" />
    </svg>
  );

  return (
    <div className="gallery">
      <div className="main-wrap" ref={wrapRef}>
        <div className="main">
          {is3d ? (
            <>
              {cur.poster && (
                <Image className="pbg" src={cur.poster} alt={`${alt} 3D model`} fill sizes="(max-width:850px) 92vw, 46vw" style={{ objectFit: "contain" }} priority />
              )}
              {load3d && (
                <iframe
                  className={`viewer ${ready3d ? "in" : ""}`}
                  src={model3d}
                  title={`${alt} — interactive 3D model`}
                  loading="eager"
                  allow="fullscreen"
                />
              )}
            </>
          ) : (
            <Image src={cur.src} alt={alt} fill sizes="(max-width:850px) 92vw, 46vw" style={{ objectFit: "contain" }} />
          )}
          <span className="frame" />
        </div>

        {badge && (
          <span className="pg-cert" aria-hidden="false">
            <img className="pg-badge" src={badge} alt="Designed & Type Tested by Powerline" />
          </span>
        )}
      </div>

      {items.length > 1 && (
        <div className="thumbs">
          {items.map((it, i) => (
            <button
              key={it.kind === "3d" ? "3d" : it.src}
              className={`thumb ${it.kind === "3d" ? "t3d" : ""} ${i === active ? "on" : ""}`}
              onClick={() => setActive(i)}
              aria-label={it.kind === "3d" ? `${alt} interactive 3D model` : `${alt} image ${i}`}
              aria-current={i === active}
            >
              {it.kind === "3d" ? (
                <span className="t3d-inner">
                  <span className="t3d-icon">{Rotate}</span>
                  3D
                </span>
              ) : (
                <Image src={it.src} alt="" width={84} height={84} style={{ objectFit: "contain" }} />
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .gallery {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .main-wrap {
          position: relative;
        }
        .main {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: #fff;
        }
        .main :global(img) {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .main :global(.pbg) {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .viewer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
          background: #fff;
          z-index: 1;
          opacity: 0;
          transition: opacity 0.45s ease;
        }
        .viewer.in {
          opacity: 1;
        }
        .frame {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          border-radius: 20px;
          box-shadow: inset 0 0 0 1px rgba(232, 114, 42, 0.25);
        }

        /* ── certification stamp ── */
        .pg-cert {
          --pl: 232, 114, 42;
          position: absolute;
          top: 0;
          right: 0;
          width: clamp(116px, 29%, 176px);
          aspect-ratio: 1;
          transform: translate(26%, -40%) rotate(6deg);
          z-index: 6;
          pointer-events: none;
          filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.6));
        }
        .pg-badge {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0;
          transform-origin: center;
          filter: drop-shadow(0 0 10px rgba(var(--pl), 0.35)) drop-shadow(0 5px 12px rgba(0, 0, 0, 0.5));
          animation: pgInk 0.95s cubic-bezier(0.3, 0.7, 0.2, 1) 0.5s forwards;
        }
        @keyframes pgInk {
          0% { opacity: 1; transform: scale(0.965); }
          42% { transform: scale(1.012, 0.99); }
          70% { transform: scale(0.998); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pg-badge { animation: none; opacity: 1; }
          .viewer { transition: none; }
        }
        @media (max-width: 680px) {
          .pg-cert {
            right: 6%;
            width: clamp(104px, 32%, 150px);
            transform: translate(0, -40%) rotate(6deg);
          }
        }

        /* ── thumbs ── */
        .thumbs {
          display: flex;
          gap: 0.7rem;
          flex-wrap: wrap;
        }
        .thumb {
          width: 5.25rem;
          height: 5.25rem;
          padding: 0;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: #fff;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.25s, transform 0.25s var(--ease);
        }
        .thumb :global(img) {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .thumb:hover {
          transform: translateY(-3px);
        }
        .thumb.on {
          border-color: var(--orange);
          box-shadow: 0 0 0 2px rgba(232, 114, 42, 0.4);
        }
        .thumb.t3d {
          background: radial-gradient(120% 120% at 30% 20%, rgba(232, 114, 42, 0.22), transparent 60%), var(--bg-3);
        }
        .t3d-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          width: 100%;
          height: 100%;
          color: var(--text);
          font-family: var(--font-head);
          font-weight: 800;
          font-size: 0.9rem;
          letter-spacing: 0.04em;
        }
        .t3d-icon {
          color: var(--orange);
          display: grid;
          place-items: center;
        }
        .t3d-icon :global(svg) {
          width: 20px;
          height: 20px;
        }
      `}</style>
    </div>
  );
}
