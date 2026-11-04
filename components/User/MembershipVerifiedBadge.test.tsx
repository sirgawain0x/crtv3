// @vitest-environment jsdom
/* global globalThis */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sdk/unlock/services", () => ({ LOCK_ADDRESSES: {
  BASE_CREATIVE_PASS: "0xf7c4cd399395d80f9d61fde833849106775269c6",
  BASE_CREATIVE_PASS_2: "0x13b818daf7016b302383737ba60c3a39fef231cf",
  BASE_CREATIVE_PASS_3: "0x9c3744c96200a52d05a630d4aec0db707d7509be",
} }));
import { MembershipVerifiedBadge } from "./MembershipVerifiedBadge";
const creatorLock = "0xf7c4cd399395d80f9d61fde833849106775269c6";
const brandLock = "0x9c3744c96200a52d05a630d4aec0db707d7509be";
let root: Root;
let container: HTMLDivElement;
let ownerNumber = 1;
let address: string;
const fetchMock = vi.fn();
const reply = (lock: string, isValid = true) => ({ ok: true, json: async () => ({ memberships: [{ address: lock, isValid }] }) });
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  address = `0x${String(ownerNumber++).padStart(40, "0")}`;
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render() { await act(async () => root.render(<MembershipVerifiedBadge address={address} />)); }

describe("membership verified checkmarks", () => {
  it("shows the blue checkmark for a valid creator pass", async () => {
    fetchMock.mockResolvedValue(reply(creatorLock)); await render();
    expect(container.querySelector('[aria-label="Creative member"]')?.className).toContain("text-[#1D9BF0]");
  });
  it("shows the gold checkmark for a valid brand pass", async () => {
    fetchMock.mockResolvedValue(reply(brandLock)); await render();
    expect(container.querySelector('[aria-label="Creative Brand Pass"]')?.className).toContain("text-[#EAB308]");
  });
  it("does not verify an expired pass", async () => {
    fetchMock.mockResolvedValue(reply(brandLock, false)); await render();
    expect(container.querySelector("svg")).toBeNull();
  });
  it("recovers after an API failure instead of caching non-membership for the session", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false }).mockResolvedValue(reply(brandLock)); await render();
    expect(container.querySelector("svg")).toBeNull();
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[aria-label="Creative Brand Pass"]')).not.toBeNull();
  });
  it("drops the previous wallet badge when the address changes", async () => {
    fetchMock.mockResolvedValueOnce(reply(brandLock)).mockResolvedValue(reply(creatorLock, false)); await render();
    address = `0x${String(ownerNumber++).padStart(40, "0")}`; await render();
    expect(container.querySelector("svg")).toBeNull();
  });
});
