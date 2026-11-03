import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn();
  const fromMock = vi.fn(() => ({
    insert: insertMock,
  }));
  return { insertMock, fromMock };
});

vi.mock("@/lib/sdk/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { creatorProfileSupabaseService } from "@/lib/sdk/supabase/creator-profiles";

describe("createCreatorProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "id-1",
            owner_address: "0xabc",
            username: "tester",
          },
          error: null,
        }),
      }),
    });
  });

  it("strips social_* fields from direct browser insert", async () => {
    await creatorProfileSupabaseService.createCreatorProfile({
      owner_address: "0xAbC",
      username: "tester",
      social_orb_url: "https://orb.club/p/evil",
      social_instagram_url: "https://instagram.com/evil",
      social_x_url: "https://x.com/evil",
    });

    expect(fromMock).toHaveBeenCalledWith("creator_profiles");
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload).toEqual({
      owner_address: "0xabc",
      username: "tester",
    });
    expect(payload).not.toHaveProperty("social_orb_url");
    expect(payload).not.toHaveProperty("social_instagram_url");
    expect(payload).not.toHaveProperty("social_x_url");
  });
});
