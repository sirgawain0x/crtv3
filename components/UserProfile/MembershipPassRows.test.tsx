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
  passCancelStorageKey,
  readPassCancelAcknowledgements,
} from "@/lib/access/pass-cancel-acknowledgements";
import { showMembershipTabSkeleton } from "@/lib/hooks/unlock/showMembershipTabSkeleton";

const WALLET = "0x1111111111111111111111111111111111111111";
const EXPIRATION = 1_900_000_000;

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

describe("MembershipPassRows", () => {
  it("renders a cancel control for each valid pass", async () => {
    const passes = [
      makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1"),
      makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS_2, "2"),
    ];
    await act(async () => {
      root.render(
        <MembershipPassRows
          passes={passes}
          walletAddress={WALLET}
          cancelledPassKeys={new Set()}
          onPassCancelConfirm={vi.fn()}
        />,
      );
    });
    expect(container.querySelectorAll('[data-testid="membership-pass-row"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="pass-cancel-trigger"]')).toHaveLength(2);
  });

  it("renders expires on copy for timed passes", async () => {
    const passes = [makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1")];
    await act(async () => {
      root.render(
        <MembershipPassRows
          passes={passes}
          walletAddress={WALLET}
          cancelledPassKeys={new Set()}
          onPassCancelConfirm={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain("Expires on");
    expect(container.textContent).toContain("2030-03-17");
  });

  it("keeps cancelled acknowledgement visible through a refetch-style remount", async () => {
    const pass = makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1");
    const passKey = passCancelStorageKey(WALLET, pass.address, "1");
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
