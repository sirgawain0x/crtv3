import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash, Video } from "lucide-react";
import { createClient } from "@/lib/sdk/supabase/server";
import { getPublishedVideoAssets } from "@/services/video-assets";
import VideoCardGrid from "@/components/Videos/VideoCardGrid";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import makeBlockie from "ethereum-blockies-base64";
import { shortenAddress } from "@/lib/utils/utils";
import { AddressWithCopy } from "@/components/Creator/AddressWithCopy";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import { meTokenSupabaseService } from "@/lib/sdk/supabase/metokens";
import { CreatorProfileHeader } from "@/components/Creator/CreatorProfileHeader";
import Link from "next/link";
import { logger } from '@/lib/utils/logger';



type CreatorPageProps = {
  params: Promise<{
    address: string;
  }>;
};

async function fetchCreatorProfile(address: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("id, owner_address, username, bio, avatar_url, created_at, updated_at")
      .eq("owner_address", address.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profile doesn't exist, that's okay
        return null;
      }
      logger.error("Error fetching creator profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Unexpected error fetching creator profile:", error);
    return null;
  }
}

async function fetchVideoCount(creatorAddress: string) {
  try {
    const result = await getPublishedVideoAssets({
      creatorId: creatorAddress.toLowerCase(),
      limit: 1, // We only need the count
    });
    return result.total || 0;
  } catch (error) {
    logger.error("Error fetching video count:", error);
    return 0;
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { address } = await params;
  const normalizedAddress = address.toLowerCase();

  // Fetch creator profile, MeToken, and video count in parallel
  const [creatorProfile, meToken, videoCount] = await Promise.all([
    fetchCreatorProfile(normalizedAddress),
    meTokenSupabaseService.getMeTokenByOwner(normalizedAddress).catch(() => null),
    fetchVideoCount(normalizedAddress),
  ]);

  const displayName = meToken?.name || creatorProfile?.username || shortenAddress(address);
  const displaySymbol = meToken?.symbol || null;
  const avatarUrl = creatorProfile?.avatar_url
    ? convertFailingGateway(creatorProfile.avatar_url)
    : makeBlockie(address);
  const bio = creatorProfile?.bio || null;

  return (
    <div className="min-h-screen px-4 py-6 sm:p-6">
      {/* Breadcrumb Navigation */}
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">
                  <span role="img" aria-label="home">
                    🏠
                  </span>{" "}
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/discover">Discover</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{displayName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Creator Profile Card */}
      <div className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-6">
            <CreatorProfileHeader
              address={address}
              creatorProfile={creatorProfile}
              meToken={meToken}
              bio={bio}
            />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{videoCount}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Videos Section */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">
          {videoCount > 0 ? `All Videos (${videoCount})` : "All Videos"}
        </h2>
        {videoCount === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No videos yet</p>
              <p className="text-sm text-muted-foreground text-center">
                This creator hasn't uploaded any videos yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <VideoCardGrid creatorId={normalizedAddress} />
        )}
      </div>
    </div>
  );
}
