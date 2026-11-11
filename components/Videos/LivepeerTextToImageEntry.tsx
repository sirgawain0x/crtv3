"use client";

import { useLivepeerAiFeatureFlags } from "@/context/LivepeerAiFeatureContext";

/**
 * Livepeer text-to-image entry surface (upload flow).
 * When the flag is off, show a calm coming-soon state (no Livepeer T2I calls).
 * When on, behavior matches today: thumbnails use Gemini; no separate Livepeer T2I UI.
 */
export function LivepeerTextToImageEntry() {
  const { textToImageEnabled } = useLivepeerAiFeatureFlags();
  if (textToImageEnabled) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground" role="status">
      Text-to-image coming soon
    </p>
  );
}
