import { Button } from "@/components/ui/button";
import { useSmartAccountClient, useSignMessage } from "@account-kit/react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface DaiFundButtonProps {
  onSuccess?: () => void;
  presetAmount?: number;
  className?: string;
}

export function DaiFundButton({ onSuccess, presetAmount = 50, className }: DaiFundButtonProps) {
  const { address, client } = useSmartAccountClient({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use Account Kit's useSignMessage hook (works for both EOA and Smart Accounts)
  const { signMessage, isSigningMessage } = useSignMessage({
    client,
    onSuccess: (result) => {
      console.log('Message signed successfully:', result);
    },
    onError: (error) => {
      console.error('Error signing message:', error);
      setError(`Signing failed: ${error.message}`);
    },
  });

  async function handleFund() {
    if (!address || !client) return;

    setIsLoading(true);
    setError(null);
    try {
      // Create a unique message for wallet signature authentication
      const timestamp = Date.now();
      const message = `Authenticate DAI purchase for ${address} at ${timestamp}`;
      
      // Request wallet signature for authentication using Account Kit's useSignMessage hook
      // This works for both EOA and Smart Accounts
      const signature = await signMessage({ message });
      
      // Fetch session token from your backend with signature
      const res = await fetch("/api/coinbase/session-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          address, 
          assets: ["DAI"], // Request DAI specifically
          signature,
          message
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get session token: ${res.status}`);
      }
      
      const { sessionToken } = await res.json();
      setIsLoading(false);

      if (!sessionToken) {
        throw new Error("Failed to get session token");
      }

            // Generate the One-Click-Buy URL as per Coinbase documentation
            const urlParams = new URLSearchParams({
              sessionToken: sessionToken,
              presetFiatAmount: presetAmount.toString(),
              fiatCurrency: 'USD',
              defaultAsset: 'DAI',
            });
            
            const onrampBuyUrl = `https://pay.coinbase.com/buy?${urlParams.toString()}`;

      // Open in new tab
      const newWindow = window.open(onrampBuyUrl, "_blank");
      
      // Listen for the window to close (user completed or cancelled)
      if (newWindow) {
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkClosed);
            // Call success callback after a short delay to allow for transaction processing
            setTimeout(() => {
              onSuccess?.();
            }, 2000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to fund DAI:', error);
      setError(error instanceof Error ? error.message : 'Failed to fund DAI');
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button 
        onClick={handleFund} 
        disabled={isLoading || isSigningMessage}
        className={className}
      >
        {isSigningMessage ? "Signing..." : isLoading ? "Loading..." : `Buy DAI ($${presetAmount})`}
      </Button>
    </div>
  );
}

export default DaiFundButton;
