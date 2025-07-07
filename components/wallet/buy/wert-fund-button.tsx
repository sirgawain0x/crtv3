"use client";

import { useRef, useState } from "react";
import WertWidget from "@wert-io/widget-initializer";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { useUser, useSmartAccountClient } from "@account-kit/react";

/*
  In this example we initialize a simple crypto purchase.
  If you are looking for the full documentation or the smart contract example,
  please refer to https://www.npmjs.com/package/@wert-io/module-react-component
*/

function WertFundButton() {
  const wertWidgetRef = useRef<any>(null);
  const user = useUser();
  const { address } = useSmartAccountClient({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDeposit() {
    setError(null);
    setLoading(true);
    if (!address) {
      setError("No wallet address found");
      setLoading(false);
      return;
    }
    try {
      // For demo, use a default amount (e.g., 10 USD)
      const amount = 10;
      const res = await fetch("/api/wert/hpp-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          amount,
          email: user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create Wert session");
        setLoading(false);
        return;
      }
      const partnerId = process.env.NEXT_PUBLIC_WERT_PARTNER_ID;
      console.log("DEBUG: NEXT_PUBLIC_WERT_PARTNER_ID =", partnerId);
      if (!partnerId) {
        setError("WERT partner ID is not set in environment");
        setLoading(false);
        return;
      }
      const options = {
        partner_id: partnerId,
        session_id: data.sessionId,
        origin: "https://widget.wert.io",
        click_id: uuidv4(),
        theme: "dark" as const,
        network: "base",
        commodity: "USDC",
        commodities: JSON.stringify([
          {
            commodity: "USDC",
            network: "base",
          },
          {
            commodity: "ETH",
            network: "base",
          },
        ]),
        listeners: {
          loaded: () => {},
          close: () => {},
          "payment-status": (data: any) => {},
        },
      };
      if (!wertWidgetRef.current) {
        wertWidgetRef.current = new WertWidget(options);
      }
      wertWidgetRef.current.open();
    } catch (err) {
      setError("Failed to start Wert session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleDeposit} disabled={loading}>
        {loading ? "Loading..." : "Deposit Funds"}
      </Button>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}

export default WertFundButton;
