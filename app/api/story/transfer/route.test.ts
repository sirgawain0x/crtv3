import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrivateKeyToAccount = vi.fn();
const mockCreateStoryPublicClient = vi.fn();
const mockCreateWalletClient = vi.fn();

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: (...args: unknown[]) => mockPrivateKeyToAccount(...args),
}));

vi.mock("@/lib/sdk/story/client", () => ({
  createStoryPublicClient: (...args: unknown[]) => mockCreateStoryPublicClient(...args),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createWalletClient: (...args: unknown[]) => mockCreateWalletClient(...args),
  };
});

import { POST } from "./route";

const SENTINEL_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000bad";

describe("POST /api/story/transfer (disabled)", () => {
  beforeEach(() => {
    process.env.STORY_PROTOCOL_PRIVATE_KEY = SENTINEL_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.STORY_PROTOCOL_PRIVATE_KEY;
  });

  it("returns 503 and does not touch signing or SDK modules", async () => {
    const request = new NextRequest("http://localhost/api/story/transfer", {
      method: "POST",
      body: JSON.stringify({
        fromAddress: "0x1111111111111111111111111111111111111111",
        toAddress: "0x2222222222222222222222222222222222222222",
        amount: "1",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(request);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json).toEqual({ error: "Story is disabled" });
    expect(mockPrivateKeyToAccount).not.toHaveBeenCalled();
    expect(mockCreateStoryPublicClient).not.toHaveBeenCalled();
    expect(mockCreateWalletClient).not.toHaveBeenCalled();
  });
});
