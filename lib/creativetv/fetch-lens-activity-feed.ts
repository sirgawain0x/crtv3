import { fetchPosts } from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/types";
import { createLensClient } from "@/lib/sdk/lens/create-client";
import { CREATIVE_TV_LENS_PUBLIC_FEED_ID } from "@/lib/lens/creativetv";
import { normalizeFeedPosts } from "@/lib/songchain/post-utils";
import type { CreativeTVLensActivityResult } from "@/lib/creativetv/lens-activity-types";
import { serializeLensActivityPosts } from "@/lib/creativetv/serialize-lens-activity";

const DEFAULT_LIMIT = 12;

export async function fetchCreativeTVLensActivityFeed(
  limit = DEFAULT_LIMIT,
): Promise<CreativeTVLensActivityResult> {
  const apiKey = process.env.LENS_SERVER_API_KEY?.trim();
  if (!apiKey) {
    return { items: [], skipStrip: true };
  }

  const client = createLensClient(apiKey);
  const feed = evmAddress(CREATIVE_TV_LENS_PUBLIC_FEED_ID);

  try {
    const result = await fetchPosts(client, {
      filter: {
        feeds: [{ feed }],
      },
    });

    if (result.isErr()) {
      return { items: [], skipStrip: true };
    }

    const normalized = normalizeFeedPosts(result.value.items).slice(0, limit);
    return {
      items: serializeLensActivityPosts(normalized),
      skipStrip: false,
    };
  } catch {
    return { items: [], skipStrip: true };
  }
}
