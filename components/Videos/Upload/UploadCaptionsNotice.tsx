"use client";

import { useLivepeerAiFeatureFlags } from "@/context/LivepeerAiFeatureContext";

export function UploadCaptionsNotice() {
  const { captionsEnabled } = useLivepeerAiFeatureFlags();
  if (captionsEnabled) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground" role="status">
      Captions coming soon
    </p>
  );
}
