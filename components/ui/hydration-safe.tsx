"use client";

import { useEffect, useState } from "react";

interface HydrationSafeProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * HydrationSafe component prevents hydration mismatches by only rendering
 * children after the component has mounted on the client side.
 * 
 * This is particularly useful for components that use random IDs or
 * client-side only features like Radix UI components.
 */
export function HydrationSafe({ children, fallback = null }: HydrationSafeProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * useIsMounted hook to check if component has mounted on client
 */
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
