'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useOrbSession } from '@/context/OrbSessionContext';

export function OrbLoginModal() {
  const {
    isLoginModalOpen,
    closeLoginModal,
    connectWithQr,
    isAuthenticated,
    loginError,
    clearLoginError,
    hasWallet,
  } = useOrbSession();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const displayError = localError ?? loginError;

  const resetFlow = useCallback(() => {
    setQrCode(null);
    setDeepLink(null);
    setLocalError(null);
    clearLoginError();
    startedRef.current = false;
  }, [clearLoginError]);

  const startConnect = useCallback(async () => {
    setIsConnecting(true);
    setLocalError(null);
    clearLoginError();
    try {
      await connectWithQr(({ qrCode: qr, deepLink: link }) => {
        setQrCode(qr);
        setDeepLink(link ?? null);
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Orb sign-in failed');
    } finally {
      setIsConnecting(false);
    }
  }, [connectWithQr, clearLoginError]);

  useEffect(() => {
    if (!isLoginModalOpen) {
      resetFlow();
      setIsConnecting(false);
      return;
    }

    if (isAuthenticated || !hasWallet) {
      closeLoginModal();
      return;
    }

    if (displayError || startedRef.current) return;

    startedRef.current = true;
    void startConnect();
  }, [
    isLoginModalOpen,
    isAuthenticated,
    hasWallet,
    closeLoginModal,
    resetFlow,
    displayError,
    startConnect,
  ]);

  return (
    <Dialog
      open={isLoginModalOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetFlow();
          closeLoginModal();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Lens with Orb</DialogTitle>
          <DialogDescription>
            Scan the QR code with the Orb app to connect your Lens identity to the
            wallet you signed in with.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {isConnecting && !qrCode && (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          )}
          {qrCode && (
            <div className="relative h-56 w-56 overflow-hidden rounded-lg border bg-white p-2">
              <Image
                src={qrCode}
                alt="Orb sign-in QR code"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
          {deepLink && !displayError && (
            <Button variant="outline" size="sm" className="lg:hidden" asChild>
              <a href={deepLink} target="_blank" rel="noopener noreferrer">
                Open in Orb app
              </a>
            </Button>
          )}
          {displayError && (
            <p className="text-center text-sm text-destructive">{displayError}</p>
          )}
          {displayError && (
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  resetFlow();
                  void startConnect();
                }}
                disabled={isConnecting}
              >
                Try again
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  resetFlow();
                  closeLoginModal();
                }}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
