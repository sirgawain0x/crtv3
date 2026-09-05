"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  Check,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEarn } from "@/lib/hooks/wallet/useEarn";
import { formatBalanceDisplay } from "@/lib/utils/format-token-balance";
import { formatUnits } from "viem";
import { USDC_TOKEN_DECIMALS } from "@/lib/contracts/USDCToken";
import { useToast } from "@/components/ui/use-toast";

type EarnSectionProps = {
  isVisible?: boolean;
  onSuccess?: () => void;
  /** Open Send prefilled with the Privy embedded wallet as USDC recipient. */
  onTopUp?: (embeddedAddress: string) => void;
};

export function EarnSection({ isVisible, onSuccess, onTopUp }: EarnSectionProps) {
  const { toast } = useToast();
  const {
    vault,
    position,
    embeddedWallet,
    isLoading,
    isPending,
    error,
    isConfigured,
    deposit,
    withdraw,
  } = useEarn({ isVisible });

  const [mode, setMode] = useState<"deposit" | "withdraw" | "topup" | null>(null);
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const embeddedUsdcFormatted = useMemo(() => {
    if (!embeddedWallet?.usdcBalance) return "0";
    return formatBalanceDisplay(
      formatUnits(BigInt(embeddedWallet.usdcBalance), USDC_TOKEN_DECIMALS),
    );
  }, [embeddedWallet?.usdcBalance]);

  const positionFormatted = position?.assetsInVaultFormatted ?? "0";
  const earnedYieldFormatted = position?.earnedYieldFormatted ?? "0";
  const hasPosition = position ? BigInt(position.assetsInVault) > 0n : false;
  const displayAmount = hasPosition
    ? formatBalanceDisplay(positionFormatted)
    : "0";
  const hasEmbeddedUsdc = Number.parseFloat(embeddedUsdcFormatted) > 0;
  const needsTopUp = !hasEmbeddedUsdc && !hasPosition;
  const embeddedAddress = embeddedWallet?.address ?? null;

  const handleDeposit = async () => {
    try {
      await deposit(amount);
      toast({
        title: "Deposit submitted",
        description: `${amount} USDC is earning yield.`,
      });
      setAmount("");
      setMode(null);
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Deposit failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWithdraw = async (withdrawAll = false) => {
    try {
      await withdraw(withdrawAll ? { withdrawAll: true } : { amount });
      toast({
        title: "Withdrawal submitted",
        description: withdrawAll
          ? "Your full earn balance is being withdrawn."
          : `${amount} USDC is being withdrawn.`,
      });
      setAmount("");
      setMode(null);
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Withdrawal failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyEmbedded = async () => {
    if (!embeddedAddress) return;
    try {
      await navigator.clipboard.writeText(embeddedAddress);
      setCopied(true);
      toast({ title: "Copied", description: "Embedded wallet address copied." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy address.",
        variant: "destructive",
      });
    }
  };

  const handleSendToEmbedded = () => {
    if (!embeddedAddress || !onTopUp) return;
    onTopUp(embeddedAddress);
    setMode(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Earn</span>
        {vault?.userApyPercent ? (
          <span className="text-xs text-green-600 dark:text-green-400">
            {vault.userApyPercent}% APY
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : (
        <>
          <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-muted-foreground">In vault</p>
            <p className="text-lg font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              {displayAmount} USDC
            </p>
            {!hasPosition ? (
              <p className="text-xs text-muted-foreground">Nothing earning yet</p>
            ) : Number.parseFloat(earnedYieldFormatted) > 0 ? (
              <p className="text-xs text-green-600 dark:text-green-400">
                +{formatBalanceDisplay(earnedYieldFormatted)} earned
              </p>
            ) : null}
          </div>

          {isConfigured ? (
            <>
              <p className="text-xs text-muted-foreground">
                Available to deposit: {embeddedUsdcFormatted} USDC
              </p>

              {needsTopUp ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Earn uses your embedded wallet. Top up with USDC to start
                  depositing.
                </p>
              ) : null}

              {error ? (
                <p className="text-xs text-red-500">{error}</p>
              ) : null}

              {mode === "topup" ? (
                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">
                    Send USDC from your Creative account (or an external wallet)
                    to this embedded address:
                  </p>
                  {embeddedAddress ? (
                    <div className="flex items-center gap-1">
                      <code className="flex-1 truncate rounded bg-background px-2 py-1 text-[10px]">
                        {embeddedAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 p-0"
                        onClick={() => void handleCopyEmbedded()}
                        aria-label="Copy embedded wallet address"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Embedded wallet not ready yet. Try again in a moment.
                    </p>
                  )}
                  <div className="flex gap-2">
                    {onTopUp && embeddedAddress ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSendToEmbedded}
                      >
                        Send USDC here
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMode(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : mode ? (
                <div className="space-y-2 pt-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount (USDC)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={isPending || (!amount && mode === "deposit")}
                      onClick={() =>
                        mode === "deposit"
                          ? void handleDeposit()
                          : void handleWithdraw(false)
                      }
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : mode === "deposit" ? (
                        "Confirm deposit"
                      ) : (
                        "Confirm withdraw"
                      )}
                    </Button>
                    {mode === "withdraw" && hasPosition ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => void handleWithdraw(true)}
                      >
                        Max
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => {
                        setMode(null);
                        setAmount("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {needsTopUp ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center gap-1.5"
                      disabled={isPending || !embeddedAddress}
                      onClick={() => setMode("topup")}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Top up
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5"
                      disabled={isPending || !hasEmbeddedUsdc}
                      onClick={() => setMode("deposit")}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      Deposit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5"
                    disabled={isPending || !hasPosition}
                    onClick={() => setMode("withdraw")}
                  >
                    <ArrowUpFromLine className="h-3.5 w-3.5" />
                    Withdraw
                  </Button>
                </div>
              )}

              <p className="text-[10px] leading-snug text-muted-foreground">
                Yield is generated by third-party DeFi vaults and is not
                guaranteed. Using vaults involves risk, including loss of funds.
              </p>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
