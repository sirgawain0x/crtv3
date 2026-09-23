import { fetchCreativeTVLensActivityFeed } from "@/lib/creativetv/fetch-lens-activity-feed";
import { TVLensActivityStrip } from "@/components/tv/TVLensActivityStrip";

/**
 * Server-side Lens activity strip for Creative TV home (Phase A: read-only).
 */
export async function TVLensActivityStripServer() {
  const { items, skipStrip } = await fetchCreativeTVLensActivityFeed();
  if (skipStrip) {
    return null;
  }
  return <TVLensActivityStrip items={items} />;
}
