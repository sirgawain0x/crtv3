"use client";

import { SONG_CUP_BUTTON_ICONS, type SongCupPanel } from "./song-cup-icons";

function SidebarDivider() {
  return (
    <hr className="my-1 w-1/2 border-0 border-t border-fuchsia-500/40" aria-hidden />
  );
}

type SongCupSidebarIconsProps = {
  active: SongCupPanel;
  onSelect: (panel: SongCupPanel) => void;
  className?: string;
};

export function SongCupSidebarIcons({ active, onSelect, className }: SongCupSidebarIconsProps) {
  return (
    <section className={className}>
      {SONG_CUP_BUTTON_ICONS.map(({ id, src, alt, dividerAfter, externalHref }) => {
        const isActive = active === id;
        const baseClasses = [
          "group relative block w-1/2 overflow-hidden bg-transparent transition-all duration-200 hover:scale-[1.02]",
          isActive ? "ring-2 ring-fuchsia-500 rounded-xl" : "",
        ].join(" ");

        const image = (
          <>
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="h-auto w-full object-contain"
            />
            <span className="sr-only">{alt}</span>
          </>
        );

        return (
          <div key={id} className="flex w-full flex-col items-center gap-2">
            {externalHref ? (
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className={baseClasses}
                aria-label={alt}
              >
                {image}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (id === "beatme" || id === "worldcup") return;
                  onSelect(id as SongCupPanel);
                }}
                className={baseClasses}
                aria-pressed={isActive}
              >
                {image}
              </button>
            )}
            {dividerAfter ? <SidebarDivider /> : null}
          </div>
        );
      })}
    </section>
  );
}
