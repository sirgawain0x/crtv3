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

const QR_TIMEOUT_MS = 120_000;

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
  const [timedOut, setTimedOut] = useState(false);
  const startedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayError =
    localError ??
    loginError ??
    (timedOut ? 'QR sign-in timed out. Try again or cancel.' : null);

  const resetFlow = useCallback(() => {
    setQrCode(null);
    setDeepLink(null);
    setLocalError(null);
    setTimedOut(false);
    clearLoginError();
    startedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [clearLoginError]);

  const startConnect = useCallback(async () => {
    setIsConnecting(true);
    setLocalError(null);
    setTimedOut(false);
    clearLoginError();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      setIsConnecting(false);
    }, QR_TIMEOUT_MS);
    try {
      await connectWithQr(({ qrCode: qr, deepLink: link }) => {
        setQrCode(qr);
        setDeepLink(link ?? null);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Orb sign-in failed');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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

    if ((displayError && !timedOut) || startedRef.current) return;

    startedRef.current = true;
    void startConnect();
  }, [
    isLoginModalOpen,
    isAuthenticated,
    hasWallet,
    closeLoginModal,
    resetFlow,
    displayError,
    timedOut,
    startConnect,
  ]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCancel = () => {
    resetFlow();
    closeLoginModal();
  };

  return (
    <Dialog
      open={isLoginModalOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
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
          {isConnecting && !qrCode && !displayError && (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          )}
          {qrCode && !displayError && (
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
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {(displayError || qrCode) && (
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
            )}
            <Button
              variant={displayError || qrCode ? 'secondary' : 'outline'}
              className="flex-1"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
