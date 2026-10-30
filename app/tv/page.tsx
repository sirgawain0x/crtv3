import { TVHomePageClient } from "@/components/tv/TVHomePageClient";
import { TVLensActivityStripServer } from "@/components/tv/TVLensActivityStripServer";

export default function TVHomePage() {
  return (
    <TVHomePageClient activityStrip={<TVLensActivityStripServer />} />
  );
}
