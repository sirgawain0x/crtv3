"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSmartAccountClient } from "@account-kit/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * CoinbaseFundButton Component
 * 
 * Replaces WertFundButton with Coinbase CDP Onramp integration.
 * Supports USDC and ETH on Base network.
 * Note: DAI is not available on Base for onramp (only on Ethereum, Avalanche C-Chain, Optimism, Arbitrum)
 * 
 * Required Environment Variables:
 * - COINBASE_CDP_API_KEY_ID
 * - COINBASE_CDP_API_KEY_SECRET
 */

interface CoinbaseFundButtonProps {
  onClose?: () => void;
  presetAmount?: number; // Optional preset fiat amount in USD
  defaultAsset?: "USDC" | "ETH"; // Optional default asset (DAI not available on Base for onramp)
  className?: string;
}

function CoinbaseFundButton({
  onClose,
  presetAmount = 10,
  defaultAsset,
  className,
}: CoinbaseFundButtonProps) {
  const { address } = useSmartAccountClient({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Fallback method to detect popup closure when COOP blocks window.closed access
   * Uses focus detection, window reference checking, and timeout as alternatives
   */
  function handlePopupCloseFallback(
    popupWindow: Window,
    baseCleanup: () => void,
    onClose?: () => void
  ) {
    let focusTimeoutId: NodeJS.Timeout | null = null;
    let maxWaitTimeoutId: NodeJS.Timeout | null = null;
    let wasFocused = false;

    const fullCleanup = () => {
      baseCleanup();
      if (focusTimeoutId) {
        clearTimeout(focusTimeoutId);
        focusTimeoutId = null;
      }
      if (maxWaitTimeoutId) {
        clearTimeout(maxWaitTimeoutId);
        maxWaitTimeoutId = null;
      }
      window.removeEventListener("focus", handleFocus);
    };

    const triggerClose = () => {
      fullCleanup();
      setTimeout(() => {
        onClose?.();
      }, 2000);
    };

    // Track when main window regains focus (indicates popup may have closed)
    const handleFocus = () => {
      if (!wasFocused) {
        wasFocused = true;
        // Wait a bit to see if popup is still open
        focusTimeoutId = setTimeout(() => {
          try {
            // Try to access popup - if it throws, it's likely closed
            popupWindow.focus();
            // If we can focus it, it's still open, reset the flag
            wasFocused = false;
          } catch (error) {
            // Popup is likely closed or inaccessible
            triggerClose();
          }
        }, 1000);
      }
    };

    window.addEventListener("focus", handleFocus);

    // Set a maximum wait time (5 minutes) - cleanup after timeout
    maxWaitTimeoutId = setTimeout(() => {
      fullCleanup();
    }, 5 * 60 * 1000);
  }

  async function handleDeposit() {
    setError(null);
    setLoading(true);

    if (!address) {
      setError("No wallet address found");
      setLoading(false);
      return;
    }

    try {
      // Fetch session token from backend
      const res = await fetch("/api/coinbase/session-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          assets: ["USDC", "ETH"], // USDC and ETH only - DAI not available on Base for onramp
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create Coinbase session");
        setLoading(false);
        return;
      }

      if (!data.sessionToken) {
        setError("Failed to get session token");
        setLoading(false);
        return;
      }

      // Generate the Onramp URL
      const urlParams = new URLSearchParams({
        sessionToken: data.sessionToken,
        defaultNetwork: "base",
        presetFiatAmount: presetAmount.toString(),
        fiatCurrency: "USD",
      });

      // Add default asset if specified
      if (defaultAsset) {
        urlParams.append("defaultAsset", defaultAsset);
      }

      const onrampBuyUrl = `https://pay.coinbase.com/buy?${urlParams.toString()}`;

      // Open in new tab/popup
      const newWindow = window.open(onrampBuyUrl, "_blank");

      // Close the dialog when the onramp window opens
      onClose?.();

      // Listen for the window to close (user completed or cancelled)
      if (newWindow) {
        let checkClosedIntervalId: NodeJS.Timeout | null = null;
        let messageListener: ((event: MessageEvent) => void) | null = null;
        let fallbackActive = false; // Track if fallback detection is active

        // Cleanup function
        const cleanup = () => {
          if (checkClosedIntervalId) {
            clearInterval(checkClosedIntervalId);
            checkClosedIntervalId = null;
          }
          if (messageListener) {
            window.removeEventListener("message", messageListener);
            messageListener = null;
          }
        };

        // Method 1: Try to use window.closed (may be blocked by COOP)
        try {
          checkClosedIntervalId = setInterval(() => {
            try {
              // Check if window is closed
              if (newWindow.closed) {
                cleanup();
              }
            } catch (error) {
              // COOP policy blocked access to window.closed
              // Fall back to alternative detection methods
              console.warn(
                "Cannot access window.closed due to COOP policy, using alternative detection"
              );
              cleanup();
              // Use focus-based detection as fallback
              fallbackActive = true;
              handlePopupCloseFallback(newWindow, cleanup, onClose);
            }
          }, 1000);
        } catch (error) {
          console.warn(
            "Cannot set up window.closed check due to COOP policy, using alternative detection"
          );
          // Use focus-based detection as fallback
          fallbackActive = true;
          handlePopupCloseFallback(newWindow, cleanup, onClose);
        }

        // Method 2: Listen for postMessage events (if Coinbase sends them)
        // Only set up if fallback is not already active to avoid duplicate detection
        if (!fallbackActive) {
          messageListener = (event: MessageEvent) => {
            // Verify origin for security
            if (
              event.origin === "https://pay.coinbase.com" ||
              event.origin === window.location.origin
            ) {
              // Handle any messages from Coinbase (if they send completion messages)
              if (
                event.data === "payment-complete" ||
                event.data === "popup-closed" ||
                event.data === "payment-success"
              ) {
                cleanup();
              }
            }
          };
          window.addEventListener("message", messageListener);
        }
      }
    } catch (err) {
      console.error("Failed to start Coinbase onramp:", err);
      setError("Failed to start Coinbase onramp. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDeposit}
        disabled={loading}
        className={className || "w-full mb-4"}
      >
        {loading ? "Loading..." : "Deposit Funds"}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default CoinbaseFundButton;

