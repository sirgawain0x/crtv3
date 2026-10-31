"use client";

import { CreatorXmerchAdminPanel } from "@/components/Admin/CreatorXmerchAdminPanel";
import { usePlatformAdmin } from "@/lib/hooks/admin/usePlatformAdmin";

export default function CreatorXmerchAdminPage() {
  const { isAdmin, walletAddress, isLoading } = usePlatformAdmin();

  if (isLoading) {
    return <main className="p-8 text-muted-foreground">Loading…</main>;
  }

  if (!walletAddress) {
    return (
      <main className="p-8">
        <p className="text-muted-foreground">Connect the platform admin wallet to manage xMerch.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="p-8">
        <p className="text-destructive">Platform admin wallet required.</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <CreatorXmerchAdminPanel />
    </main>
  );
}
