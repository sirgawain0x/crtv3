'use client';

import { Loader2 } from 'lucide-react';
import { useOrbSession } from '@/context/OrbSessionContext';

/** Full-screen overlay while Orb profile is linking after QR sign-in. */
export function OrbLinkingOverlay() {
  const { isLinking } = useOrbSession();

  if (!isLinking) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Linking Orb profile"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-card px-8 py-6 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm font-medium">Linking your Orb / Lens profile…</p>
        <p className="text-xs text-muted-foreground max-w-xs text-center">
          Confirm any wallet signature if prompted. This usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}
