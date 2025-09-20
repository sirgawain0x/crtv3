import { Asset } from "livepeer/models/components";
import VideoDetails from "@/components/Videos/VideoDetails";
import { fetchAssetId } from "@/app/api/livepeer/actions";
import { getVideoAssetByAssetId } from "@/services/video-assets";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
// import { ViewsComponent } from "@/components/Player/ViewsComponent";
import VideoViewMetrics from "@/components/Videos/VideoViewMetrics";
import { Metadata } from "next";

type VideoDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const fetchAssetData = async (id: string): Promise<Asset | null> => {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      console.error("Invalid video asset ID format:", id);
      return null;
    }

    // First, get the video asset from NeonDB using the asset_id (UUID)
    const videoAsset = await getVideoAssetByAssetId(id);
    
    if (!videoAsset) {
      console.error("Video asset not found in database");
      return null;
    }

    // Then, fetch the Livepeer asset using the same asset_id
    const response = await fetchAssetId(id);

    if (response?.asset) {
      return response.asset;
    }

    return null;
  } catch (error) {
    console.error("Error fetching asset:", error);
    return null;
  }
};

export default async function VideoDetailsPage({
  params,
}: VideoDetailsPageProps) {
  const { id } = await params;
  const assetData: Asset | null = await fetchAssetData(id);

  if (!assetData) {
    return <div>Asset not found</div>;
  }

  return (
    <div className="container max-w-7xl content-center">
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <span role="img" aria-label="home">
                  🏠
                </span>{" "}
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/discover">Discover</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <BreadcrumbPage>{assetData?.name}</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="py-10">
        <VideoDetails asset={assetData} />
        {/* Metrics components */}
        {assetData.playbackId && (
          <div className="flex gap-4 items-center mb-6">
            {/* <ViewsComponent playbackId={assetData.playbackId} /> */}
            <VideoViewMetrics playbackId={assetData.playbackId} />
          </div>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      console.error("Invalid video asset ID format for metadata:", id);
      return { title: "Video Not Found" };
    }
    
    // First, get the video asset from NeonDB using the asset_id (UUID)
    const videoAsset = await getVideoAssetByAssetId(id);
    
    if (!videoAsset) {
      return { title: "Video Not Found" };
    }

    // Then, fetch the Livepeer asset using the same asset_id
    const asset = await fetchAssetId(id);
    
    if (!asset?.asset) return { title: "Video Not Found" };

    return {
      title: asset.asset.name ?? "Watch Video",
      openGraph: {
        title: asset.asset.name,
        images: [(asset.asset as any).thumbnailUri || "/default-thumbnail.webp"],
        videos: asset.asset.playbackUrl
          ? [
              {
                url: asset.asset.playbackUrl,
                type: "video/mp4",
                width: 1280,
                height: 720,
              },
            ]
          : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return { title: "Video Not Found" };
  }
}
