import { DiscoverEmbedPlayer } from "@/components/Embed/DiscoverEmbedPlayer";
import { CREATIVE_TV_ASSET_UUID_REGEX } from "@/lib/utils/creative-tv-url";

type EmbedDiscoverPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmbedDiscoverPage({ params }: EmbedDiscoverPageProps) {
  const { id } = await params;

  if (!CREATIVE_TV_ASSET_UUID_REGEX.test(id)) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-black text-sm text-white/80">
        Invalid video id
      </div>
    );
  }

  return <DiscoverEmbedPlayer assetId={id} />;
}
