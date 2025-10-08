"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Client-side component to handle iframe cleanup on route changes
 * This helps prevent duplicate iframe errors during navigation
 */
export function IframeCleanup() {
  const pathname = usePathname();

  // Local cleanup function to avoid importing signer
  const cleanupExistingIframes = () => {
    if (typeof window === "undefined") return;
    
    // Clean up container
    const container = document.getElementById("alchemy-signer-iframe-container");
    if (container) {
      container.innerHTML = "";
    }
    
    // Remove all existing Turnkey iframes (there might be multiple)
    const existingIframes = document.querySelectorAll('[id*="turnkey-iframe"], iframe[id="turnkey-iframe"]');
    existingIframes.forEach(iframe => {
      try {
        iframe.remove();
      } catch (error) {
        console.warn("Failed to remove existing iframe:", error);
      }
    });
    
    // Also check for any iframes with Turnkey-related IDs
    const turnkeyIframes = document.querySelectorAll('iframe[id*="turnkey"], iframe[src*="turnkey"]');
    turnkeyIframes.forEach(iframe => {
      try {
        iframe.remove();
      } catch (error) {
        console.warn("Failed to remove Turnkey iframe:", error);
      }
    });
  };

  useEffect(() => {
    // Clean up iframes when route changes
    cleanupExistingIframes();
  }, [pathname]);

  useEffect(() => {
    // Clean up on component mount
    cleanupExistingIframes();
    
    // Clean up before page unload
    const handleBeforeUnload = () => {
      cleanupExistingIframes();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clean up on component unmount
      cleanupExistingIframes();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
