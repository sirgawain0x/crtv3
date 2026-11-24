"use client";
import { useState } from "react";
import { usePlatformAdmin } from "@/lib/hooks/admin/usePlatformAdmin";
import { usePlatformAdminWalletAuth } from "@/lib/hooks/admin/usePlatformAdminWalletAuth";
export default function ChannelOperator() {
  const { adminAuthAddress, isAdmin } = usePlatformAdmin();
  const { getAuthHeaders, isReady } =
    usePlatformAdminWalletAuth(adminAuthAddress);
  const [snapshot, setSnapshot] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function prepare(mode:'prepare'|'inspect-playback'='prepare') {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/migration/frameworks/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(mode==='prepare'?JSON.parse(snapshot):{mode,snapshot:JSON.parse(snapshot)}),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Channel preparation stopped");
      setMessage(JSON.stringify(result));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Channel preparation stopped",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!isAdmin)
    return (
      <main className="p-8">
        <h1>Channel migration</h1>
        <p>Sign in with the platform admin wallet.</p>
      </main>
    );
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1>Prepare channel replacement</h1>
      <p>
        Prepare one reviewed offline channel. Active channel credentials stay
        unchanged until the separate guarded cutover.
      </p>
      <label htmlFor="channel-snapshot">Reviewed channel snapshot</label>
      <textarea
        id="channel-snapshot"
        className="block w-full border p-3"
        rows={12}
        value={snapshot}
        disabled={busy}
        onChange={(e) => setSnapshot(e.target.value)}
      />
      <button
        className="rounded border p-3"
        disabled={busy || !isReady || !snapshot}
        onClick={()=>prepare()}
      >
        {busy ? "Preparing…" : "Prepare replacement"}
      </button>
      <button className="rounded border p-3" disabled={busy||!isReady||!snapshot} onClick={()=>prepare('inspect-playback')}>Check channel playback</button>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
