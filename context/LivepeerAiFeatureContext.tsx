"use client";

import React, { createContext, useContext } from "react";
import type { LivepeerAiClientFeatureFlags } from "@/lib/livepeer/livepeer-ai-gating";

const defaultFlags: LivepeerAiClientFeatureFlags = {
  captionsEnabled: true,
  textToImageEnabled: true,
};

const LivepeerAiFeatureContext = createContext<LivepeerAiClientFeatureFlags>(
  defaultFlags,
);

export function LivepeerAiFeatureProvider({
  value,
  children,
}: {
  value: LivepeerAiClientFeatureFlags;
  children: React.ReactNode;
}) {
  return (
    <LivepeerAiFeatureContext.Provider value={value}>
      {children}
    </LivepeerAiFeatureContext.Provider>
  );
}

export function useLivepeerAiFeatureFlags(): LivepeerAiClientFeatureFlags {
  return useContext(LivepeerAiFeatureContext);
}
