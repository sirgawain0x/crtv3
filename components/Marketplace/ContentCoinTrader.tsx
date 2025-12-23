"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Coins, TrendingUp } from "lucide-react";
import { useContentCoin } from "@/lib/hooks/marketplace/useContentCoin";
import { formatEther } from "viem";

interface ContentCoinTraderProps {
    contentCoinAddress: string;
    creatorTokenAddress: string;
    creatorTokenSymbol: string;
    videoTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ContentCoinTrader({
    contentCoinAddress,
    creatorTokenAddress,
    creatorTokenSymbol,
    videoTitle,
    open,
    onOpenChange,
    onSuccess
}: ContentCoinTraderProps) {
    const { buyContentCoin, sellContentCoin, isPending, isConfirming } = useContentCoin();
    const [activeTab, setActiveTab] = useState("buy");
    const [amount, setAmount] = useState("");

    // NOTE: Real price calculation would go here from contract view functions
    // For MVP, we assume a simple bonding curve estimation or let the contract handle the exact math
    // and we just input "Amount to Spend".

    const handleTrade = async () => {
        try {
            if (activeTab === "buy") {
                await buyContentCoin(contentCoinAddress, amount, creatorTokenAddress);
            } else {
                await sellContentCoin(contentCoinAddress, amount);
            }
            onSuccess?.();
            onOpenChange(false);
        } catch (e) {
            // Error handled in hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-yellow-500" />
                        Trade {videoTitle.substring(0, 15)}...
                    </DialogTitle>
                    <DialogDescription>
                        Buy or Sell Content Coins using {creatorTokenSymbol}.
                        Hold 1 coin to unlock access.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="buy" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="buy">Buy</TabsTrigger>
                        <TabsTrigger value="sell">Sell</TabsTrigger>
                    </TabsList>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>
                                {activeTab === "buy" ? `Amount of ${creatorTokenSymbol} to Spend` : "Amount of Content Coins to Sell"}
                            </Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estimated Price</span>
                                <span className="font-medium">--</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-muted-foreground">Slippage</span>
                                <span className="font-medium">Auto</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleTrade}
                            className="w-full"
                            disabled={isPending || isConfirming || !amount}
                        >
                            {isPending || isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {activeTab === "buy" ? "Mint Content Coin" : "Burn Content Coin"}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            <TrendingUp className="inline h-3 w-3 mr-1" />
                            Price determined by bonding curve
                        </p>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
