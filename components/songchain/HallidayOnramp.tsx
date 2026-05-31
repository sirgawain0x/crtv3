"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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

const CONTAINER_ID_PREFIX = "halliday-onramp";

export function HallidayOnramp({
  hallidayApiKey,
  hallidayOutputAsset,
  hallidaySandbox,
}: HallidayOnrampProps) {
  const reactId = useId().replace(/:/g, "");
  const containerId = `${CONTAINER_ID_PREFIX}-${reactId}`;
  const containerRef = useRef<HTMLDivElement>(null);

  const { openAuthModal } = useAuthModal();
  const user = useUser();
  const { client: smartAccountClient, address: smartAccountAddress } =
    useSmartAccountClient({});
  const { lensAccount } = useLensOrbWrite();

  const [embedOpen, setEmbedOpen] = useState(false);
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

  const openEmbedded = useCallback(() => {
    if (!hallidayApiKey || !requireWallet()) return;
    setError(null);
    setEmbedOpen(true);
  }, [hallidayApiKey, requireWallet]);

  useEffect(() => {
    if (!embedOpen || !hallidayApiKey || !destinationAddress) return;
    if (!containerRef.current) return;

    setError(null);

    try {
      openHallidayPayments({
        ...baseParams,
        targetElementId: containerId,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open Halliday embed.",
      );
    }
  }, [embedOpen, hallidayApiKey, destinationAddress, containerId, baseParams]);

  const openModal = useCallback(() => {
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        {!embedOpen && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={openEmbedded}>
              Get GHO
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openModal}>
              Open modal
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={openModal}>
            Try modal
          </button>
        </p>
      )}

      {!destinationAddress && (
        <p className="mb-3 text-sm text-amber-200/90">
          Sign in and connect a wallet so funds arrive at your Lens destination address.
        </p>
      )}

      {embedOpen && (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            On the Use cash tab, pick your fiat currency in the Halliday widget
            header (top of the panel). If you do not see it, scroll up inside the
            panel or use Open modal for the full view.
          </p>
          <div
            ref={containerRef}
            id={containerId}
            className="relative min-h-[520px] w-full overflow-auto rounded-md border border-border/40 bg-muted/20"
          />
        </>
      )}
    </div>
  );
}
