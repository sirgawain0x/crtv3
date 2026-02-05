"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import { Loader2 } from "lucide-react";
import { createContext, useContext } from "react";
import type { MembershipStatus } from "@/lib/hooks/unlock/useMembershipVerification";
import { logger } from '@/lib/utils/logger';


interface MembershipGuardProps {
  children: React.ReactNode;
}

export const MembershipContext = createContext<MembershipStatus | null>(null);

export function MembershipGuard({ children }: MembershipGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const membership = useMembershipVerification();
  const { isVerified, hasMembership, isLoading } = membership;
  const isHomePage = pathname === "/";

  const PUBLIC_PATHS = [
    '/discover',
    '/market',
    '/predict',
    '/vote',
    '/news',
    '/live',
    '/watch',
    '/profile',
    '/upload',
  ];

  const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path));

  useEffect(() => {
    logger.debug("MembershipGuard:", membership);
    // Don't redirect if we are on the home page or a public page
    if (!isLoading && (!isVerified || !hasMembership) && !isHomePage && !isPublicPath) {
      router.push("/");
    }
  }, [isLoading, isVerified, hasMembership, router, membership, isHomePage, isPublicPath]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Allow rendering children if:
  // 1. User has verified membership
  // 2. OR User is on the home page (which has its own non-logged-in view)
  // 3. OR User is on a public page
  if ((!isVerified || !hasMembership) && !isHomePage && !isPublicPath) {
    return null;
  }

  return (
    <MembershipContext.Provider value={membership}>
      {children}
    </MembershipContext.Provider>
  );
}
