"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignerStatus } from "@account-kit/react";
import { isAddress } from "viem";
import { useCreatorWalletAddress } from "@/lib/hooks/accountkit/useCreatorWalletAddress";
import { logger } from "@/lib/utils/logger";

interface LivePageClientProps {
  urlAddress: string;
  children: React.ReactNode;
}

/**
 * Ensures the address in the URL matches the logged-in user's smart account.
 */
export function LivePageClient({ urlAddress, children }: LivePageClientProps) {
  const router = useRouter();
  const { creatorAddress, smartAccountAddress, eoaAddress, isLoading } =
    useCreatorWalletAddress();
  const { isInitializing, isAuthenticating } = useSignerStatus();

  useEffect(() => {
    if (isLoading || isInitializing || isAuthenticating) return;

    if (urlAddress && !isAddress(urlAddress)) {
      logger.warn("Invalid address format in live URL, redirecting...");
      if (creatorAddress) {
        router.replace(`/live/${creatorAddress}`);
      } else {
        router.replace("/live");
      }
      return;
    }

    const normalize = (addr: string | null | undefined) =>
      addr ? addr.toLowerCase() : null;

    const urlAddr = normalize(urlAddress);
    const smartAddr = normalize(smartAccountAddress ?? creatorAddress);
    const eoaAddr = normalize(eoaAddress);

    if (smartAddr) {
      if (urlAddr !== smartAddr) {
        logger.debug(
          "Live URL address mismatch, redirecting to smart account:",
          smartAccountAddress,
        );
        router.replace(`/live/${smartAccountAddress ?? creatorAddress}`);
      }
      return;
    }

    if (eoaAddr && urlAddr !== eoaAddr) {
      logger.debug("Live URL address mismatch, redirecting to EOA:", eoaAddress);
      router.replace(`/live/${eoaAddress}`);
    }
  }, [
    urlAddress,
    smartAccountAddress,
    creatorAddress,
    eoaAddress,
    isLoading,
    isInitializing,
    isAuthenticating,
    router,
  ]);

  return <>{children}</>;
}
