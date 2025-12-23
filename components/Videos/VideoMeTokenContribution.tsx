"use client";
import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoMeTokenContributionProps {
  videoId?: number;
  playbackId?: string;
  className?: string;
}

interface ContributionData {
  video_id: number;
  contribution: number;
  transaction_count: number;
}

export function VideoMeTokenContribution({
  videoId,
  playbackId,
  className,
}: VideoMeTokenContributionProps) {
  const [contribution, setContribution] = useState<ContributionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId && !playbackId) return;

    const fetchContribution = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let response;
        
        if (videoId) {
          // Use video ID endpoint
          response = await fetch(`/api/video-assets/${videoId}/contribution`);
        } else if (playbackId) {
          // Use playback ID endpoint
          response = await fetch(`/api/video-assets/by-playback-id/${playbackId}/contribution`);
        } else {
          setError('Video ID or playback ID required');
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch contribution');
        }

        const result = await response.json();
        setContribution(result.data);
      } catch (err) {
        console.error('Error fetching video contribution:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contribution');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContribution();
  }, [videoId, playbackId]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !contribution || contribution.contribution === 0) {
    return null; // Don't show anything if no contribution
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs", className)}>
      <TrendingUp className="h-3 w-3 text-green-500" />
      <span className="text-muted-foreground">
        <span className="font-medium text-green-600">
          {contribution.contribution.toFixed(2)} DAI
        </span>
        {' '}contributed
      </span>
    </div>
  );
}
