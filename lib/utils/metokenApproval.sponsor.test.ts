import { afterEach, describe, expect, it, vi } from "vitest";
import type { Address, Hex } from "viem";
import { sendMeTokenSponsoredUserOp } from "./metokenApproval";
import type { CompatSmartAccountClient } from "@/lib/wallet/smart-wallet-client";

const TEST_POLICY_ID = "11111111-2222-4333-8444-555555555555";

describe("sendMeTokenSponsoredUserOp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes Alchemy paymaster policy on subscribe-path UserOps", async () => {
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID", TEST_POLICY_ID);

    const sendUserOperation = vi.fn().mockResolvedValue({ hash: "call-id-1" });
    const client = {
      sendUserOperation,
      account: { address: "0x0000000000000000000000000000000000000001" as Address },
    } as unknown as CompatSmartAccountClient;

    await sendMeTokenSponsoredUserOp({
      client,
      call: {
        target: "0xba5502db2aC2cBff189965e991C07109B14eB3f5" as Address,
        data: "0xdeadbeef" as Hex,
        value: BigInt(0),
      },
    });

    expect(sendUserOperation).toHaveBeenCalledOnce();
    expect(sendUserOperation).toHaveBeenCalledWith({
      uo: [
        {
          target: "0xba5502db2aC2cBff189965e991C07109B14eB3f5",
          data: "0xdeadbeef",
          value: BigInt(0),
        },
      ],
      context: {
        paymasterService: { policyId: TEST_POLICY_ID },
      },
    });
  });
});
