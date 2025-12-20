"use client";

import { useEffect, useState } from "react";
import type { Account } from "@/lib/types/account";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadAssetRow } from "./UploadedAsset";
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
      <div className="flex h-40 items-center justify-center">
        <Skeleton className="h-8 w-1/2" />
      </div>
    );

  if (assets.length === 0 && !isLoading)
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">No videos uploaded yet</p>
      </div>
    );

  return (
    <div className="relative overflow-x-auto rounded-lg border">
      <table
        className="w-full table-auto divide-y divide-border"
        role="grid"
        aria-label="Uploaded Assets"
      >
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              S/No.
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Created
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map((asset, i) => (
            <UploadAssetRow
              key={`${asset.asset_id}-${asset.created_at}`}
              asset={asset}
              idx={i}
              activeAccount={activeAccount}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
