"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  destroyClient,
  initializeClient,
  openHallidayPayments,
} from "@halliday-sdk/payments";
import { connectWalletClient } from "@halliday-sdk/payments/viem";
import { useAuthModal, useSmartAccountClient, useUser } from "@account-kit/react";
import type { WalletClient } from "viem";
import { Button } from "@/components/ui/button";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { Wallet } from "lucide-react";

export type HallidayOnrampProps = {
  hallidayApiKey: string | null;
  hallidayOutputAsset: string;
  hallidaySandbox: boolean;
};

export function HallidayOnramp({
  hallidayApiKey,
  hallidayOutputAsset,
  hallidaySandbox,
}: HallidayOnrampProps) {
  const { openAuthModal } = useAuthModal();
  const user = useUser();
  const { client: smartAccountClient, address: smartAccountAddress } =
    useSmartAccountClient({});
  const { lensAccount } = useLensOrbWrite();

  const [error, setError] = useState<string | null>(null);

  const destinationAddress = useMemo(() => {
    return (
      lensAccount ??
      smartAccountClient?.account?.address ??
      smartAccountAddress ??
      user?.address ??
      null
    );
  }, [
    lensAccount,
    smartAccountClient?.account?.address,
    smartAccountAddress,
    user?.address,
  ]);

  const userWallet = useMemo(() => {
    if (!smartAccountClient || !destinationAddress) return undefined;
    return connectWalletClient(
      () => smartAccountClient as unknown as WalletClient,
      "HIDE",
    );
  }, [smartAccountClient, destinationAddress]);

  const baseParams = useMemo(
    () => ({
      apiKey: hallidayApiKey ?? "",
      outputs: [hallidayOutputAsset],
      sandbox: hallidaySandbox,
      windowType: "MODAL" as const,
      destinationAddress: destinationAddress ?? undefined,
      userWallet,
      onError: (err: Error) => {
        setError(err.message || "Halliday widget failed to load.");
      },
      onConnectUserWallet: () => openAuthModal(),
    }),
    [
      hallidayApiKey,
      hallidayOutputAsset,
      hallidaySandbox,
      destinationAddress,
      userWallet,
      openAuthModal,
    ],
  );

  useEffect(() => {
    if (!hallidayApiKey) return;

    initializeClient({
      ...baseParams,
      onError: (err) => {
        setError(err.message || "Halliday failed to preload.");
      },
    });

    return () => {
      destroyClient();
    };
  }, [hallidayApiKey, baseParams]);

  const requireWallet = useCallback((): boolean => {
    if (destinationAddress) return true;
    setError("Connect your wallet (or link Orb) so Halliday knows where to send GHO.");
    openAuthModal();
    return false;
  }, [destinationAddress, openAuthModal]);

  const openOnramp = useCallback(() => {
    if (!hallidayApiKey || !requireWallet()) return;
    setError(null);
    try {
      openHallidayPayments(baseParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open Halliday.");
    }
  }, [hallidayApiKey, requireWallet, baseParams]);

  if (!hallidayApiKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Fund your Lens wallet with GHO via Halliday — set{" "}
        <code className="text-xs">NEXT_PUBLIC_HALLIDAY_API_KEY</code> (or{" "}
        <code className="text-xs">HALLIDAY_API_KEY</code> on the server) to enable.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-violet-400" aria-hidden />
            Fund on Lens Chain
          </h3>
          <p className="text-sm text-muted-foreground">
            Halliday onramp for GHO on Lens — destination{" "}
            {destinationAddress
              ? `${destinationAddress.slice(0, 6)}…${destinationAddress.slice(-4)}`
              : "connect wallet"}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={openOnramp}>
          Get GHO
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={openOnramp}>
            Try again
          </button>
        </p>
      )}

      {!destinationAddress && (
        <p className="mt-3 text-sm text-amber-200/90">
          Sign in and connect a wallet so funds arrive at your Lens destination address.
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Opens the full Halliday checkout in a modal so you can pick fiat currency and
        payment methods on mobile.
      </p>
    </div>
  );
}
