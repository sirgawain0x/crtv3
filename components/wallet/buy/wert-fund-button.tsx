import { useState } from "react";
import { useWertWidget } from "@wert-io/module-react-component";
import type {
  GeneralOptions,
  ReactiveOptions,
} from "@wert-io/module-react-component";
import {
  useSigner,
  useBundlerClient,
  useSmartAccountClient,
  useUser,
  useSignerStatus,
  useAuthenticate,
} from "@account-kit/react";
import { AlchemyWebSigner } from "@account-kit/signer";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";

/*
  In this example we initialize a simple crypto purchase.
  If you are looking for the full documentation or the smart contract example,
  please refer to https://www.npmjs.com/package/@wert-io/module-react-component
*/

function WertFundButton() {
  const signer: AlchemyWebSigner | null = useSigner();
  const bundlerClient = useBundlerClient();
  const user = useUser();
  const { address } = useSmartAccountClient({});
  const [reactiveOptions] = useState<ReactiveOptions>({
    theme: "dark",
    listeners: {
      loaded: () => console.log("loaded"),
    },
  });
  const { open: openWertWidget, isWidgetOpen } = useWertWidget(reactiveOptions);
  const signerStatus = useSignerStatus();
  const { authenticateAsync, isPending: isAuthPending } = useAuthenticate();
  const [error, setError] = useState<string | null>(null);

  async function handleDeposit() {
    setError(null);
    if (!address) return;

    // Prepare wallets array for ETH and USDC on Base
    const wallets = [
      {
        name: "ETH",
        network: "base",
        address,
      },
      {
        name: "USDC",
        network: "base",
        address,
      },
    ];

    try {
      const res = await fetch("/api/wert/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          email: user?.email,
          extra: { wallets },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create Wert session");
        return;
      }
      openWertWidget({ options: data.session });
      console.log(isWidgetOpen);
    } catch (err) {
      setError("Failed to connect to Wert backend");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleDeposit} disabled={isAuthPending}>
        Deposit Funds
      </Button>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}

export default WertFundButton;
