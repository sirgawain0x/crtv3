"use server";

import { unstable_cache } from "next/cache";
import {
  fetchDearCreativePublicStats,
  fetchRecentDearCreativePosts,
  filterMusicDearCreativePosts,
} from "@/lib/dear-creative/feed";
import { getDearCreativeOrigin } from "@/lib/dear-creative/origin";
import type { DearCreativePost } from "@/lib/dear-creative/types";
import { serverLogger } from "@/lib/utils/logger";

const CACHE_SECONDS = 300;

const getCachedRecentPosts = unstable_cache(
  async (origin: string, limit: number) =>
    fetchRecentDearCreativePosts(origin, limit),
  ["dear-creative-recent-posts"],
  { revalidate: CACHE_SECONDS, tags: ["dear-creative-feed"] },
);

const getCachedPublicStats = unstable_cache(
  async (origin: string) => fetchDearCreativePublicStats(origin),
  ["dear-creative-public-stats"],
  { revalidate: CACHE_SECONDS, tags: ["dear-creative-stats"] },
);

export async function getDearCreativeRecentPosts(
  limit = 6,
): Promise<DearCreativePost[]> {
  try {
    const origin = getDearCreativeOrigin();
    return await getCachedRecentPosts(origin, limit);
  } catch (error) {
    serverLogger.error("Error fetching Dear Creative posts:", error);
    return [];
  }
}

export async function getDearCreativeActiveSubscriberCount(): Promise<number | null> {
  try {
    const origin = getDearCreativeOrigin();
    const stats = await getCachedPublicStats(origin);
    return stats?.activeSubscriberCount ?? null;
  } catch (error) {
    serverLogger.error("Error fetching Dear Creative stats:", error);
    return null;
  }
}

export async function getDearCreativeMusicPosts(limit = 24): Promise<DearCreativePost[]> {
  const posts = await getDearCreativeRecentPosts(limit);
  return filterMusicDearCreativePosts(posts);
}

export async function getDearCreativeOriginForClient(): Promise<string> {
  return getDearCreativeOrigin();
}
