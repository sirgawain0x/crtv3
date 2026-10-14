"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useCreatorWalletAddress } from "@/lib/hooks/accountkit/useCreatorWalletAddress";
import { GuardLoadingFallback } from "@/components/auth/GuardLoadingFallback";
import { useAuthModal } from "@/lib/wallet/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FaExclamationTriangle } from "react-icons/fa";

/**
 * Canonical entry for go-live: redirects to `/live/{creatorAddress}` when identity is ready.
 */
export function GoLiveRedirect() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { openAuthModal } = useAuthModal();
  const {
    creatorAddress,
    isLoading: isIdentityLoading,
    isAuthenticated,
    walletInitTimedOut,
  } = useCreatorWalletAddress();

  const waitingForAddress =
    isAuthenticated && !creatorAddress && isIdentityLoading && !walletInitTimedOut;

  useEffect(() => {
    if (!ready || !creatorAddress) return;
    router.replace(`/live/${creatorAddress}`);
  }, [ready, creatorAddress, router]);

  if (!ready) {
    return (
      <GuardLoadingFallback isLoading allowBypass={false}>
        {null}
      </GuardLoadingFallback>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <Alert className="max-w-md">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Sign in to go live</AlertTitle>
          <AlertDescription>
            Connect your wallet to open Live Studio and start broadcasting.
          </AlertDescription>
        </Alert>
        <Button onClick={() => openAuthModal()}>Sign in</Button>
      </div>
    );
  }

  if (walletInitTimedOut) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <Alert variant="destructive" className="max-w-md">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Could not load your wallet</AlertTitle>
          <AlertDescription>
            Your session is signed in, but the smart wallet did not finish loading.
            Try again or reset your session.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button onClick={() => openAuthModal()}>Sign in again</Button>
        </div>
      </div>
    );
  }

  if (waitingForAddress) {
    return (
      <GuardLoadingFallback isLoading allowBypass message="Loading your session…">
        {null}
      </GuardLoadingFallback>
    );
  }

  if (!creatorAddress) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <Alert variant="destructive" className="max-w-md">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>No wallet address</AlertTitle>
          <AlertDescription>
            We could not resolve a creator address for your account. Sign in again
            or contact support if this continues.
          </AlertDescription>
        </Alert>
        <Button onClick={() => openAuthModal()}>Sign in again</Button>
      </div>
    );
  }

  return (
    <GuardLoadingFallback isLoading allowBypass message="Opening Live Studio…">
      {null}
    </GuardLoadingFallback>
  );
}
