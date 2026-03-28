"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVideoTip, TokenSymbol } from "@/lib/hooks/video/useVideoTip";
import { formatUnits } from "viem";
import { Coins, Loader2 } from "lucide-react";
import { formatAddress } from "@/lib/helpers";

interface VideoTipButtonProps {
  creatorAddress: string;
  onTipSuccess?: (txHash: string, amount: string, token: TokenSymbol) => void;
}

/**
 * Tip button component for video creators
 * Allows users to send tips in ETH, USDC, or DAI
 */
export function VideoTipButton({ creatorAddress, onTipSuccess }: VideoTipButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("ETH");
  const [amount, setAmount] = useState("");
  const { sendTip, isTipping, error, balances, fetchBalances } = useVideoTip();

  // Fetch balances when dialog opens
  useEffect(() => {
    if (open) {
      fetchBalances();
    }
  }, [open, fetchBalances]);

  const handleTip = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    const result = await sendTip(amount, selectedToken, creatorAddress);
    
    if (result) {
      setOpen(false);
      setAmount("");
      onTipSuccess?.(result.txHash, result.amount, result.token);
    }
  };

  const balance = balances[selectedToken];
  const balanceNum = parseFloat(balance);
  const amountNum = parseFloat(amount) || 0;
  const hasInsufficientBalance = amountNum > balanceNum;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Coins className="h-4 w-4" />
          Tip Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tip the Creator</DialogTitle>
          <DialogDescription>
            Send a tip to {formatAddress(creatorAddress)} to show your appreciation!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleTip}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="token">Token</Label>
              <Select
                value={selectedToken}
                onValueChange={(value) => setSelectedToken(value as TokenSymbol)}
              >
                <SelectTrigger id="token">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="DAI">DAI</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Balance: {balanceNum.toFixed(6)} {selectedToken}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isTipping}
              />
              {hasInsufficientBalance && (
                <p className="text-xs text-destructive">
                  Insufficient balance
                </p>
              )}
            </div>
            {error && (
              <div className="text-sm text-destructive">
                {error.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isTipping}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isTipping || !amount || amountNum <= 0 || hasInsufficientBalance}
            >
              {isTipping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Tip"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

