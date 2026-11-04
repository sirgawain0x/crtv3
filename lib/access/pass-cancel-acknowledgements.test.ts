// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import {
  addPassCancelAcknowledgement,
  clearPassCancelAcknowledgementsForLock,
  passCancelStorageKey,
  prunePassCancelAcknowledgements,
  readPassCancelAcknowledgements,
  writePassCancelAcknowledgements,
} from "./pass-cancel-acknowledgements";

const WALLET = "0xAbCdEf1234567890123456789012345678901234";
const LOCK = "0xf7c4cd399395d80f9d61fde833849106775269c6";
const EXPIRATION = 1_900_000_000;
const NEW_EXPIRATION = 1_900_086_400;

describe("pass-cancel-acknowledgements", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds stable pass keys including expiration", () => {
    expect(passCancelStorageKey(WALLET, LOCK, "42", EXPIRATION)).toBe(
      `${WALLET.toLowerCase()}:${LOCK.toLowerCase()}:42:${EXPIRATION}`,
    );
  });

  it("persists and reads acknowledgement keys per wallet", () => {
    const key = passCancelStorageKey(WALLET, LOCK, "1", EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([key]));
    expect(readPassCancelAcknowledgements(WALLET).has(key)).toBe(true);
    expect(readPassCancelAcknowledgements("0x0000000000000000000000000000000000000001").size).toBe(
      0,
    );
  });

  it("ignores legacy keys without expiration on read", () => {
    writePassCancelAcknowledgements(
      WALLET,
      new Set([`${WALLET.toLowerCase()}:${LOCK.toLowerCase()}:1`]),
    );
    expect(readPassCancelAcknowledgements(WALLET).size).toBe(0);
  });

  it("prunes acknowledgements that no longer match active pass expirations", () => {
    const oldKey = passCancelStorageKey(WALLET, LOCK, "1", EXPIRATION);
    const newKey = passCancelStorageKey(WALLET, LOCK, "1", NEW_EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([oldKey]));

    const pruned = prunePassCancelAcknowledgements(WALLET, new Set([newKey]));
    expect(pruned.has(oldKey)).toBe(false);
    expect(readPassCancelAcknowledgements(WALLET).has(oldKey)).toBe(false);
  });

  it("addPassCancelAcknowledgement merges into storage", () => {
    const key = passCancelStorageKey(WALLET, LOCK, "9", EXPIRATION);
    const next = addPassCancelAcknowledgement(WALLET, key, new Set());
    expect(next.has(key)).toBe(true);
    expect(readPassCancelAcknowledgements(WALLET).has(key)).toBe(true);
  });

  it("clearPassCancelAcknowledgementsForLock removes every expiration variant", () => {
    const oldKey = passCancelStorageKey(WALLET, LOCK, "1", EXPIRATION);
    const newKey = passCancelStorageKey(WALLET, LOCK, "1", NEW_EXPIRATION);
    writePassCancelAcknowledgements(WALLET, new Set([oldKey, newKey]));

    const remaining = clearPassCancelAcknowledgementsForLock(WALLET, LOCK);
    expect(remaining.size).toBe(0);
    expect(readPassCancelAcknowledgements(WALLET).size).toBe(0);
  });
});
