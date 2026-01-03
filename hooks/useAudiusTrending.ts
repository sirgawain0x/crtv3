import { useState, useEffect } from "react";

const AUDIUS_API_URL = "https://api.audius.co/v1";
const APP_NAME = "MyAwesomeApp"; // Replace with your app name

export interface AudiusTrack {
    id: string;
    title: string;
    user: {
        name: string;
        handle: string;
    };
    artwork: {
        "150x150": string;
        "480x480": string;
        "1000x1000": string;
    };
    play_count: number;
}

export function useAudiusTrending() {
    const [tracks, setTracks] = useState<AudiusTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTrending() {
            try {
                const response = await fetch(
                    `${AUDIUS_API_URL}/tracks/trending?app_name=${APP_NAME}`
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch Audius trending tracks");
                }
                const data = await response.json();
                setTracks(data.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchTrending();
    }, []);

    return { tracks, loading, error };
}
