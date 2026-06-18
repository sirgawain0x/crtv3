"use client";

import type { ReactNode } from "react";
import "./song-cup-hero.css";
import { CirclingTextRings } from "./CirclingTextRings";
import { SongCupLogo } from "./SongCupLogo";

type SongCupHeroProps = {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  onCtaClick: () => void;
  logo?: ReactNode;
  showRings?: boolean;
  ariaLabel?: string;
};

function PolyhedronFaces() {
  return (
    <div className="a3d">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={`s5-${i}`} className="s2d s5gon" />
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <div key={`s3-${i}`} className="s2d s3gon" />
      ))}
      {Array.from({ length: 30 }, (_, i) => (
        <div key={`s4-${i}`} className="s2d s4gon" />
      ))}
    </div>
  );
}

export function SongCupHero({
  headline = "BE OUR TOP ARTIST",
  subheadline = "Create your 30 sec. World Cup music video",
  ctaLabel = "Let's Goal",
  onCtaClick,
  logo,
  showRings = true,
  ariaLabel = "Song Cup Contest",
}: SongCupHeroProps) {
  return (
    <section className="song-cup-hero-scene relative min-h-[85vh] w-full overflow-hidden">
      <div className="site-header">
        <div className="site-logo" aria-label={ariaLabel}>
          {logo ?? <SongCupLogo />}
        </div>
      </div>

      <div className="song-cup-hero-animation">
        {showRings && <CirclingTextRings />}
        <PolyhedronFaces />
        <div className="song-cup-hero-copy">
          <div className="song-cup-hero-copy-inner">
            <h1 className="song-cup-hero-line">{headline}</h1>
            <p className="song-cup-hero-line song-cup-hero-line-sub">{subheadline}</p>
            <button
              type="button"
              onClick={onCtaClick}
              className="song-cup-lets-goal-btn"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
