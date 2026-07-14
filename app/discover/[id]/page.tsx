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
import VideoViewMetrics from "@/components/Videos/VideoViewMetrics";
import { VideoCommentsWrapper } from "@/components/Videos/VideoCommentsWrapper";
import { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Suspense } from "react";
import { VideoShareButton } from "@/components/Videos/VideoShareButton";
import { VideoBuyButton } from "@/components/Videos/VideoBuyButton";
import { BuyIPButton } from "@/components/Videos/BuyIPButton";
import { CreatorMessageButton } from "@/components/Videos/CreatorMessageButton";
import { VideoEditButton } from "@/components/Videos/VideoEditButton";
import { VideoSplitDistributeButton } from "@/components/Videos/VideoSplitDistributeButton";
import { RemixInPixelsButton } from "@/components/Videos/RemixInPixelsButton";
import { AddToMixtapeButton } from "@/components/Videos/AddToMixtapeButton";
import { logger } from '@/lib/utils/logger';
import {
  getSiteOrigin,
  getVideoOgImageUrl,
  VIDEO_OG_IMAGE,
} from "@/lib/utils/og-image";

type VideoDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type VideoAssetRow = Awaited<ReturnType<typeof getVideoAssetByAssetId>>;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assetFromVideoRow(
  videoAsset: NonNullable<VideoAssetRow>,
  assetId: string,
): Asset {
  return {
    id: videoAsset.asset_id || assetId,
    name: videoAsset.title || "Video",
    playbackId: videoAsset.playback_id || undefined,
  } as Asset;
}

async function loadVideoPageData(id: string): Promise<{
  assetData: Asset | null;
  videoAsset: VideoAssetRow | null;
}> {
  if (!UUID_REGEX.test(id)) {
    logger.error("Invalid video asset ID format:", id);
    return { assetData: null, videoAsset: null };
  }

  // Isolate Neon from Livepeer so a Livepeer outage cannot wipe a valid DB row.
  const [dbResult, livepeerResult] = await Promise.allSettled([
    getVideoAssetByAssetId(id),
    fetchAssetId(id),
  ]);

  const videoAsset =
    dbResult.status === "fulfilled" ? dbResult.value : null;
  if (dbResult.status === "rejected") {
    logger.error("Error fetching video asset from database:", dbResult.reason);
  }

  let assetData: Asset | null = null;
  if (livepeerResult.status === "fulfilled") {
    assetData = livepeerResult.value?.asset ?? null;
  } else {
    logger.error("Error fetching Livepeer asset:", livepeerResult.reason);
  }

  if (!videoAsset) {
    logger.error("Video asset not found in database");
    return { assetData: null, videoAsset: null };
  }

  if (!assetData) {
    assetData = assetFromVideoRow(videoAsset, id);
  }

  return { assetData, videoAsset };
}

export default async function VideoDetailsPage({
  params,
}: VideoDetailsPageProps) {
  const { id } = await params;
  const { assetData, videoAsset } = await loadVideoPageData(id);

  if (!videoAsset || !assetData) {
    return <div>Asset not found</div>;
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
          <div>
            <VideoDetails
              asset={assetData}
              videoTitle={videoAsset?.title || assetData?.name}
              creatorAddress={creatorAddress}
              livepeerAttestationId={videoAsset?.livepeer_attestation_id ?? null}
              storyIpRegistered={videoAsset?.story_ip_registered ?? false}
              storyIpId={videoAsset?.story_ip_id ?? null}
              storyLicenseTermsId={videoAsset?.story_license_terms_id ?? null}
              contractAddress={videoAsset?.contract_address ?? null}
              tokenId={videoAsset?.token_id ?? null}
            />
            {/* Views (left) + actions/share (right) */}
            <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
              <div className="flex items-center min-h-4">
                {assetData.playbackId && (
                  <VideoViewMetrics playbackId={assetData.playbackId} />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
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
                {creatorAddress &&
                  videoAsset?.attributes?.content_coin_id && (
                    <Suspense fallback={<div className="h-9 w-9" />}>
                      <CreatorMessageButton
                        creatorAddress={creatorAddress}
                        meTokenAddress={
                          videoAsset.attributes.content_coin_id as string
                        }
                      />
                    </Suspense>
                  )}
                {videoAsset?.story_ip_registered &&
                  videoAsset?.story_ip_id &&
                  videoAsset?.story_license_terms_id && (
                    <Suspense fallback={<div className="h-9 w-9" />}>
                      <BuyIPButton
                        ipId={videoAsset.story_ip_id}
                        licenseTermsId={String(videoAsset.story_license_terms_id)}
                        videoTitle={videoAsset?.title || assetData?.name || "Video"}
                      />
                    </Suspense>
                  )}
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

    if (!UUID_REGEX.test(id)) {
      logger.error("Invalid video asset ID format for metadata:", id);
      return { title: "Video Not Found" };
    }

    const { assetData, videoAsset } = await loadVideoPageData(id);

    if (!videoAsset || !assetData) {
      return { title: "Video Not Found" };
    }

    const baseUrl = getSiteOrigin();
    const absoluteUrl = `${baseUrl}/discover/${id}`;

    // Use the direct thumbnail URL when available (works for SMS, Twitter, etc).
    // Fall back to the same-origin proxy for crawlers that need same-origin images.
    const directThumb = (videoAsset as any)?.thumbnail_url;
    const proxyUrl = getVideoOgImageUrl({ id });
    const ogImageUrl = directThumb || proxyUrl;

    let videoTitle = (videoAsset as any)?.title || assetData.name || "Watch Video";
    if (videoTitle.endsWith('.mp4')) {
      videoTitle = videoTitle.slice(0, -4);
    }

    const videoDescription = (videoAsset as any)?.description ?? `Watch ${videoTitle} on Creative TV`;

    const ogImage = {
      url: ogImageUrl,
      width: VIDEO_OG_IMAGE.width,
      height: VIDEO_OG_IMAGE.height,
      alt: videoTitle || VIDEO_OG_IMAGE.alt,
      type: VIDEO_OG_IMAGE.type,
    };

    return {
      title: videoTitle,
      description: videoDescription,
      openGraph: {
        title: videoTitle,
        description: videoDescription,
        images: [ogImage],
        url: absoluteUrl,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: videoTitle,
        description: videoDescription,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    logger.error("Error generating metadata:", error);
    return { title: "Video Not Found" };
  }
}
