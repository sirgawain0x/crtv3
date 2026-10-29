import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import {
  bigintToRpcHex,
  serializeEip5792Calls,
} from "@/lib/wallet/serializeEip5792Calls";

const DIAMOND = "0xba5502db2aC2cBff189965e991C07109B14eB3f5" as Address;
const MINT_DATA = "0xdeadbeef" as Hex;

describe("bigintToRpcHex", () => {
  it("maps 0n to 0x0", () => {
    expect(bigintToRpcHex(0n)).toBe("0x0");
    expect(bigintToRpcHex()).toBe("0x0");
  });

  it("maps non-zero bigint to 0x-prefixed hex", () => {
    expect(bigintToRpcHex(100n)).toBe("0x64");
    expect(bigintToRpcHex(1_000_000_000_000_000_000n)).toBe(
      "0xde0b6b3a7640000",
    );
  });
});

describe("serializeEip5792Calls", () => {
  it("defaults missing data to 0x and zero value to 0x0", () => {
    const [call] = serializeEip5792Calls([{ to: DIAMOND }]);
    expect(call.data).toBe("0x");
    expect(call.value).toBe("0x0");
    expect(call.to).toBe(DIAMOND);
  });

  it("serializes mint and burn style Diamond calls with zero value", () => {
    const calls = serializeEip5792Calls([
      {
        to: DIAMOND,
        data: "0x0d4d1513" as Hex,
        value: 0n,
      },
      {
        to: DIAMOND,
        data: "0xdead0001" as Hex,
        value: BigInt(0),
      },
    ]);

    expect(calls[0].value).toBe("0x0");
    expect(calls[1].value).toBe("0x0");
    expect(calls[0].data).toBe("0x0d4d1513");
  });

  it("preserves explicit calldata", () => {
    const [call] = serializeEip5792Calls([
      { to: DIAMOND, data: MINT_DATA, value: 0n },
    ]);
    expect(call.data).toBe(MINT_DATA);
  });
});
