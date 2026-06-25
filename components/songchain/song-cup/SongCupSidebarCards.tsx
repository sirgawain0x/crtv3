"use client";

import Link from "next/link";

type SidebarIcon = {
  src: string;
  alt: string;
  href: string;
  dividerAfter?: boolean;
};

const BUTTON_ICONS: SidebarIcon[] = [
  {
    src: "/songchain/button-icons/songcup-icon.svg",
    alt: "Song cup",
    href: "/songchain/song-cup",
  },
  {
    src: "/songchain/button-icons/Pixels-icon.svg",
    alt: "Create with pixels",
    href: "/songchain/song-cup",
  },
  {
    src: "/songchain/button-icons/submit-icon.svg",
    alt: "Submit",
    href: "/songchain/song-cup",
    dividerAfter: true,
  },
  {
    src: "/songchain/button-icons/vote-icon.svg",
    alt: "Vote now",
    href: "/songchain/song-cup",
  },
  {
    src: "/songchain/button-icons/predict-icon.svg",
    alt: "Predict",
    href: "/songchain/song-cup",
  },
  {
    src: "/songchain/button-icons/leaderboard-icon.svg",
    alt: "Leaderboard",
    href: "/songchain/song-cup",
  },
  {
    src: "/songchain/button-icons/feed-icon.svg",
    alt: "The Feed",
    href: "/songchain/song-cup",
    dividerAfter: true,
  },
  {
    src: "/songchain/button-icons/beat-me-icon.svg",
    alt: "Beat me",
    href: "https://beatme.creativeplatform.xyz",
  },
  {
    src: "/songchain/button-icons/worldcup-icon.svg",
    alt: "World cup",
    href: "https://orb.club/c/worldcup",
  },
];

function SidebarDivider() {
  return (
    <hr className="my-1 w-1/2 border-0 border-t border-fuchsia-500/40" aria-hidden />
  );
}

export function SongCupSidebarCards() {
  return (
    <section className="flex flex-col items-center gap-2">
      {BUTTON_ICONS.map(({ src, alt, href, dividerAfter }) => (
        <div key={src} className="flex w-full flex-col items-center gap-2">
          <Link
            href={href}
            className="group relative block w-1/2 overflow-hidden bg-transparent transition-transform duration-300 hover:scale-[1.02]"
          >
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="h-auto w-full object-contain"
            />
            <span className="sr-only">{alt}</span>
          </Link>
          {dividerAfter ? <SidebarDivider /> : null}
        </div>
      ))}
    </section>
  );
}
