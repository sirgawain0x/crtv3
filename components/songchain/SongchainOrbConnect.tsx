"use client";

import { Button } from "@/components/ui/button";
import { useOrbSession } from "@/context/OrbSessionContext";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { CheckCircle2, Link2, LogIn } from "lucide-react";

export function SongchainOrbConnect() {
  const orb = useOrbSession();
  const lensWrite = useLensOrbWrite();

  if (lensWrite.canWrite) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>
          Orb linked
          {lensWrite.lensAccount
            ? ` · ${lensWrite.lensAccount.slice(0, 6)}…${lensWrite.lensAccount.slice(-4)}`
            : ''}
          — you can like posts and join the group.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm">
        <Link2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          {lensWrite.needsLink
            ? 'Orb signed in — link your wallet profile to unlock likes and group join.'
            : 'Browse feeds in read-only mode. Sign in with Orb and link your account to interact.'}
        </span>
      </div>
      <Button size="sm" variant="secondary" onClick={() => orb.openLoginModal()}>
        <LogIn className="h-4 w-4 mr-2" />
        {orb.isAuthenticated ? 'Link Orb' : 'Sign in with Orb'}
      </Button>
    </div>
  );
}
