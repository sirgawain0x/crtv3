import type { Address, Hex } from "viem";

export type Eip5792CallInput = {
  to: Address;
  data?: Hex;
  value?: bigint;
};

export type SerializedEip5792Call = {
  to: Address;
  data: Hex;
  value: Hex;
};

/** JSON-RPC / wallet_prepareCalls expects quantity fields as 0x-prefixed hex strings. */
export function bigintToRpcHex(value?: bigint): Hex {
  const amount = value ?? 0n;
  if (amount === 0n) {
    return "0x0";
  }
  return `0x${amount.toString(16)}` as Hex;
}

export function serializeEip5792Calls(
  calls: Eip5792CallInput[],
): SerializedEip5792Call[] {
  return calls.map((call) => ({
    to: call.to,
    data: (call.data ?? "0x") as Hex,
    value: bigintToRpcHex(call.value),
  }));
}
