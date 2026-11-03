// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/sdk/unlock/services", () => ({
  LOCK_ADDRESSES: {
    BASE_CREATIVE_PASS: "0xf7c4cd399395d80f9d61fde833849106775269c6",
    BASE_CREATIVE_PASS_2: "0x13b818daf7016b302383737ba60c3a39fef231cf",
    BASE_CREATIVE_PASS_3: "0x9c3744c96200a52d05a630d4aec0db707d7509be",
  },
}));

import { MembershipPassRows } from "./MembershipPassRows";
import type { MembershipDetails } from "@/lib/hooks/unlock/useMembershipVerification";
import { LOCK_ADDRESSES } from "@/lib/sdk/unlock/services";
import { passAccessUntilMessage } from "@/lib/access/format-pass-expiration";
import {
  buildActivePassCancelKeys,
  passCancelStorageKey,
  prunePassCancelAcknowledgements,
  readPassCancelAcknowledgements,
  writePassCancelAcknowledgements,
} from "@/lib/access/pass-cancel-acknowledgements";
import { showMembershipTabSkeleton } from "@/lib/hooks/unlock/showMembershipTabSkeleton";

const WALLET = "0x1111111111111111111111111111111111111111";
const EXPIRATION = 1_900_000_000;
const NEW_EXPIRATION = 1_900_086_400;

function makePass(
  address: string,
  tokenId: string,
  expiration = EXPIRATION,
): MembershipDetails {
  return {
    name: "BASE_CREATIVE_PASS",
    address: address as MembershipDetails["address"],
    isValid: true,
    lock: null,
    expiration,
    tokenId,
  };
}

function queryInDocument(selector: string) {
  return document.querySelector(selector);
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const defaultRowsProps = {
  walletAddress: WALLET,
  cancelControlsReady: true,
  onPassCancelConfirm: vi.fn(),
};

describe("MembershipPassRows", () => {
  it("renders a cancel control for each valid pass", async () => {
    const passes = [
      makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1"),
      makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS_2, "2"),
    ];
    await act(async () => {
      root.render(<MembershipPassRows passes={passes} cancelledPassKeys={new Set()} {...defaultRowsProps} />);
    });
    expect(container.querySelectorAll('[data-testid="membership-pass-row"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="pass-cancel-trigger"]')).toHaveLength(2);
  });

  it("does not flash Cancel pass before acknowledgement state is ready", async () => {
    const pass = makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1");
    const passKey = passCancelStorageKey(WALLET, pass.address, "1", EXPIRATION);
    await act(async () => {
      root.render(
        <MembershipPassRows
          passes={[pass]}
          cancelledPassKeys={new Set([passKey])}
          cancelControlsReady={false}
          walletAddress={WALLET}
          onPassCancelConfirm={vi.fn()}
        />,
      );
    });
    expect(container.querySelector('[data-testid="pass-cancel-trigger"]')).toBeNull();
    expect(container.querySelector('[data-testid="pass-cancel-loading"]')).not.toBeNull();
  });

  it("shows acknowledged copy on first render when the pass key is already cancelled", async () => {
    const pass = makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1");
    const passKey = passCancelStorageKey(WALLET, pass.address, "1", EXPIRATION);
    const message = passAccessUntilMessage(EXPIRATION);
    await act(async () => {
      root.render(
        <MembershipPassRows
          passes={[pass]}
          cancelledPassKeys={new Set([passKey])}
          {...defaultRowsProps}
        />,
      );
    });
    expect(container.querySelector('[data-testid="pass-cancel-trigger"]')).toBeNull();
    expect(container.querySelector('[data-testid="pass-cancel-acknowledged"]')?.textContent).toBe(
      message,
    );
  });

  it("with two passes, renewing the non-cancelled pass keeps the other cancelled", async () => {
    const lockA = LOCK_ADDRESSES.BASE_CREATIVE_PASS;
    const lockB = LOCK_ADDRESSES.BASE_CREATIVE_PASS_2;
    const passA = makePass(lockA, "1", EXPIRATION);
    const passB = makePass(lockB, "2", EXPIRATION);
    const passBRenewed = makePass(lockB, "2", NEW_EXPIRATION);
    const keyA = passCancelStorageKey(WALLET, lockA, "1", EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([keyA]));

    const cancelledAfterOtherRenewal = prunePassCancelAcknowledgements(
      WALLET,
      buildActivePassCancelKeys(WALLET, [passA, passBRenewed]),
    );

    await act(async () => {
      root.render(
        <MembershipPassRows
          passes={[passA, passBRenewed]}
          cancelledPassKeys={cancelledAfterOtherRenewal}
          {...defaultRowsProps}
        />,
      );
    });

    const rows = container.querySelectorAll('[data-testid="membership-pass-row"]');
    expect(rows[0].querySelector('[data-testid="pass-cancel-acknowledged"]')).not.toBeNull();
    expect(rows[1].querySelector('[data-testid="pass-cancel-trigger"]')).not.toBeNull();
  });

  it("renewing the cancelled pass restores Cancel pass when expiration changes", async () => {
    const lockA = LOCK_ADDRESSES.BASE_CREATIVE_PASS;
    const lockB = LOCK_ADDRESSES.BASE_CREATIVE_PASS_2;
    const passARenewed = makePass(lockA, "1", NEW_EXPIRATION);
    const passB = makePass(lockB, "2", EXPIRATION);
    const oldKeyA = passCancelStorageKey(WALLET, lockA, "1", EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([oldKeyA]));

    const cancelledAfterRenewA = prunePassCancelAcknowledgements(
      WALLET,
      buildActivePassCancelKeys(WALLET, [passARenewed, passB]),
    );
    expect(cancelledAfterRenewA.has(oldKeyA)).toBe(false);

    await act(async () => {
      root.render(
        <MembershipPassRows
          passes={[passARenewed, passB]}
          cancelledPassKeys={cancelledAfterRenewA}
          {...defaultRowsProps}
        />,
      );
    });

    const rows = container.querySelectorAll('[data-testid="membership-pass-row"]');
    expect(rows[0].querySelector('[data-testid="pass-cancel-trigger"]')).not.toBeNull();
    expect(rows[0].querySelector('[data-testid="pass-cancel-acknowledged"]')).toBeNull();
  });

  it("keeps cancelled acknowledgement visible through a refetch-style remount", async () => {
    const pass = makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1");
    const passKey = passCancelStorageKey(WALLET, pass.address, "1", EXPIRATION);
    const message = passAccessUntilMessage(EXPIRATION);
    let loading = false;
    const cancelled = new Set<string>();
    const onPassCancelConfirm = vi.fn(async (key: string) => {
      cancelled.add(key);
      window.localStorage.setItem(
        `crtv3:pass-cancel-ack:${WALLET.toLowerCase()}`,
        JSON.stringify([key]),
      );
      loading = true;
      await Promise.resolve();
      loading = false;
    });

    async function renderRows() {
      const showSkeleton = showMembershipTabSkeleton(loading, true);
      await act(async () => {
        root.render(
          showSkeleton ? (
            <div data-testid="membership-skeleton">loading</div>
          ) : (
            <MembershipPassRows
              passes={[pass]}
              walletAddress={WALLET}
              cancelledPassKeys={cancelled}
              cancelControlsReady
              onPassCancelConfirm={onPassCancelConfirm}
            />
          ),
        );
      });
    }

    await renderRows();
    await act(async () => {
      (container.querySelector('[data-testid="pass-cancel-trigger"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (queryInDocument('[data-testid="pass-cancel-confirm"]') as HTMLButtonElement).click();
    });
    await renderRows();

    expect(onPassCancelConfirm).toHaveBeenCalledWith(passKey);
    expect(readPassCancelAcknowledgements(WALLET).has(passKey)).toBe(true);
    expect(container.querySelector('[data-testid="pass-cancel-acknowledged"]')?.textContent).toBe(
      message,
    );
    expect(container.querySelector('[data-testid="pass-cancel-trigger"]')).toBeNull();
  });
});
