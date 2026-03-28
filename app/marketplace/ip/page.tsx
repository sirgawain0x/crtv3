import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import { getVideoAssetsWithStoryIP } from "@/services/video-assets";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import type { VideoAsset } from "@/lib/types/video-asset";

const STORY_SCAN_IP_BASE =
  process.env.NEXT_PUBLIC_STORY_NETWORK === "mainnet"
    ? "https://www.storyscan.io"
    : "https://aeneid.storyscan.io";

function MarketplaceIPCard({ asset }: { asset: VideoAsset }) {
  const thumbnailUrl =
    (asset as unknown as { thumbnail_url?: string }).thumbnail_url ??
    asset.thumbnailUri;
  const imgSrc = thumbnailUrl
    ? convertFailingGateway(thumbnailUrl)
    : "/Creative_TV.png";

  return (
    <article className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/discover/${asset.asset_id}`} className="block aspect-video">
        <img
          src={imgSrc}
          alt={asset.title}
          className="w-full h-full object-cover"
        />
      </Link>
      <div className="p-3 space-y-2">
        <Link
          href={`/discover/${asset.asset_id}`}
          className="font-medium line-clamp-2 hover:text-primary hover:underline"
        >
          {asset.title}
        </Link>
        {asset.story_ip_id && (
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href={`${STORY_SCAN_IP_BASE}/ip/${asset.story_ip_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on Story →
            </a>
            <Link href={`/discover/${asset.asset_id}`} className="text-muted-foreground hover:underline">
              Watch video →
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

export default async function MarketplaceIPPage() {
  const { data: assets } = await getVideoAssetsWithStoryIP({
    limit: 48,
    orderBy: "story_ip_registered_at",
    order: "desc",
  });

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="my-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/marketplace">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>IP Assets</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Creative TV IP Marketplace</h1>
        <p className="text-muted-foreground">
          Videos registered as IP Assets on Story Protocol. View on Story or open the video to purchase.
        </p>
      </div>

      {assets.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          No IP assets listed yet. Register your video as IP on Story Protocol to appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <MarketplaceIPCard key={asset.asset_id} asset={asset as VideoAsset} />
          ))}
        </div>
      )}
    </div>
  );
}
