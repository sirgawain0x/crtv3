"use client";

import { cn } from "@/lib/utils/utils";
import {
  songCupSidebarIconBtn,
  songCupSidebarIconRingActive,
  songCupSidebarIconRingHover,
} from "@/lib/songchain/song-cup/panel-styles";
import { SONG_CUP_BUTTON_ICONS, type SongCupPanel } from "./song-cup-icons";

function SidebarDivider() {
  return (
    <hr className="my-1 w-1/2 border-0 border-t border-fuchsia-500/40" aria-hidden />
  );
}

type SongCupSidebarIconsProps = {
  active: SongCupPanel | null;
  onSelect: (panel: SongCupPanel | null) => void;
  className?: string;
};

export function SongCupSidebarIcons({ active, onSelect, className }: SongCupSidebarIconsProps) {
  return (
    <section className={className}>
      {SONG_CUP_BUTTON_ICONS.map(({ id, src, alt, dividerAfter, externalHref, iconBgClass }) => {
        const isActive = active === id;
        const baseClasses = cn(
          "group block w-1/2 hover:scale-[1.02]",
          songCupSidebarIconBtn,
        );

        const imageWrapClass = cn(
          "rounded-xl",
          isActive ? songCupSidebarIconRingActive : songCupSidebarIconRingHover,
        );

        const imageInnerClass = cn(
          "overflow-hidden rounded-xl",
          iconBgClass ?? "bg-transparent",
        );

        const image = (
          <div className={imageWrapClass}>
            <div className={imageInnerClass}>
              <img
                src={src}
                alt={alt}
                loading="lazy"
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
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
