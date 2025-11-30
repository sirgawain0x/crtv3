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
import { VideoCommentsWrapper } from "@/components/Videos/VideoCommentsWrapper";
import { Metadata } from "next";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { shortenAddress } from "@/lib/utils/utils";
import { createClient } from "@/lib/sdk/supabase/server";
import makeBlockie from "ethereum-blockies-base64";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  // Get video asset from database to access creator_id
  let videoAsset = null;
  try {
    videoAsset = await getVideoAssetByAssetId(id);
  } catch (error) {
    console.error("Error fetching video asset from database:", error);
    // Continue with null videoAsset - page can still render with assetData
  }
  const creatorAddress = videoAsset?.creator_id || null;

  // Fetch creator profile for avatar
  let creatorProfile = null;
  if (creatorAddress) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('avatar_url, username')
        .eq('owner_address', creatorAddress.toLowerCase())
        .single();
      
      if (error) {
        // PGRST116 means no rows found - this is acceptable (profile doesn't exist)
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, that's okay
          creatorProfile = null;
        } else {
          // Real database error - log it
          console.error('Error fetching creator profile:', error);
          creatorProfile = null;
        }
      } else {
        creatorProfile = data;
      }
    } catch (error) {
      // Handle unexpected errors (network failures, etc.)
      console.error('Unexpected error fetching creator profile:', error);
      creatorProfile = null;
    }
  }

  return (
    <div className="container max-w-7xl mx-auto px-4">
      <div className="my-5">
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Video Player */}
          <div>
            <VideoDetails asset={assetData} />
            {/* Uploader Section */}
            {creatorAddress && (
              <div className="flex items-center gap-3 mt-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={creatorProfile?.avatar_url || makeBlockie(creatorAddress)} 
                    alt={creatorProfile?.username || "Creator"} 
                  />
                  <AvatarFallback>
                    {creatorProfile?.username 
                      ? creatorProfile.username.charAt(0).toUpperCase() 
                      : creatorAddress.slice(2, 3).toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {creatorProfile?.username || "Creator"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {shortenAddress(creatorAddress)}
                  </span>
                </div>
              </div>
            )}
            {/* Metrics components */}
            {assetData.playbackId && (
              <div className="flex gap-4 items-center mt-4">
                {/* <ViewsComponent playbackId={assetData.playbackId} /> */}
                <VideoViewMetrics playbackId={assetData.playbackId} />
              </div>
            )}
            {/* Description */}
            {videoAsset?.description && (
              <div className="mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {videoAsset.description}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Comments Section - Below video like YouTube */}
          {videoAsset && (
            <div className="mt-8">
              <VideoCommentsWrapper 
                videoAssetId={videoAsset.id}
                videoName={assetData?.name || videoAsset.title || "this video"}
                creatorAddress={creatorAddress}
              />
            </div>
          )}
        </div>
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

    // Get thumbnail from database or use fallback
    let thumbnailUrl = 
      (videoAsset as any)?.thumbnail_url || 
      (asset.asset as any)?.thumbnailUri || 
      "/Creative_TV.png";

    // Apply gateway conversion for IPFS URLs (consistent with ShareDialog)
    thumbnailUrl = convertFailingGateway(thumbnailUrl);

    // Construct absolute URL for Open Graph
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    "https://tv.creativeplatform.xyz");
    const absoluteUrl = `${baseUrl}/discover/${id}`;
    
    // Construct absolute thumbnail URL with proper path joining
    let absoluteThumbnailUrl: string;
    if (thumbnailUrl.startsWith("http://") || thumbnailUrl.startsWith("https://")) {
      // Already an absolute URL, use as-is
      absoluteThumbnailUrl = thumbnailUrl;
    } else {
      // Relative URL - ensure proper path joining
      const normalizedPath = thumbnailUrl.startsWith("/") 
        ? thumbnailUrl 
        : `/${thumbnailUrl}`;
      absoluteThumbnailUrl = `${baseUrl}${normalizedPath}`;
    }

    // Use consistent fallback for asset name
    const assetName = asset.asset.name ?? "Watch Video";
    
    // Use nullish coalescing to preserve empty strings (only replace null/undefined)
    const videoDescription = (videoAsset as any)?.description ?? `Watch ${assetName} on Creative TV`;
    
    return {
      title: assetName,
      description: videoDescription,
      openGraph: {
        title: assetName,
        description: videoDescription,
        images: [absoluteThumbnailUrl],
        url: absoluteUrl,
        type: "video.other",
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
      twitter: {
        card: "summary_large_image",
        title: assetName,
        description: videoDescription,
        images: [absoluteThumbnailUrl],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return { title: "Video Not Found" };
  }
}
