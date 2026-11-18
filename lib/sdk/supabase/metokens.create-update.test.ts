import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn();

  const chain = {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
  };

  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);

  const mockAnonClient = { from: vi.fn(() => chain) };

  return {
    mockInsert,
    mockUpdate,
    mockSelect,
    mockSingle,
    mockEq,
    mockAnonClient,
  };
});

vi.mock("./client", () => ({
  supabase: mocks.mockAnonClient,
}));

vi.mock("./service", () => ({
  createServiceClient: vi.fn(() => {
    throw new Error("createServiceClient should not be used by create/updateMeToken");
  }),
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn() },
}));

import { MeTokenSupabaseService } from "./metokens";

describe("MeTokenSupabaseService create/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockSingle.mockResolvedValue({
      data: { id: "1", address: "0xabc", owner_address: "0xdef" },
      error: null,
    });
  });

  it("createMeToken uses the shared anon supabase client", async () => {
    const service = new MeTokenSupabaseService();
    await service.createMeToken({
      address: "0xAbC",
      owner_address: "0xDeF",
      name: "Test",
      symbol: "TST",
    });

    expect(mocks.mockAnonClient.from).toHaveBeenCalledWith("metokens");
    expect(mocks.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "0xabc",
        owner_address: "0xdef",
      }),
    );
  });

  it("updateMeToken uses the shared anon supabase client", async () => {
    const service = new MeTokenSupabaseService();
    await service.updateMeToken("0xAbC", { name: "Renamed" });

    expect(mocks.mockAnonClient.from).toHaveBeenCalledWith("metokens");
    expect(mocks.mockEq).toHaveBeenCalledWith("address", "0xabc");
    expect(mocks.mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Renamed" }),
    );
  });
});