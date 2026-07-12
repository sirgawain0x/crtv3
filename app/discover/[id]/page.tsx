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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Suspense } from "react";
import { VideoShareButton } from "@/components/Videos/VideoShareButton";
import { VideoBuyButton } from "@/components/Videos/VideoBuyButton";
import { VideoEditButton } from "@/components/Videos/VideoEditButton";
import { VideoSplitDistributeButton } from "@/components/Videos/VideoSplitDistributeButton";
import { RemixInPixelsButton } from "@/components/Videos/RemixInPixelsButton";
import { AddToMixtapeButton } from "@/components/Videos/AddToMixtapeButton";
import { CreatorDisplay } from "@/components/Creator/CreatorDisplay";
import { logger } from '@/lib/utils/logger';
import { convertFailingGateway } from "@/lib/utils/image-gateway";

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
      logger.error("Invalid video asset ID format:", id);
      return null;
    }

    // First, get the video asset from NeonDB using the asset_id (UUID)
    const videoAsset = await getVideoAssetByAssetId(id);

    if (!videoAsset) {
      logger.error("Video asset not found in database");
      return null;
    }

    // Then, fetch the Livepeer asset using the same asset_id
    const response = await fetchAssetId(id);

    if (response?.asset) {
      return response.asset;
    }

    return null;
  } catch (error) {
    logger.error("Error fetching asset:", error);
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
    logger.error("Error fetching video asset from database:", error);
    // Continue with null videoAsset - page can still render with assetData
  }
  const creatorAddress = videoAsset?.creator_id || null;

  return (
    <div className="container max-w-7xl mx-auto px-4">
      <div className="my-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">
                  <span role="img" aria-label="home">
                    🏠
                  </span>{" "}
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/discover">Discover</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <BreadcrumbPage>{videoAsset?.title || assetData?.name}</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Creator above title; action buttons stay under the player */}
          {creatorAddress && (
            <CreatorDisplay creatorAddress={creatorAddress} />
          )}

          {/* Video Player (includes title above player) */}
          <div>
            <VideoDetails
              asset={assetData}
              videoTitle={videoAsset?.title || assetData?.name}
              livepeerAttestationId={videoAsset?.livepeer_attestation_id ?? null}
              storyIpRegistered={videoAsset?.story_ip_registered ?? false}
              storyIpId={videoAsset?.story_ip_id ?? null}
              storyLicenseTermsId={videoAsset?.story_license_terms_id ?? null}
              contractAddress={videoAsset?.contract_address ?? null}
              tokenId={videoAsset?.token_id ?? null}
            />
            {/* Action row: buy / edit / mixtape / share (avatar moved above title) */}
            <div className="flex items-center justify-end mt-4">
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {creatorAddress && (
                  <>
                    <Suspense fallback={<div className="h-9 w-9" />}>
                      <VideoEditButton
                        videoAssetId={id}
                        creatorId={creatorAddress}
                      />
                    </Suspense>
                    <Suspense fallback={<div className="h-9 w-9" />}>
                      <VideoSplitDistributeButton
                        videoAssetId={id}
                        creatorId={creatorAddress}
                        splitsAddress={videoAsset?.splits_address || null}
                      />
                    </Suspense>
                  </>
                )}
                <Suspense fallback={<div className="h-9 w-9" />}>
                  {assetData?.playbackId && (
                    <VideoBuyButton
                      playbackId={assetData.playbackId}
                      videoTitle={videoAsset?.title || assetData?.name || "Video"}
                    />
                  )}
                </Suspense>
                <Suspense fallback={<div className="h-9 w-9" />}>
                  <AddToMixtapeButton
                    assetId={id}
                    videoTitle={videoAsset?.title || assetData?.name || "Video"}
                    playbackId={assetData?.playbackId || undefined}
                  />
                </Suspense>
                {videoAsset?.story_ip_registered && videoAsset?.story_license_terms_id && (
                  <Suspense fallback={<div className="h-9 w-9" />}>
                    <RemixInPixelsButton />
                  </Suspense>
                )}
                <Suspense fallback={<div className="h-9 w-9" />}>
                  <VideoShareButton
                    videoId={id}
                    videoTitle={videoAsset?.title || "Video"}
                    playbackId={assetData?.playbackId || undefined}
                  />
                </Suspense>
              </div>
            </div>
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
                videoName={videoAsset.title || assetData?.name || "this video"}
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
      logger.error("Invalid video asset ID format for metadata:", id);
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
      (videoAsset as any)?.thumbnail_url?.trim() ||
      (asset.asset as any)?.thumbnailUri?.trim() ||
      null;

    // If no thumbnail or empty string, use default image
    if (!thumbnailUrl || thumbnailUrl === "") {
      thumbnailUrl = "/Creative_TV.png";
    } else {
      // Apply gateway conversion for IPFS URLs (consistent with ShareDialog)
      thumbnailUrl = convertFailingGateway(thumbnailUrl);
    }

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

    // Use database title (from video_assets table) instead of asset name
    // Remove .mp4 extension if present
    let videoTitle = (videoAsset as any)?.title || asset.asset.name || "Watch Video";
    if (videoTitle.endsWith('.mp4')) {
      videoTitle = videoTitle.slice(0, -4);
    }

    // Use nullish coalescing to preserve empty strings (only replace null/undefined)
    const videoDescription = (videoAsset as any)?.description ?? `Watch ${videoTitle} on Creative TV`;

    return {
      title: videoTitle,
      description: videoDescription,
      openGraph: {
        title: videoTitle,
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
        title: videoTitle,
        description: videoDescription,
        images: [absoluteThumbnailUrl],
      },
    };
  } catch (error) {
    logger.error("Error generating metadata:", error);
    return { title: "Video Not Found" };
  }
}
