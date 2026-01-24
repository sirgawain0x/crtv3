"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSmartAccountClient } from "@account-kit/react";
import { base } from "@account-kit/infra";
import { createPublicClient, http, fallback, formatEther } from "viem";
import {
  getAnswerHistory,
  buildClaimWinningsParams,
  claimWinnings as claimWinningsTx,
  withdraw,
  getBalanceOf,
} from "@/lib/sdk/reality-eth/reality-eth-question-wrapper";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { Loader2, Wallet, Gift } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

interface ClaimWinningsCardProps {
  questionId: string;
}

type ClaimStep = "idle" | "fetching" | "claiming" | "withdrawing" | "done" | "error";

export function ClaimWinningsCard({ questionId }: ClaimWinningsCardProps) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [step, setStep] = useState<ClaimStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [canClaim, setCanClaim] = useState<boolean | null>(null);

  const { isConnected, walletAddress } = useWalletStatus();
  const { client: accountKitClient } = useSmartAccountClient({});

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: base,
        transport: fallback([
          http(
            process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
              ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
              : undefined
          ),
          http("https://mainnet.base.org"),
        ]),
      }),
    []
  );

  const fetchBalanceAndClaimability = useCallback(async () => {
    if (!walletAddress) return;
    setError(null);
    try {
      const bal = await getBalanceOf(publicClient, walletAddress as `0x${string}`);
      setBalance(bal);
      const history = await getAnswerHistory(publicClient, questionId);
      setCanClaim(history.length > 0);
    } catch (e: unknown) {
      const err = e as { message?: string };
      logger.error("Error fetching balance / history:", e);
      setError(err?.message ?? "Failed to fetch");
      setCanClaim(false);
    }
  }, [questionId, walletAddress, publicClient]);

  useEffect(() => {
    if (isConnected && walletAddress) void fetchBalanceAndClaimability();
  }, [isConnected, walletAddress, questionId, fetchBalanceAndClaimability]);

  const handleClaimAndWithdraw = async () => {
    if (!isConnected || !walletAddress || !accountKitClient) {
      toast.error("Connect your wallet to claim.");
      return;
    }

    setError(null);
    setStep("fetching");

    try {
      const history = await getAnswerHistory(publicClient, questionId);
      if (history.length === 0) {
        setError("No answer history found. Cannot claim.");
        setStep("idle");
        return;
      }

      const { history_hashes, addrs, bonds, answers } = buildClaimWinningsParams(history);

      setStep("claiming");
      try {
        await claimWinningsTx(publicClient, accountKitClient as any, {
          questionId,
          history_hashes,
          addrs,
          bonds,
          answers,
        });
        toast.success("Winnings distributed.");
      } catch (claimError: any) {
        // If claim fails, we check if it was because it's already claimed or similar
        const msg = claimError?.message || "";
        logger.warn("Claim warning (might be already claimed):", claimError);

        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("revert")) {
          toast.info("Winnings might already be distributed. Checking balance...");
        } else {
          // If it's a real unknown error, we stop here? 
          // Or we continues to check balance just in case.
          toast.error("Distribution step failed, but checking for withdrawable funds...");
        }
      }

      // Always check balance after claim attempt
      const bal = await getBalanceOf(publicClient, walletAddress as `0x${string}`);
      if (bal > 0n) {
        setStep("withdrawing");
        await withdraw(publicClient, accountKitClient as any);
        toast.success("Withdrawal successful!");
      } else {
        toast.info("No funds to withdraw.");
      }

      setStep("done");
      await fetchBalanceAndClaimability();
    } catch (e: unknown) {
      logger.error("Claim/withdraw process error:", e);
      const msg = (e as { message?: string })?.message ?? "Process failed.";
      setError(msg);
      setStep("error");
      toast.error("Failed to complete claim process.");
    }
  };

  const handleWithdrawOnly = async () => {
    if (!isConnected || !walletAddress || !accountKitClient) {
      toast.error("Connect your wallet to withdraw.");
      return;
    }
    setError(null);
    setStep("withdrawing");
    try {
      await withdraw(publicClient, accountKitClient as any);
      toast.success("Withdrawal successful!");
      setStep("done");
      await fetchBalanceAndClaimability();
    } catch (e: unknown) {
      logger.error("Withdraw error:", e);
      setError((e as { message?: string })?.message ?? "Withdrawal failed.");
      setStep("error");
      toast.error("Withdrawal failed.");
    }
  };

  const isLoading = step === "fetching" || step === "claiming" || step === "withdrawing";
  const hasBalance = balance !== null && balance > 0n;

  return (
    <Card className="p-6 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
          Claim your winnings
        </h2>
      </div>
      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
        This prediction is resolved. If you bonded on the winning answer, claim to distribute
        winnings to your balance, then withdraw to your wallet.
      </p>

      {!isConnected ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Connect your wallet to claim or withdraw.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button
              type="button"
              onClick={fetchBalanceAndClaimability}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="border-emerald-300 dark:border-emerald-700"
            >
              {balance === null ? "Check balance" : "Refresh"}
            </Button>
            {balance !== null && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-800 dark:text-emerald-200">
                <Wallet className="h-4 w-4" aria-hidden />
                Contract balance: {formatEther(balance)} ETH
              </span>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canClaim !== false && (
              <Button
                type="button"
                onClick={handleClaimAndWithdraw}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                aria-label="Claim winnings and withdraw to wallet"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {step === "claiming"
                      ? "Distributing…"
                      : step === "withdrawing"
                        ? "Withdrawing…"
                        : "Processing…"}
                  </>
                ) : (
                  "Claim & withdraw"
                )}
              </Button>
            )}
            {hasBalance && (
              <Button
                type="button"
                variant="outline"
                onClick={handleWithdrawOnly}
                disabled={isLoading}
                className="border-emerald-400 dark:border-emerald-600"
                aria-label="Withdraw balance only"
              >
                Withdraw only
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
