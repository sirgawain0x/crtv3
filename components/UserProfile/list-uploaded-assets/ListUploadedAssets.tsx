"use client";

import { useEffect, useState } from "react";
import type { Account } from "@/lib/types/account";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { UploadHistoryCard } from "./UploadHistoryCard";
import type { VideoAsset } from "@/lib/types/video-asset";
import { fetchPublishedVideos } from "@/lib/utils/published-videos-client";

interface ListUploadedAssetsProps {
  activeAccount: Account;
}

export function ListUploadedAssets({ activeAccount }: ListUploadedAssetsProps) {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(function fetchAssetsOnMount() {
    async function fetchAssets() {
      if (!activeAccount?.address) return;
      
      setIsLoading(true);
      setError(null);
      try {
        // Use the same approach as the discover page - fetch from Supabase with creatorId filter
        const { data } = await fetchPublishedVideos({
          creatorId: activeAccount.address,
          orderBy: 'created_at',
          order: 'desc',
          limit: 100, // Get more assets for the history view
        });
        setAssets(data || []);
      } catch (err) {
        setError("Failed to load assets. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, [activeAccount?.address]);

  if (error)
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );

  if (assets.length === 0 && !isLoading)
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No videos uploaded yet</p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {assets.map((asset, index) => (
        <UploadHistoryCard
          key={`${asset.asset_id}-${asset.created_at}`}
          asset={asset}
          index={index}
        />
      ))}
    </div>
  );
}
