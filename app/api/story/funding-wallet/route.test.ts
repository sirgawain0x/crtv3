import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrivateKeyToAccount = vi.fn();

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: (...args: unknown[]) => mockPrivateKeyToAccount(...args),
}));

import { GET } from "./route";

const SENTINEL_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000bad";

describe("GET /api/story/funding-wallet (removed)", () => {
  beforeEach(() => {
    process.env.STORY_PROTOCOL_PRIVATE_KEY = SENTINEL_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.STORY_PROTOCOL_PRIVATE_KEY;
  });

  it("returns 404 and does not derive wallet from private key", async () => {
    const request = new NextRequest("http://localhost/api/story/funding-wallet", {
      method: "GET",
    });

    const res = await GET(request);

    expect(res.status).toBe(404);
    expect(mockPrivateKeyToAccount).not.toHaveBeenCalled();
  });
});
