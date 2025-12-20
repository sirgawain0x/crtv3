import { useContentCoin } from '@/lib/hooks/marketplace/useContentCoin';
import { updateVideoAsset } from '@/services/video-assets';
import { fetchVideoAssetByPlaybackId } from '@/lib/utils/video-assets-client';

/**
 * Hook wrapper around deployment to be used in upload forms.
 * Can be integrated into the VideoUpload component's "onSuccess" callback.
 */
export function useAutoDeployContentCoin() {
    const { deployContentCoin } = useContentCoin();

    const handleUploadSuccess = async (videoTitle: string, symbol: string, creatorMeToken: string, creatorAddress: string, playbackId?: string) => {
        try {
            console.log("Auto-deploying Content Coin for:", videoTitle);
            const deployTx = await deployContentCoin(videoTitle, symbol, creatorMeToken, creatorAddress);
            console.log("Content Coin Deployment Initiated:", deployTx);

            if (playbackId && typeof deployTx === 'string') {
                // Fetch the video asset ID first
                const videoAsset = await fetchVideoAssetByPlaybackId(playbackId);

                if (videoAsset && videoAsset.id) {
                    console.log("Saving Content Coin ID to video asset:", videoAsset.id);
                    // Use server action to update the asset
                    await updateVideoAsset(videoAsset.id, {
                        thumbnailUri: videoAsset.thumbnail_url || '',
                        status: videoAsset.status || 'draft',
                        attributes: {
                            content_coin_id: deployTx
                        }
                    });
                    console.log("Content Coin ID saved successfully");
                }
            }

            return deployTx;
        } catch (e) {
            console.error("Auto-deploy failed:", e);
            // Don't block upload success UI
        }
    };

    return { handleUploadSuccess };
}
