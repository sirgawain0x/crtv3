/**
 * Client-side utilities for fetching video assets
 * These functions can be safely called from client components
 */

export interface VideoAssetResponse {
  id?: number;
  status?: string;
  thumbnail_url?: string;
  // Add other fields as needed
  [key: string]: any;
}

/**
 * Fetch video asset by playback ID (client-safe)
 */
export async function fetchVideoAssetByPlaybackId(
  playbackId: string
): Promise<VideoAssetResponse | null> {
  try {
    const response = await fetch(
      `/api/video-assets/by-playback-id/${playbackId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.details || errorData.error || "Failed to fetch video asset"
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      `[fetchVideoAssetByPlaybackId] Error fetching asset:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch video asset by asset ID (client-safe)
 */
export async function fetchVideoAssetByAssetId(
  assetId: string
): Promise<VideoAssetResponse | null> {
  try {
    const response = await fetch(`/api/video-assets/by-asset-id/${assetId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.details || errorData.error || "Failed to fetch video asset"
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetchVideoAssetByAssetId] Error fetching asset:`, error);
    throw error;
  }
}

/**
 * Fetch video asset by database ID (client-safe)
 */
export async function fetchVideoAssetById(
  id: number
): Promise<VideoAssetResponse | null> {
  try {
    const response = await fetch(`/api/video-assets/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json();
      throw new Error(
        errorData.details || errorData.error || "Failed to fetch video asset"
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetchVideoAssetById] Error fetching asset:`, error);
    throw error;
  }
}

