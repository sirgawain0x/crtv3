import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { passAccessUntilMessage } from "@/lib/access/format-pass-expiration";
import { MembershipPassRows } from "./MembershipPassRows";
import type { MembershipDetails } from "@/lib/hooks/unlock/useMembershipVerification";
import { LOCK_ADDRESSES } from "@/lib/sdk/unlock/services";

const EXPIRATION = 1_900_000_000;
const HARNESS_WALLET = "0x1111111111111111111111111111111111111111";

function makePass(address: string, tokenId: string): MembershipDetails {
  return {
    name: "BASE_CREATIVE_PASS",
    address: address as MembershipDetails["address"],
    isValid: true,
    lock: null,
    expiration: EXPIRATION,
    tokenId,
  };
}

export function renderSinglePassCancelMarkup(): string {
  return renderToStaticMarkup(
    <div className="p-6 max-w-2xl mx-auto bg-background text-foreground">
      <MembershipPassRows
        passes={[makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1")]}
        walletAddress={HARNESS_WALLET}
        cancelledPassKeys={new Set()}
        cancelControlsReady
        onPassCancelConfirm={() => undefined}
      />
    </div>,
  );
}

export function renderMultiPassCancelMarkup(): string {
  return renderToStaticMarkup(
    <div className="p-6 max-w-2xl mx-auto bg-background text-foreground">
      <MembershipPassRows
        passes={[
          makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1"),
          makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS_3, "9"),
        ]}
        walletAddress={HARNESS_WALLET}
        cancelledPassKeys={new Set()}
        cancelControlsReady
        onPassCancelConfirm={() => undefined}
      />
    </div>,
  );
}

export function renderCancelDialogOpenMarkup(): string {
  const accessMessage = passAccessUntilMessage(EXPIRATION);
  return renderToStaticMarkup(
    <div className="p-6 max-w-lg mx-auto bg-background text-foreground relative min-h-[420px]">
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-md bg-destructive px-3 text-sm text-destructive-foreground"
      >
        Cancel pass
      </button>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg space-y-4">
          <h2 className="text-lg font-semibold">Cancel this pass?</h2>
          <div className="space-y-2 text-sm text-muted-foreground text-gray-600">
            <p>
              Creative passes are 30-day access passes. You buy again manually when you want
              continued access—nothing charges on its own.
            </p>
            <p>
              Cancelling means you will not buy again for this pass when it expires. {accessMessage}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-md border px-4 py-2 text-sm">
              Keep pass
            </button>
            <button
              type="button"
              className="rounded-md bg-destructive px-4 py-2 text-sm text-white"
            >
              Yes, cancel pass
            </button>
          </div>
        </div>
      </div>
    </div>,
  );
}

export function buildVisualHtmlDocument(bodyMarkup: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; }
    [data-state="open"] { display: block !important; }
  </style>
</head>
<body>${bodyMarkup}</body>
</html>`;
}
