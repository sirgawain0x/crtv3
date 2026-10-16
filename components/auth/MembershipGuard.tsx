"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import { createContext, useContext } from "react";
import type { MembershipStatus } from "@/lib/hooks/unlock/useMembershipVerification";
import { logger } from '@/lib/utils/logger';
import { GuardLoadingFallback } from "@/components/auth/GuardLoadingFallback";
import { WALLET_INIT_TIMEOUT_CODE } from "@/lib/hooks/unlock/membership-wallet-wait";
import { Button } from "@/components/ui/button";


interface MembershipGuardProps {
  children: React.ReactNode;
}

export const MembershipContext = createContext<MembershipStatus | null>(null);

const PUBLIC_PATHS = [
  '/discover',
  '/market',
  '/predict',
  '/vote',
  '/news',
  '/live',
  '/go-live',
  '/stream',
  '/watch',
  '/profile',
  '/upload',
  '/creator',
  '/memberships',
  '/songchain',
  '/chones',
  '/spindrift',
];

export function MembershipGuard({ children }: MembershipGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const membership = useMembershipVerification();
  const { isVerified, hasMembership, isLoading, error, refetch } = membership;
  const walletInitTimedOut = error?.code === WALLET_INIT_TIMEOUT_CODE;
  const isHomePage = pathname === "/";
  const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path));
  const canBypassLoading = isHomePage || isPublicPath;

  useEffect(() => {
    logger.debug("MembershipGuard:", {
      isLoading,
      isVerified,
      hasMembership,
      isHomePage,
      isPublicPath,
    });
    if (!isLoading && (!isVerified || !hasMembership) && !isHomePage && !isPublicPath) {
      router.push("/");
    }
  }, [isLoading, isVerified, hasMembership, router, isHomePage, isPublicPath]);

  if ((!isVerified || !hasMembership) && !isHomePage && !isPublicPath) {
    if (isLoading) {
      return (
        <GuardLoadingFallback isLoading allowBypass={false}>
          {null}
        </GuardLoadingFallback>
      );
    }
    return null;
  }

  if (walletInitTimedOut && canBypassLoading) {
    return (
      <MembershipContext.Provider value={membership}>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {error?.message ?? "Smart wallet did not finish loading."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          </div>
        </div>
      </MembershipContext.Provider>
    );
  }

  if (isLoading && !canBypassLoading) {
    return (
      <GuardLoadingFallback
        isLoading
        allowBypass={false}
        message="Verifying membership…"
      >
        {null}
      </GuardLoadingFallback>
    );
  }

  return (
    <MembershipContext.Provider value={membership}>
      <GuardLoadingFallback
        isLoading={isLoading && canBypassLoading}
        allowBypass={canBypassLoading}
        message="Still loading your wallet session…"
      >
        {children}
      </GuardLoadingFallback>
    </MembershipContext.Provider>
  );
}

export function useMembershipContext() {
  return useContext(MembershipContext);
}
