import { Metadata, ResolvingMetadata } from "next";
import { getVideoAssetByPlaybackId } from "@/services/video-assets";
import { getTokenMarketData } from "@/lib/services/market";
import WatchClient from "./WatchClient";

interface WatchPageProps {
    params: Promise<{
        playbackId: string;
    }>;
}

export async function generateMetadata(
    { params }: WatchPageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { playbackId } = await params;

    // 1. Fetch Video Asset
    const videoAsset = await getVideoAssetByPlaybackId(playbackId);
    const tokenAddress = videoAsset?.attributes?.content_coin_id;

    // Defaults
    const title = videoAsset?.title || "Live Stream";
    const desc = "Watch on Creative TV";

    if (!tokenAddress) {
        return {
            title: videoAsset?.title ? `Watch ${title}` : 'Watch Live',
            description: desc,
        };
    }

    // 2. Fetch Market Data if token exists
    const marketData = await getTokenMarketData(tokenAddress);

    if (marketData) {
        const price = `$${marketData.price.toFixed(4)}`;
        const tvl = marketData.tvl >= 1000
            ? `$${(marketData.tvl / 1000).toFixed(1)}K`
            : `$${marketData.tvl.toFixed(2)}`;

        const metaTitle = `${marketData.symbol} ($${price}) - ${title}`;
        const metaDesc = `Watch & Trade ${marketData.symbol}. TVL: ${tvl}. ${desc}`;

        return {
            title: metaTitle,
            description: metaDesc,
            openGraph: {
                title: metaTitle,
                description: metaDesc,
                images: videoAsset?.thumbnail_url ? [videoAsset.thumbnail_url] : [],
            },
            twitter: {
                card: "summary_large_image",
                title: metaTitle,
                description: metaDesc,
                images: videoAsset?.thumbnail_url ? [videoAsset.thumbnail_url] : [],
            }
        };
    }

    return {
        title: `Watch ${title}`,
        description: desc,
    };
}

export default async function WatchPage({ params }: WatchPageProps) {
    const { playbackId } = await params;

    // Fetch data for the client component
    // Note: We're fetching twice (metadata + page). Next.js request deduping works for fetch(), 
    // but these are DB calls. Optimization would be to cache this or use React's cache(), 
    // but for now this is acceptable given the scope.
    const videoAsset = await getVideoAssetByPlaybackId(playbackId);
    const tokenAddress = videoAsset?.attributes?.content_coin_id;

    let marketData = null;
    let tokenInfo = null;

    if (tokenAddress) {
        marketData = await getTokenMarketData(tokenAddress);
        if (marketData) {
            tokenInfo = {
                address: tokenAddress,
                symbol: marketData.symbol,
                name: marketData.name
            };
        }
    }

    return (
        <WatchClient
            initialMarketData={marketData}
            tokenInfo={tokenInfo}
            videoTitle={videoAsset?.title}
        />
    );
}
