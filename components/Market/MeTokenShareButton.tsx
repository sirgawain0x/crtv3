"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildMeTokenShareUrl } from "@/lib/market/metokenShareUrl";

interface MeTokenShareButtonProps {
    /** Creator wallet address — used to build `/creator/<owner>` share links. */
    creatorOwnerAddress?: string;
    /** @deprecated Use creatorOwnerAddress */
    address?: string;
    symbol: string;
    name: string;
    type: 'creator' | 'content';
    playbackId?: string; // Required if type is 'content'
}

export function MeTokenShareButton({
    creatorOwnerAddress,
    address,
    symbol,
    name,
    type,
    playbackId,
}: MeTokenShareButtonProps) {
    const resolvedCreatorOwnerAddress = creatorOwnerAddress ?? address;
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = buildMeTokenShareUrl(baseUrl, {
        type,
        creatorOwnerAddress: resolvedCreatorOwnerAddress,
        playbackId,
    });

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share {symbol}</DialogTitle>
                    <DialogDescription>
                        Share {name} ({symbol}) with your network.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="link"
                            defaultValue={shareUrl}
                            readOnly
                            className="h-9"
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={handleCopy}>
                        <span className="sr-only">Copy</span>
                        {copied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
