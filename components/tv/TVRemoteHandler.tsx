"use client";

import { useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), .tv-focusable';

type TVRemoteHandlerProps = {
  enabled?: boolean;
};

/**
 * Spatial navigation helper for D-pad / remote on living-room browsers.
 * Arrow keys move focus among .tv-focusable elements.
 */
export function TVRemoteHandler({ enabled = true }: TVRemoteHandlerProps) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);

      if (!nodes.length) return;

      const currentIndex = active ? nodes.indexOf(active) : -1;
      const currentRect = (active ?? nodes[0]).getBoundingClientRect();

      let best: HTMLElement | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidate of nodes) {
        if (candidate === active) continue;
        const rect = candidate.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - (currentRect.left + currentRect.width / 2);
        const dy = rect.top + rect.height / 2 - (currentRect.top + currentRect.height / 2);

        const primary =
          key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
        const secondary =
          key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);

        const wrongDirection =
          (key === "ArrowLeft" && dx >= -8) ||
          (key === "ArrowRight" && dx <= 8) ||
          (key === "ArrowUp" && dy >= -8) ||
          (key === "ArrowDown" && dy <= 8);

        if (wrongDirection) continue;

        const score = primary * 2 + secondary;
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
      }

      if (best) {
        event.preventDefault();
        best.focus();
      } else if (currentIndex === -1) {
        nodes[0]?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  return null;
}
