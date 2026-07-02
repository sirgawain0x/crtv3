"use client";

import Link from "next/link";
import { useUser } from "@/lib/wallet/react";
import { useSongCupSubmissions } from "@/lib/hooks/song-cup/useSongCupSubmissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, ExternalLink, RefreshCw, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  SONG_CUP_ADMIN_WALLETS,
  truncateWalletAddress,
} from "@/lib/songchain/song-cup/admin-config";
import { resolveOrbMediaUrl } from "@/lib/sdk/orb/media";

export default function SongCupSubmissionsPage() {
  const user = useUser();

  const { submissions, isLoading, error, refetch, updateStatus, isAdmin } =
    useSongCupSubmissions(true);

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Song Cup Submissions</h1>
            <p className="text-sm text-muted-foreground">
              Videos uploaded through the Song Cup Grove/IPFS flow.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {!isAdmin && (
          <Card className="border-yellow-500/30 bg-yellow-950/20">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              <div className="space-y-1">
                <p className="font-medium">Admin access only</p>
                <p className="text-sm text-muted-foreground">
                  Connect an admin wallet ({SONG_CUP_ADMIN_WALLETS.map(truncateWalletAddress).join(" or ")}) to view submissions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && error && (
          <Card className="border-red-500/30 bg-red-950/20">
            <CardContent className="py-4 text-sm text-red-400">{error}</CardContent>
          </Card>
        )}

        {isAdmin && isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        )}

        {isAdmin && !isLoading && submissions.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No submissions yet.
            </CardContent>
          </Card>
        )}

        {isAdmin && !isLoading && submissions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submissions.map((submission) => (
              <Card key={submission.id} className="flex flex-col overflow-hidden">
                <div className="flex aspect-video items-center justify-center bg-muted overflow-hidden">
                  {submission.grove_url ? (
                    <video
                      src={
                        resolveOrbMediaUrl(submission.grove_url, { type: "video" }) ??
                        submission.grove_url
                      }
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Film className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {submission.title || "Untitled submission"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>From: {truncateWalletAddress(submission.wallet_address)}</p>
                    <p>{formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}</p>
                  </div>

                  {submission.description && (
                    <p className="line-clamp-2 text-sm">{submission.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        submission.status === "approved"
                          ? "default"
                          : submission.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {submission.status}
                    </Badge>
                    <Button variant="outline" size="sm" className="gap-1.5 px-2 py-1 text-xs" asChild>
                      <Link href={submission.grove_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Link>
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs"
                      onClick={() => void updateStatus(submission.id, "approved")}
                      disabled={submission.status === "approved"}
                    >
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-xs"
                      onClick={() => void updateStatus(submission.id, "rejected")}
                      disabled={submission.status === "rejected"}
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
