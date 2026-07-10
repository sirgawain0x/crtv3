"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles,
  Shield,
  ShoppingCart,
} from "lucide-react";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { useAuthModal, useUser } from "@/lib/wallet/react";
import { logger } from "@/lib/utils/logger";

interface LicenseTerms {
  transferable: boolean;
  commercialUse: boolean;
  commercialAttribution: boolean;
  commercialRevShare: string;
  derivativesAllowed: boolean;
  derivativesAttribution: boolean;
  derivativesReciprocal: boolean;
  defaultMintingFee: string;
  currency: string;
  expiration: string;
  uri: string;
}

interface LicensePurchaseDialogProps {
  ipId: string;
  licenseTermsId: string;
  videoTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LicensePurchaseDialog({
  ipId,
  licenseTermsId,
  videoTitle,
  open,
  onOpenChange,
}: LicensePurchaseDialogProps) {
  const { user } = useUser();
  const { openAuthModal } = useAuthModal();
  const { getAuthHeaders, address } = useWalletAuth();

  const [terms, setTerms] = useState<LicenseTerms | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    licenseTokenIds: string[];
    txHash: string;
  } | null>(null);

  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
  const storyScanBaseUrl =
    network === "mainnet"
      ? "https://www.storyscan.io"
      : "https://aeneid.storyscan.io";
  const creativePixelsUrl =
    process.env.NEXT_PUBLIC_CREATIVE_PIXELS_URL ||
    "https://create.creativeplatform.xyz";

  const fetchTerms = useCallback(async () => {
    setLoadingTerms(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/story/license-terms?ipId=${encodeURIComponent(
          ipId
        )}&licenseTermsId=${encodeURIComponent(licenseTermsId)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch license terms");
      }
      const data = await res.json();
      setTerms(data.terms ?? null);
    } catch (err) {
      logger.error("Failed to fetch license terms:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load license terms"
      );
    } finally {
      setLoadingTerms(false);
    }
  }, [ipId, licenseTermsId]);

  useEffect(() => {
    if (open && !terms && !loadingTerms) {
      void fetchTerms();
    }
  }, [open, terms, loadingTerms, fetchTerms]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleMint = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (!address) {
      setError("Wallet not connected. Please sign in to purchase a license.");
      return;
    }

    setMinting(true);
    setError(null);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/story/mint-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          ipId,
          licenseTermsId,
          recipient: address,
          amount: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || data.details || "Failed to mint license tokens"
        );
      }

      setSuccess({
        licenseTokenIds: data.licenseTokenIds ?? [],
        txHash: data.txHash ?? "",
      });
    } catch (err) {
      logger.error("License purchase failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to purchase license"
      );
    } finally {
      setMinting(false);
    }
  };

  const formatFee = (fee: string, currency: string) => {
    const feeBigInt = BigInt(fee || "0");
    if (feeBigInt === 0n) return "Free";
    const feeNum = Number(feeBigInt) / 1e18;
    const tokenSymbol =
      currency === "0x1514000000000000000000000000000000000000"
        ? "$DATA"
        : currency === "0x0000000000000000000000000000000000000000"
          ? "Native"
          : "tokens";
    return `${feeNum} ${tokenSymbol}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Purchase IP License
          </DialogTitle>
          <DialogDescription>
            Buy a license for &ldquo;{videoTitle}&rdquo; — grants usage rights
            as defined by the creator&rsquo;s PIL terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading state */}
          {loadingTerms && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading license terms...
              </span>
            </div>
          )}

          {/* License terms summary */}
          {terms && !success && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">License Terms</span>
                  <Badge variant="secondary">PIL</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    {terms.commercialUse ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>Commercial use</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {terms.derivativesAllowed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>Derivatives</span>
                  </div>
                  {terms.derivativesAllowed && (
                    <div className="flex items-center gap-1.5">
                      {terms.derivativesAttribution ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Attribution required</span>
                    </div>
                  )}
                  {terms.derivativesAllowed && (
                    <div className="flex items-center gap-1.5">
                      {terms.derivativesReciprocal ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Reciprocal license</span>
                    </div>
                  )}
                  {terms.commercialUse &&
                    BigInt(terms.commercialRevShare || "0") > 0n && (
                      <div className="col-span-2 text-muted-foreground">
                        Revenue share:{" "}
                        {Number(terms.commercialRevShare) / 100}% to creator
                      </div>
                    )}
                </div>
              </div>

              {/* Minting fee */}
              <div className="flex items-center justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">Minting fee</span>
                <span className="font-medium">
                  {formatFee(terms.defaultMintingFee, terms.currency)}
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success state */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="space-y-3">
                <div className="font-semibold text-green-800 dark:text-green-200">
                  ✅ License purchased successfully!
                </div>
                {success.licenseTokenIds.length > 0 && (
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <strong>License Token IDs:</strong>{" "}
                    {success.licenseTokenIds.join(", ")}
                  </div>
                )}
                {success.txHash && (
                  <a
                    href={`${storyScanBaseUrl}/tx/${success.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline font-medium text-sm"
                  >
                    View transaction on StoryScan{" "}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          {!success && (
            <div className="flex gap-3">
              <Button
                onClick={handleMint}
                disabled={minting || loadingTerms || !terms}
                className="flex-1"
              >
                {minting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting License...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy License
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={minting}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Success: Creative Pixels CTA */}
          {success && terms?.derivativesAllowed && (
            <div className="space-y-2 pt-2">
              <p className="text-sm text-muted-foreground text-center">
                Your license allows derivatives. Start remixing in Creative
                Pixels:
              </p>
              <a
                href={creativePixelsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-indigo-600 hover:to-purple-700 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Open in Creative Pixels
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Close button after success */}
          {success && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}