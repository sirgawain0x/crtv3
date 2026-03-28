"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TokenPriceChart } from './TokenPriceChart';
import { MarketToken } from '@/app/api/market/tokens/route';

interface TokenChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: MarketToken | null;
}

export function TokenChartDialog({
  open,
  onOpenChange,
  token,
}: TokenChartDialogProps) {
  if (!token) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {token.symbol} Price Chart
          </DialogTitle>
          <DialogDescription>
            Historical price data for {token.name}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <TokenPriceChart
            tokenAddress={token.address}
            tokenSymbol={token.symbol}
            height={400}
            showControls={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

