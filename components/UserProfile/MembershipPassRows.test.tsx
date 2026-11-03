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

const EXPIRATION = 1_900_000_000;

function makePass(
  address: string,
  tokenId: string,
): MembershipDetails {
  return {
    name: "BASE_CREATIVE_PASS",
    address: address as MembershipDetails["address"],
    isValid: true,
    lock: null,
    expiration: EXPIRATION,
    tokenId,
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
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
      root.render(<MembershipPassRows passes={passes} />);
    });
    expect(container.querySelectorAll('[data-testid="membership-pass-row"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="pass-cancel-trigger"]')).toHaveLength(2);
  });

  it("renders expires on copy for timed passes", async () => {
    const passes = [makePass(LOCK_ADDRESSES.BASE_CREATIVE_PASS, "1")];
    await act(async () => {
      root.render(<MembershipPassRows passes={passes} />);
    });
    expect(container.textContent).toContain("Expires on");
    expect(container.textContent).toContain("2030-03-17");
  });
});
