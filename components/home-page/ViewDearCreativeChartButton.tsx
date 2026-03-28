"use client";

import { Button } from "@/components/ui/button";
import { LineChart, ExternalLink } from "lucide-react";

// Standard Uniswap Universal Router on Base
// But here we just want the DexScreener link for the token
const DEARCRTV_ADDRESS = "0x81ced3c6e7058c1fe8d9b6c5a2435a65a4593292";

export function ViewDearCreativeChartButton() {
    const handleViewChart = () => {
        window.open(`https://dexscreener.com/base/${DEARCRTV_ADDRESS}`, "_blank");
    };

    return (
        <Button
            variant="outline"
            onClick={handleViewChart}
            className="gap-2"
        >
            <LineChart className="w-4 h-4" />
            Chart
            <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
        </Button>
    );
}
