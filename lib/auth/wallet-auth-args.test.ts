import { describe, expect, it } from "vitest";
import { walletAuthArgsFromHeaders } from "./wallet-auth-args";

describe("walletAuthArgsFromHeaders", () => {
  it("maps auth headers to wallet auth args", () => {
    expect(
      walletAuthArgsFromHeaders({
        "X-Wallet-Address": "0xabc123",
        "X-Wallet-Timestamp": "1710000000",
        "X-Wallet-Signature": "0xsig",
      }),
    ).toEqual({
      address: "0xabc123",
      timestamp: 1710000000,
      signature: "0xsig",
    });
  });
});
