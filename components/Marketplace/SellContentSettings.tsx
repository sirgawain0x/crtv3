"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, DollarSign } from "lucide-react";
import { logger } from '@/lib/utils/logger';


interface SellContentSettingsProps {
    videoId: number;
    initialPrice?: string; // Price in MeTokens
    onSave?: (newPrice: string) => void;
}

export function SellContentSettings({ videoId, initialPrice = "", onSave }: SellContentSettingsProps) {
    const [price, setPrice] = useState(initialPrice);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setLoading(true);
        try {
            // Assuming API endpoint exists to update video asset metadata
            const response = await fetch(`/api/video-assets/${videoId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    price_metoken: price, // Assuming this field name
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update price");
            }

            toast({
                title: "Price Updated",
                description: `This video is now listed for ${price || "free"} MeTokens.`,
            });

            onSave?.(price);
        } catch (error) {
            logger.error("Error updating price:", error);
            toast({
                title: "Error",
                description: "Failed to save price settings.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 rounded-lg border p-4 bg-transparent">
            <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-lg">Sell Content</h3>
            </div>
            <div className="space-y-2">
                <Label htmlFor="price">Price (MeTokens)</Label>
                <div className="flex gap-2">
                    <Input
                        id="price"
                        type="number"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0"
                        step="0.01"
                        className="flex-1"
                    />
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Set a price to gate this content. Users must hold your MeToken to unlock it. Leave 0 for free.
                </p>
            </div>
        </div>
    );
}
