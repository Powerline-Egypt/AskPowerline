"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// PRAL section — split layout: content (title, intro, specs, CTA) on the left,
// the guided-tour video (public/pral-tour.mp4) on the right with a custom
// player: play/pause, seek, time, a prominent AUDIO toggle (muted by default —
// audio is opt-in), and fullscreen. CTA opens the full interactive explorer.
// Lazy-mounted so it never slows the product page's initial load.
const VIDEO_URL = "/pral-tour.mp4";
const POSTER_URL = "/img/pral-tour-poster.webp";
// The full interactive tool, self-hosted so it opens straight on the PRAL product
// (the hosted explorer reads no URL params and would open on PLGEAR).
const EXPLORER_URL = "/pral-tool.html";

const SPECS = [
  { k: "Rated voltage", v: "12 / 24 kV" },
  { k: "Insulation", v: "Air (AIS)" },
  { k: "Switching", v: "ABB NAL / NALF" },
  { k: "Configuration", v: "Ring main unit" },
];

const IcPlay = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const IcPause = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
);
const IcMute = (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h3l4 4V5L7 9H4z" fill="currentColor" stroke="none" /><path d="M16 9l5 6M21 9l-5 6" /></svg>
);
const IcSound = (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h3l4 4V5L7 9H4z" fill="currentColor" stroke="none" /><path d="M16 8.5a5 5 0 010 7M18.5 6a9 9 0 010 12" /></svg>
);
const IcFull = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
const IcArrow = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
);

const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function PralExplorer() {
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const playerRef = useRef(null);
  const videoRef = useRef(null);
  const barRef = useRef(null);

  // Lazy-mount the video when the section nears the viewport.
  useEffect(() => {
    if (load) return;
    const el = playerRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setLoad(true);
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) v.play().catch(() => {});
  }, []);

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setCur(v.currentTime);
    if (v.duration) {
      setDur(v.duration);
      setProgress(v.currentTime / v.duration);
    }
  };

  const seek = (e) => {
    const v = videoRef.current;
    const bar = barRef.current;
    if (!v || !bar || !v.duration) return;
    const r = bar.getBoundingClientRect();
    v.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * v.duration;
  };

  const fullscreen = () => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  };

  return (
    <section className="plx">
      <div className="container">
        <div className="split">
          {/* Left — content */}
          <div className="copy">
            <span className="eyebrow">Interactive · 3D guided tour</span>
            <h2 className="section-title">
              Inside <span className="acc">PRAL</span>
            </h2>
            <p className="lead">
              A guided walkthrough of the air-insulated ring main unit — ring feeders, the
              transformer feeder, NAL/NALF load-break switches, earthing and the measuring cell,
              part by part. Turn the sound on, or step in and build your own.
            </p>
            <div className="specs">
              {SPECS.map((s) => (
                <div className="spec" key={s.k}>
                  <span className="k">{s.k}</span>
                  <span className="v">{s.v}</span>
                </div>
              ))}
            </div>
            <a className="cta" href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">
              <span className="cta-label">Build Your PRAL {IcArrow}</span>
            </a>
          </div>

          {/* Right — the tour video */}
          <div className="player" ref={playerRef}>
            {load ? (
              <video
                ref={videoRef}
                className="vid"
                src={VIDEO_URL}
                poster={POSTER_URL}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onTimeUpdate={onTime}
                onLoadedMetadata={onTime}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <img className="vid" src={POSTER_URL} alt="PRAL 3D guided tour" />
            )}

            {load && !playing && (
              <button className="bigplay" type="button" onClick={togglePlay} aria-label="Play the tour">
                {IcPlay}
              </button>
            )}

            <div className="ctrls">
              <button className="ic" type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing ? IcPause : IcPlay}
              </button>
              <div className="bar" ref={barRef} onClick={seek} role="slider" aria-label="Seek" aria-valuenow={Math.round(progress * 100)}>
                <span className="fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="time">{fmt(cur)} / {fmt(dur)}</span>
              <button className={`abtn ${muted ? "muted" : ""}`} type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Mute"}>
                {muted ? IcMute : IcSound}
                <span>{muted ? "Sound off" : "Sound on"}</span>
              </button>
              <button className="ic" type="button" onClick={fullscreen} aria-label="Fullscreen">
                {IcFull}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .plx {
          padding: clamp(3.5rem, 9vh, 6rem) 0;
          border-top: 1px solid var(--line);
        }
        .split {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: clamp(1.6rem, 4vw, 3.2rem);
          align-items: center;
        }

        /* ── left: content ── */
        .copy {
          max-width: 44ch;
        }
        .copy h2 {
          text-transform: uppercase;
          margin: 0.9rem 0 0.9rem;
        }
        .copy .acc {
          color: var(--orange);
        }
        .lead {
          color: var(--text-dim);
          font-size: 1.02rem;
          line-height: 1.6;
          margin: 0 0 1.6rem;
        }
        .specs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.7rem;
          margin-bottom: 1.8rem;
          max-width: 28rem;
        }
        .spec {
          padding: 0.7rem 1rem;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--bg-2);
        }
        .spec .k {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-faint);
        }
        .spec .v {
          display: block;
          font-family: var(--font-head);
          font-weight: 800;
          color: var(--orange);
          font-size: 1.02rem;
          margin-top: 0.2rem;
        }

        /* ── shiny CTA ── */
        .cta {
          position: relative;
          display: inline-flex;
          overflow: hidden;
          padding: 1.05rem 2.3rem;
          border-radius: 100px;
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #140a04;
          background: linear-gradient(118deg, #ffb27a 0%, #ff8a4c 32%, #e8722a 60%, #c8501a 100%);
          box-shadow: 0 12px 44px -8px rgba(232, 114, 42, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.45);
          animation: ctaPulse 2.8s ease-in-out infinite;
          transition: transform 0.35s var(--ease), box-shadow 0.35s ease;
          isolation: isolate;
        }
        .cta-label {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
        }
        .cta::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -70%;
          width: 45%;
          z-index: 1;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75) 50%, transparent);
          transform: skewX(-22deg);
          animation: ctaSheen 3.4s ease-in-out infinite;
        }
        .cta:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 18px 60px -6px rgba(232, 114, 42, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        /* ── right: player ── */
        .player {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: #060608;
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.5), 0 0 55px -22px rgba(232, 114, 42, 0.4);
        }
        .vid {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #060608;
          cursor: pointer;
        }
        .bigplay {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #140a04;
          background: rgba(232, 114, 42, 0.94);
          border: none;
          box-shadow: 0 12px 40px rgba(232, 114, 42, 0.55);
          z-index: 3;
          transition: transform 0.3s var(--ease);
        }
        .bigplay :global(svg) {
          width: 28px;
          height: 28px;
          margin-left: 3px;
        }
        .bigplay:hover {
          transform: scale(1.08);
        }

        .ctrls {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 1.8rem 0.75rem 0.75rem;
          background: linear-gradient(to top, rgba(4, 4, 5, 0.9) 0%, rgba(4, 4, 5, 0.35) 55%, transparent 100%);
        }
        .ic {
          flex: 0 0 auto;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          color: #fff;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 50%;
          transition: color 0.2s, border-color 0.2s;
        }
        .ic:hover {
          color: var(--orange);
          border-color: rgba(232, 114, 42, 0.55);
        }
        .bar {
          flex: 1 1 auto;
          position: relative;
          height: 6px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.22);
          cursor: pointer;
        }
        .bar .fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: 99px;
          background: var(--orange);
          box-shadow: 0 0 10px rgba(232, 114, 42, 0.6);
        }
        .time {
          flex: 0 0 auto;
          font-size: 0.74rem;
          color: #fff;
          opacity: 0.9;
          font-variant-numeric: tabular-nums;
        }
        .abtn {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          height: 36px;
          padding: 0 0.8rem;
          border-radius: 99px;
          color: #fff;
          background: rgba(0, 0, 0, 0.32);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-family: var(--font-body);
          font-size: 0.74rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .abtn.muted {
          color: var(--orange);
          border-color: rgba(232, 114, 42, 0.6);
          background: rgba(232, 114, 42, 0.14);
        }
        .abtn:hover {
          color: var(--orange);
          border-color: rgba(232, 114, 42, 0.7);
        }

        @keyframes ctaSheen {
          0% { left: -70%; }
          45% { left: 130%; }
          100% { left: 130%; }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 12px 44px -10px rgba(232, 114, 42, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.45); }
          50% { box-shadow: 0 16px 56px -8px rgba(232, 114, 42, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.5); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cta, .cta::before, .bigplay { animation: none !important; transition: none !important; }
        }

        @media (max-width: 880px) {
          .split {
            grid-template-columns: 1fr;
            gap: 1.6rem;
          }
          .copy {
            max-width: none;
          }
          .cta {
            width: 100%;
            justify-content: center;
          }
          .time {
            display: none;
          }
          .abtn span {
            display: none;
          }
          .abtn {
            padding: 0;
            width: 36px;
            justify-content: center;
            border-radius: 50%;
          }
        }
      `}</style>
    </section>
  );
}
