import * as helpers from "@/lib/helpers";
import Link from "next/link";
import type { VideoAsset } from "@/lib/types/video-asset";
import type { Account } from "@/lib/types/account";

interface UploadAssetRowProps {
  idx: number;
  activeAccount: Account;
  asset: VideoAsset;
}

export function UploadAssetRow({
  idx,
  activeAccount,
  asset,
}: UploadAssetRowProps) {
  if (!activeAccount) return null;

  return (
    <tr key={asset.asset_id} className="text-[16px] hover:bg-muted/50">
      <td className="border border-slate-700 px-4 py-1">{idx + 1}</td>
      <td className="border border-slate-700 px-4 py-1">
        <Link
          href={`/discover/${asset.asset_id}`}
          className="text-primary hover:text-primary/80 hover:underline"
        >
          {helpers.titleCase(
            asset.title.length > 12 ? asset.title.slice(0, 9) + "..." : asset.title
          )}
        </Link>
      </td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.parseTimestampToDate(new Date(asset.created_at).getTime())}
      </td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.parseTimestampToDate(new Date(asset.updated_at).getTime())}
      </td>
    </tr>
  );
}

// --- static content and interfaces ---

// If you need to export the interface for use elsewhere:
