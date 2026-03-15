"use client";

import dynamic from "next/dynamic";

// Load non-critical client components in separate chunks (ssr: false only allowed in Client Components)
const IframeCleanup = dynamic(
  () => import("@/components/IframeCleanup").then((m) => ({ default: m.IframeCleanup })),
  { ssr: false }
);
const WebVitals = dynamic(
  () => import("@/components/WebVitals").then((m) => ({ default: m.WebVitals })),
  { ssr: false }
);

export function LayoutClientChunks() {
  return (
    <>
      <IframeCleanup />
      <WebVitals />
    </>
  );
}
