"use client";

import "./song-cup-hero.css";
import { CirclingTextRings } from "./CirclingTextRings";
import { SongCupLogo } from "./SongCupLogo";

type SongCupHeroProps = {
  onLetsGoalClick: () => void;
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

export function SongCupHero({ onLetsGoalClick }: SongCupHeroProps) {
  return (
    <section className="song-cup-hero-scene relative min-h-[85vh] w-full overflow-hidden bg-black">
      <div className="site-header">
        <div className="site-logo" aria-label="Song Cup Contest">
          <SongCupLogo />
        </div>
      </div>

      <div className="song-cup-hero-copy">
        <h1 className="song-cup-hero-line">BE OUR TOP ARTIST</h1>
        <p className="song-cup-hero-line song-cup-hero-line-sub">
          CREATE YOUR 30 SEC. WORLD CUP MUSIC VIDEO
        </p>
        <button
          type="button"
          onClick={onLetsGoalClick}
          className="song-cup-lets-goal-btn"
        >
          Let&apos;s Goal
        </button>
      </div>

      <div className="song-cup-hero-animation" aria-hidden="true">
        <CirclingTextRings />
        <PolyhedronFaces />
      </div>
    </section>
  );
}
