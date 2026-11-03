import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { DearCreativePost } from "@/lib/dear-creative/types";

export const DEAR_CREATIVE_VISUAL_ORIGIN = "https://news.creativeplatform.xyz";

export const DEAR_CREATIVE_VISUAL_POSTS: DearCreativePost[] = [
  {
    slug: "onchain-music-roundup",
    title: "Onchain Music Roundup",
    publishedAt: "2026-02-15T12:00:00.000Z",
    excerpt: "Weekly music and culture from Dear Creative.",
    coverImage: "https://picsum.photos/seed/dc-music/800/450",
    isGated: false,
    tags: ["music"],
    canonicalUrl: `${DEAR_CREATIVE_VISUAL_ORIGIN}/posts/onchain-music-roundup`,
  },
  {
    slug: "creator-economy-brief",
    title: "Creator Economy Brief",
    publishedAt: "2026-02-10T09:30:00.000Z",
    excerpt: "Public post for the home feed.",
    coverImage: "https://picsum.photos/seed/dc-brief/800/450",
    isGated: false,
    canonicalUrl: `${DEAR_CREATIVE_VISUAL_ORIGIN}/posts/creator-economy-brief`,
  },
  {
    slug: "members-only-dispatch",
    title: "Members Only Dispatch",
    publishedAt: "2026-02-01T18:00:00.000Z",
    excerpt: "Subscriber-only insights.",
    coverImage: "https://picsum.photos/seed/dc-gated/800/450",
    isGated: true,
    tags: ["music"],
    canonicalUrl: `${DEAR_CREATIVE_VISUAL_ORIGIN}/posts/members-only-dispatch`,
  },
];

export function buildVisualHtmlDocument(markup: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class', theme: { extend: {} } };
  </script>
  <style>
    body { background: hsl(0 0% 3.9%); color: hsl(0 0% 98%); font-family: system-ui, sans-serif; }
    .text-primary { color: hsl(346 77% 60%); }
    .text-muted-foreground { color: hsl(0 0% 63.9%); }
    .text-card-foreground { color: hsl(0 0% 98%); }
    .bg-card { background: hsl(0 0% 3.9%); }
    .border-border\\/50 { border-color: hsl(0 0% 14.9% / 0.5); }
    .bg-muted { background: hsl(0 0% 14.9%); }
    .bg-secondary { background: hsl(0 0% 14.9%); }
    .bg-primary\\/90 { background: hsl(346 77% 60% / 0.9); }
    .text-primary-foreground { color: hsl(0 0% 98%); }
  </style>
</head>
<body>${markup}</body>
</html>`;
}

export async function renderComponentMarkup(element: React.ReactElement): Promise<string> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  const html = container.innerHTML;
  await act(async () => {
    root.unmount();
  });
  container.remove();
  return html;
}
