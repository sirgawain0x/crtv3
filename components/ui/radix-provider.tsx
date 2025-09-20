"use client";

import { ReactNode, useEffect, useState } from "react";

interface RadixProviderProps {
  children: ReactNode;
}

/**
 * RadixProvider ensures consistent ID generation for Radix UI components
 * by providing a stable ID generator that works consistently between
 * server and client rendering.
 */
export function RadixProvider({ children }: RadixProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatches by not rendering Radix components
  // until after the component has mounted on the client
  if (!isMounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
