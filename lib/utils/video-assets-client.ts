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
      
      // Check if response is JSON before trying to parse
      const contentType = response.headers.get("content-type");
      let errorMessage = `Failed to fetch video asset (${response.status} ${response.statusText})`;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (parseError) {
          // JSON parsing failed, use default error message
          console.warn("Failed to parse error response as JSON:", parseError);
        }
      } else {
        // Response is not JSON (likely HTML error page from Cloudflare/Supabase)
        try {
          const text = await response.text();
          // Try to extract meaningful error info from HTML if possible
          if (text.includes("500") || text.includes("Internal server error")) {
            errorMessage = "Supabase server error (500). Please try again in a few minutes.";
          } else if (text.includes("502") || text.includes("Bad Gateway")) {
            errorMessage = "Supabase service temporarily unavailable. Please try again later.";
          } else if (text.includes("503") || text.includes("Service Unavailable")) {
            errorMessage = "Supabase service is temporarily unavailable. Please try again later.";
          }
        } catch (textError) {
          // Failed to read response text, use default error message
          console.warn("Failed to read error response text:", textError);
        }
      }
      
      throw new Error(errorMessage);
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
      
      // Check if response is JSON before trying to parse
      const contentType = response.headers.get("content-type");
      let errorMessage = `Failed to fetch video asset (${response.status} ${response.statusText})`;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (parseError) {
          // JSON parsing failed, use default error message
          console.warn("Failed to parse error response as JSON:", parseError);
        }
      } else {
        // Response is not JSON (likely HTML error page from Cloudflare/Supabase)
        try {
          const text = await response.text();
          // Try to extract meaningful error info from HTML if possible
          if (text.includes("500") || text.includes("Internal server error")) {
            errorMessage = "Supabase server error (500). Please try again in a few minutes.";
          } else if (text.includes("502") || text.includes("Bad Gateway")) {
            errorMessage = "Supabase service temporarily unavailable. Please try again later.";
          } else if (text.includes("503") || text.includes("Service Unavailable")) {
            errorMessage = "Supabase service is temporarily unavailable. Please try again later.";
          }
        } catch (textError) {
          // Failed to read response text, use default error message
          console.warn("Failed to read error response text:", textError);
        }
      }
      
      throw new Error(errorMessage);
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
      
      // Check if response is JSON before trying to parse
      const contentType = response.headers.get("content-type");
      let errorMessage = `Failed to fetch video asset (${response.status} ${response.statusText})`;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (parseError) {
          // JSON parsing failed, use default error message
          console.warn("Failed to parse error response as JSON:", parseError);
        }
      } else {
        // Response is not JSON (likely HTML error page from Cloudflare/Supabase)
        try {
          const text = await response.text();
          // Try to extract meaningful error info from HTML if possible
          if (text.includes("500") || text.includes("Internal server error")) {
            errorMessage = "Supabase server error (500). Please try again in a few minutes.";
          } else if (text.includes("502") || text.includes("Bad Gateway")) {
            errorMessage = "Supabase service temporarily unavailable. Please try again later.";
          } else if (text.includes("503") || text.includes("Service Unavailable")) {
            errorMessage = "Supabase service is temporarily unavailable. Please try again later.";
          }
        } catch (textError) {
          // Failed to read response text, use default error message
          console.warn("Failed to read error response text:", textError);
        }
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetchVideoAssetById] Error fetching asset:`, error);
    throw error;
  }
}

