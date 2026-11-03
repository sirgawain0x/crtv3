// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import {
  addPassCancelAcknowledgement,
  passCancelStorageKey,
  readPassCancelAcknowledgements,
  writePassCancelAcknowledgements,
} from "./pass-cancel-acknowledgements";

const WALLET = "0xAbCdEf1234567890123456789012345678901234";
const LOCK = "0xf7c4cd399395d80f9d61fde833849106775269c6";

describe("pass-cancel-acknowledgements", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds stable pass keys", () => {
    expect(passCancelStorageKey(WALLET, LOCK, "42")).toBe(
      `${WALLET.toLowerCase()}:${LOCK.toLowerCase()}:42`,
    );
  });

  it("persists and reads acknowledgement keys per wallet", () => {
    const key = passCancelStorageKey(WALLET, LOCK, "1");
    writePassCancelAcknowledgements(WALLET, new Set([key]));
    expect(readPassCancelAcknowledgements(WALLET).has(key)).toBe(true);
    expect(readPassCancelAcknowledgements("0x0000000000000000000000000000000000000001").size).toBe(
      0,
    );
  });

  it("addPassCancelAcknowledgement merges into storage", () => {
    const key = passCancelStorageKey(WALLET, LOCK, "9");
    const next = addPassCancelAcknowledgement(WALLET, key, new Set());
    expect(next.has(key)).toBe(true);
    expect(readPassCancelAcknowledgements(WALLET).has(key)).toBe(true);
  });
});
