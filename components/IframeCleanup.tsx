"use client";

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/utils/logger';


/**
 * Utility function to clean up DUPLICATE iframes only
 * 
 * IMPORTANT: This should NOT remove the active Turnkey iframe that Account Kit
 * uses for signing. It only cleans up duplicates that can occur during hot reload.
 * 
 * The cleanup is conservative to avoid breaking the signer connection.
 */
export const cleanupExistingIframes = () => {
  if (typeof window === "undefined") return;
  
  // Only clean up if there are MULTIPLE iframes (duplicates)
  // Don't remove the single active iframe!
  const container = document.getElementById("alchemy-signer-iframe-container");
  if (container) {
    const iframes = container.querySelectorAll('iframe');
    // Only clean up if there are more than 1 iframe (keep the first one)
    if (iframes.length > 1) {
      logger.debug(`[IframeCleanup] Found ${iframes.length} iframes, removing duplicates...`);
      // Keep the first iframe, remove the rest
      for (let i = 1; i < iframes.length; i++) {
        try {
          iframes[i].remove();
        } catch (error) {
          logger.warn("Failed to remove duplicate iframe:", error);
        }
      }
    }
  }
  
  // For orphaned iframes outside the container, check for duplicates
  const turnkeyIframes = document.querySelectorAll('iframe[id*="turnkey"], iframe[src*="turnkey"]');
  if (turnkeyIframes.length > 1) {
    logger.debug(`[IframeCleanup] Found ${turnkeyIframes.length} Turnkey iframes, removing duplicates...`);
    // Keep the first one, remove duplicates
    for (let i = 1; i < turnkeyIframes.length; i++) {
      try {
        turnkeyIframes[i].remove();
      } catch (error) {
        logger.warn("Failed to remove duplicate Turnkey iframe:", error);
      }
    }
  }
};

/**
 * Aggressive cleanup for initial mount only
 * This is only called once when the app first loads to ensure a clean slate
 */
export const cleanupAllIframes = () => {
  if (typeof window === "undefined") return;
  
  // Clean up container completely
  const container = document.getElementById("alchemy-signer-iframe-container");
  if (container) {
    container.innerHTML = "";
  }
  
  // Remove all Turnkey iframes
  const turnkeyIframes = document.querySelectorAll('iframe[id*="turnkey"], iframe[src*="turnkey"]');
  turnkeyIframes.forEach(iframe => {
    try {
      iframe.remove();
    } catch (error) {
      logger.warn("Failed to remove Turnkey iframe:", error);
    }
  });
};

/**
 * Client-side component to handle iframe cleanup
 * 
 * Only cleans up duplicates during navigation, NOT the active iframe.
 * This preserves the signer connection while preventing duplicate iframe errors.
 */
export function IframeCleanup() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only do aggressive cleanup on first mount (app initialization)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Don't do aggressive cleanup here - let Account Kit manage its own iframes
      // The AlchemyAccountProvider will create the iframe when needed
    }

    // NO cleanup on unmount - this was breaking the signer connection!
    return () => {
      // Intentionally empty - don't clean up on unmount
    };
  }, []);

  // This component doesn't render anything
  return null;
}
