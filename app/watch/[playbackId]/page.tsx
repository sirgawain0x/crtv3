"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Player } from "@/components/Player/Player";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { LiveChat } from "@/components/Live/LiveChat";
import { ClipCreator } from "@/components/Live/ClipCreator";
import { Src } from "@livepeer/react";
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

export default function WatchLivePage() {
  const params = useParams();
  const playbackId = Array.isArray(params.playbackId) 
    ? params.playbackId[0] 
    : params.playbackId;
  
  const [playbackSources, setPlaybackSources] = useState<Src[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const sources = await getDetailPlaybackSource(playbackId);
        
        if (!sources || sources.length === 0) {
          setError("No playback sources found for this stream");
          return;
        }
        
        setPlaybackSources(sources);
      } catch (err) {
        console.error("Error fetching playback sources:", err);
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
            ) : playbackSources ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <Player 
                  src={playbackSources} 
                  title="Live Stream"
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

