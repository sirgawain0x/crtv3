
import { useState, useEffect, useCallback } from 'react';
import { CurrencyConverter } from '@/lib/utils/currency-converter';

interface VideoContributionData {
    video_id: number;
    contribution: number;
    transaction_count: number;
}

interface UseVideoContributionProps {
    videoId?: number;
    playbackId?: string;
    pollInterval?: number; // Polling interval in milliseconds (0 or undefined = no polling)
}

export function useVideoContribution({ videoId, playbackId, pollInterval }: UseVideoContributionProps) {
    const [data, setData] = useState<VideoContributionData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formattedContribution, setFormattedContribution] = useState<string>('$0.00');

    const fetchContribution = useCallback(async () => {
        if (!videoId && !playbackId) return;

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
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch contribution');
            }

            const result = await response.json();

            if (result.data) {
                setData(result.data);
                // Format the contribution amount as USD
                const formatted = CurrencyConverter.formatUSD(result.data.contribution || 0);
                setFormattedContribution(formatted);
            }
        } catch (err) {
            console.error('Error fetching video contribution:', err);
            setError(err instanceof Error ? err.message : 'Failed to load contribution');
        } finally {
            setIsLoading(false);
        }
    }, [videoId, playbackId]);

    useEffect(() => {
        if (!videoId && !playbackId) return;

        // Initial fetch
        fetchContribution();

        // Set up polling if pollInterval is provided and > 0
        if (pollInterval && pollInterval > 0) {
            const interval = setInterval(() => {
                fetchContribution();
            }, pollInterval);

            return () => clearInterval(interval);
        }
    }, [videoId, playbackId, pollInterval, fetchContribution]);

    return {
        contribution: data?.contribution || 0,
        formattedContribution,
        isLoading,
        error
    };
}
