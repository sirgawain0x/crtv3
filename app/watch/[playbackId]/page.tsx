"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Player } from "@/components/Player/Player";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { getStreamByPlaybackId } from "@/services/streams";
import { LiveChat } from "@/components/Live/LiveChat";
import { ClipCreator } from "@/components/Live/ClipCreator";
import { Src } from "@livepeer/react";
import { useUser } from "@account-kit/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import { logger } from '@/lib/utils/logger';


import { LivestreamThumbnail } from "@/components/Live/LivestreamThumbnail";

export default function WatchLivePage() {
  const params = useParams();
  const playbackId = Array.isArray(params.playbackId)
    ? params.playbackId[0]
    : params.playbackId;

  const user = useUser();
  const [playbackSources, setPlaybackSources] = useState<Src[] | null>(null);
  const [streamData, setStreamData] = useState<import("@/services/streams").Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchPlaybackSources() {
      if (!playbackId) {
        setError("No playback ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setIsOffline(false);

        // Parallel fetch: Livepeer sources + Our persistent stream metadata
        const [sources, streamRecord] = await Promise.all([
          getDetailPlaybackSource(playbackId),
          getStreamByPlaybackId(playbackId)
        ]);

        if (streamRecord) {
          setStreamData(streamRecord as import("@/services/streams").Stream);
        }

        if (!sources || sources.length === 0) {
          // If we have a stream record, it just means it's offline, not necessarily an error
          if (streamRecord) {
            setIsOffline(true);
            setPlaybackSources(null);
          } else {
            setError("No playback sources found for this stream");
          }
          return;
        }

        setIsOffline(false);
        setPlaybackSources(sources);

        // Fetch JWT for playback
        try {
          const jwtRes = await fetch("/api/livepeer/sign-jwt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playbackId,
              userAddress: user?.address
            }),
          });
          if (jwtRes.ok) {
            const { token } = await jwtRes.json();
            setJwt(token);
          } else {
            logger.warn("Failed to sign JWT for stream");
          }
        } catch (jwtErr) {
          logger.error("Error signing JWT:", jwtErr);
        }

        // If we have a custom thumbnail, we could potentially pass it to the Player
        // as a poster. The current Player component might need updating to accept 'poster'.
        // For now, we mainly ensure we're confirming the stream exists.

      } catch (err) {
        logger.error("Error fetching playback sources:", err);
        setError(err instanceof Error ? err.message : "Failed to load stream");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlaybackSources();
  }, [playbackId]);

  // Generate a consistent sessionId based on playbackId
  // This ensures all viewers of the same stream are in the same chat session
  const sessionId = playbackId ? `session-${playbackId}` : "";

  // Use playbackId as streamId for LiveChat
  // Note: This means viewers and creators need to use the same identifier
  // If creators use their address, we may need to adjust this later
  const streamId = playbackId || "";

  return (
    <div className="min-h-screen p-6">
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <span role="img" aria-label="home">
                  🏠
                </span>{" "}
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/discover">
                Discover
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Live Stream</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="aspect-video flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : isOffline ? (
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-center relative group">
                {/* Thumbnail Background */}
                {streamData?.thumbnail_url && (
                  <div className="absolute inset-0 z-0 opacity-50">
                    <img
                      src={streamData.thumbnail_url}
                      alt="Stream Offline"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="z-10 flex flex-col items-center gap-4 p-6 bg-black/60 rounded-xl backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <AlertCircle className="h-10 w-10 text-gray-400" />
                    <h3 className="text-xl font-bold text-white">Stream is Offline</h3>
                    <p className="text-gray-300">The broadcaster is not currently live.</p>
                  </div>
                  <button
                    onClick={() => window.location.reload()} // Simple reload for now, or re-trigger fetch
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20"
                  >
                    Check Again
                  </button>
                </div>
              </div>
            ) : playbackSources ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <Player
                  src={playbackSources}
                  title={streamData?.name || "Live Stream"}
                  jwt={jwt}
                />
              </div>
            ) : null}
          </div>

          {/* Live Chat Section */}
          <div className="lg:col-span-1">
            {playbackId && sessionId ? (
              <LiveChat
                streamId={streamId}
                sessionId={sessionId}
                creatorAddress={null} // We can enhance this later to fetch creator address from stream data
              />
            ) : (
              <div className="border rounded-lg p-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Loading chat...
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>

        {/* Clip Creator Section - Below video and chat for viewers */}
        {playbackId && sessionId && (
          <div className="mt-6">
            <ClipCreator
              playbackId={playbackId}
              sessionId={sessionId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

