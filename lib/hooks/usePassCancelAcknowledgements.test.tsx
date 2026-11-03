// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  passCancelStorageKey,
  readPassCancelAcknowledgements,
  writePassCancelAcknowledgements,
} from "@/lib/access/pass-cancel-acknowledgements";
import { usePassCancelAcknowledgements } from "./usePassCancelAcknowledgements";

const WALLET = "0x2222222222222222222222222222222222222222";
const LOCK = "0xf7c4cd399395d80f9d61fde833849106775269c6";
const EXPIRATION = 1_900_000_000;
const NEW_EXPIRATION = 1_900_086_400;

function activeKeys(expiration = EXPIRATION) {
  return new Set([passCancelStorageKey(WALLET, LOCK, "1", expiration)]);
}

async function renderHook(
  walletAddress: string | undefined,
  activePassKeys: Set<string>,
) {
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  const resultRef: { current: ReturnType<typeof usePassCancelAcknowledgements> | null } = {
    current: null,
  };

  function Harness() {
    resultRef.current = usePassCancelAcknowledgements(walletAddress, activePassKeys);
    return null;
  }

  await act(async () => {
    root.render(<Harness />);
  });

  return {
    get result() {
      return resultRef.current!;
    },
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe("usePassCancelAcknowledgements", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("reads localStorage synchronously on the first render with a wallet", async () => {
    const key = passCancelStorageKey(WALLET, LOCK, "1", EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([key]));

    const view = await renderHook(WALLET, activeKeys());
    expect(view.result.cancelControlsReady).toBe(true);
    expect(view.result.cancelledPassKeys.has(key)).toBe(true);
    await view.unmount();
  });

  it("does not mark controls ready until the wallet address is available", async () => {
    const view = await renderHook(undefined, new Set());
    expect(view.result.cancelControlsReady).toBe(false);
    await view.unmount();
  });

  it("drops stale expiration keys and clears a lock after buy-again", async () => {
    const oldKey = passCancelStorageKey(WALLET, LOCK, "1", EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([oldKey]));

    const view = await renderHook(WALLET, activeKeys(NEW_EXPIRATION));
    expect(view.result.cancelledPassKeys.has(oldKey)).toBe(false);

    const renewedKey = passCancelStorageKey(WALLET, LOCK, "1", NEW_EXPIRATION);
    await act(async () => {
      view.result.acknowledgePassCancel(renewedKey);
    });
    expect(view.result.cancelledPassKeys.has(renewedKey)).toBe(true);

    await act(async () => {
      view.result.clearPassCancelForLock(LOCK);
    });
    expect(view.result.cancelledPassKeys.has(renewedKey)).toBe(false);
    expect(readPassCancelAcknowledgements(WALLET).has(renewedKey)).toBe(false);
    await view.unmount();
  });
});
