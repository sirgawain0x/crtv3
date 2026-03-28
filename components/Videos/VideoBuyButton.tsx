"use client";

import React, { useState, useEffect } from "react";
import { CircleDollarSign } from "lucide-react";
import { Button } from "../ui/button";
import { VideoMeTokenBuyDialog } from "./VideoMeTokenBuyDialog";
import { useVideoContribution } from "@/lib/hooks/metokens/useVideoContribution";
import { fetchVideoAssetByPlaybackId } from "@/lib/utils/video-assets-client";
import { Skeleton } from "../ui/skeleton";

interface VideoBuyButtonProps {
    playbackId: string;
    videoTitle: string;
    className?: string;
}

export function VideoBuyButton({
    playbackId,
    videoTitle,
    className = "",
}: VideoBuyButtonProps) {
    const [hasMeToken, setHasMeToken] = useState<boolean>(false);
    const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    // Fetch contribution data to display on the buy button
    const { formattedContribution, isLoading } = useVideoContribution({
        playbackId: playbackId || undefined,
    });

    useEffect(() => {
        const checkMeToken = async () => {
            try {
                if (!playbackId) return;
                const row = await fetchVideoAssetByPlaybackId(playbackId);
                if (row) {
                    // Check if video has an associated MeToken
                    if (row?.creator_metoken_id || row?.attributes?.content_coin_id) {
                        setHasMeToken(true);
                    } else {
                        setHasMeToken(false);
                    }
                }
            } catch {
                setHasMeToken(false);
            }
        };
        checkMeToken();
    }, [playbackId]);

    const handleOpenDialog = () => {
        // Blur the button before opening dialog to prevent aria-hidden warnings
        if (buttonRef.current) {
            buttonRef.current.blur();
        }
        setIsBuyDialogOpen(true);
    };

    if (!hasMeToken) {
        return null;
    }

    return (
        <>
            <Button
                ref={buttonRef}
                className={`cursor-pointer hover:scale-105 transition-all text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 px-3 py-2 h-auto whitespace-nowrap ${className}`}
                aria-label={`Buy ${videoTitle}`}
                variant="ghost"
                onClick={handleOpenDialog}
            >
                <div className="flex items-center gap-1.5">
                    <CircleDollarSign className="w-5 h-5 flex-shrink-0" />
                    {isLoading ? (
                        <Skeleton className="h-4 w-12" />
                    ) : (
                        <span className="text-sm font-medium">{formattedContribution}</span>
                    )}
                </div>
            </Button>

            {/* Buy MeToken Dialog */}
            {playbackId && hasMeToken && (
                <VideoMeTokenBuyDialog
                    open={isBuyDialogOpen}
                    onOpenChange={setIsBuyDialogOpen}
                    playbackId={playbackId}
                    videoTitle={videoTitle}
                />
            )}
        </>
    );
}
