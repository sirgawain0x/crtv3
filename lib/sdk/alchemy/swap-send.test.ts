import { describe, expect, it } from "vitest";
import { buildSwapSendCapabilities, submitSwapCalls } from "./swap-send";

const ACCOUNT = "0x04F5C5691E2F3e79246B08b98e912b3D2a786696" as const;
const HASH = `0x${"ab".repeat(32)}` as const;

const usdcGas = {
  paymaster: {
    policyId: "1a0d6599-35dc-421c-9714-e9c75355bdc3",
    erc20: {
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      maxTokenAmount: 1_000_000n,
      postOpSettings: { autoApprove: true },
    },
  },
};

describe("buildSwapSendCapabilities", () => {
  it("carries the complete ERC-20 paymaster block in USDC mode", () => {
    const capabilities = buildSwapSendCapabilities(usdcGas);

    expect(capabilities).toEqual({
      paymaster: {
        policyId: "1a0d6599-35dc-421c-9714-e9c75355bdc3",
        erc20: {
          tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          maxTokenAmount: 1_000_000n,
          postOpSettings: { autoApprove: true },
        },
      },
    });
  });

  it("keeps maxTokenAmount as a bigint — the SDK's zod codec encodes it to hex", () => {
    // This is the opposite of the raw quote path, which must hex-encode itself
    // because it builds JSON-RPC by hand. Here the SDK does the encoding.
    const capabilities = buildSwapSendCapabilities(usdcGas);
    expect(typeof capabilities?.paymaster.erc20?.maxTokenAmount).toBe("bigint");
  });

  it("sends a policy id only when sponsored", () => {
    expect(
      buildSwapSendCapabilities({
        paymaster: { policyId: "be126055-1844-4b45-aa54-03c4993097c0" },
      }),
    ).toEqual({ paymaster: { policyId: "be126055-1844-4b45-aa54-03c4993097c0" } });
  });

  it("returns undefined in ETH mode so no capabilities key is sent", () => {
    expect(buildSwapSendCapabilities({})).toBeUndefined();
  });
});

describe("submitSwapCalls", () => {
  function recordingClient(statusOnWait = "success") {
    const sent: Array<Record<string, unknown>> = [];
    return {
      sent,
      client: {
        sendCalls: async (args: Record<string, unknown>) => {
          sent.push(args);
          return { id: `id-${sent.length}` };
        },
        waitForCallsStatus: async () => ({
          status: statusOnWait,
          receipts: [{ transactionHash: HASH }],
        }),
      },
    };
  }

  it("passes the capability on every sendCalls invocation", async () => {
    // Regression: the capability used to be set only at client construction,
    // where the SDK discards the erc20 block, and both swap sends omitted
    // capabilities entirely — so SERVER_GAS_MODE=usdc reached the paymaster
    // with a policy id and no token settings.
    const { sent, client } = recordingClient();
    const capabilities = buildSwapSendCapabilities(usdcGas);

    const hash = await submitSwapCalls(
      client,
      ACCOUNT,
      [
        { to: ACCOUNT, data: "0x1234", value: 0n },
        { to: ACCOUNT, data: "0x5678", value: 1n },
      ],
      capabilities,
    );

    expect(hash).toBe(HASH);
    expect(sent).toHaveLength(2);
    for (const args of sent) {
      expect(args.capabilities).toEqual(capabilities);
      expect(
        (args.capabilities as typeof capabilities)?.paymaster.erc20
          ?.tokenAddress,
      ).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    }
    expect(sent[0].account).toBe(ACCOUNT);
  });

  it("omits capabilities entirely in ETH mode", async () => {
    const { sent, client } = recordingClient();

    await submitSwapCalls(client, ACCOUNT, [{ to: ACCOUNT, data: "0x", value: 0n }]);

    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toHaveProperty("capabilities");
  });

  it("throws when a leg reverts", async () => {
    const { client } = recordingClient("reverted");

    await expect(
      submitSwapCalls(client, ACCOUNT, [{ to: ACCOUNT, data: "0x", value: 0n }], {
        paymaster: { policyId: "1a0d6599-35dc-421c-9714-e9c75355bdc3" },
      }),
    ).rejects.toThrow(/reverted/i);
  });

  it("throws when no transaction hash comes back", async () => {
    const client = {
      sendCalls: async () => ({ id: "id-1" }),
      waitForCallsStatus: async () => ({ status: "success", receipts: [] }),
    };

    await expect(
      submitSwapCalls(client, ACCOUNT, [{ to: ACCOUNT, data: "0x", value: 0n }]),
    ).rejects.toThrow(/transaction hash/i);
  });
});
