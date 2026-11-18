import { beforeEach, describe, expect, it, vi } from "vitest";

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

const mockServiceClient = { from: vi.fn(() => chain) };
const mockCreateServiceClient = vi.fn(() => mockServiceClient);

vi.mock("./service", () => ({
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
}));

vi.mock("./client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn() },
}));

import { MeTokenSupabaseService } from "./metokens";

describe("MeTokenSupabaseService create/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { id: "1", address: "0xabc", owner_address: "0xdef" },
      error: null,
    });
  });

  it("createMeToken uses createServiceClient, not the browser client", async () => {
    const service = new MeTokenSupabaseService();
    await service.createMeToken({
      address: "0xAbC",
      owner_address: "0xDeF",
      name: "Test",
      symbol: "TST",
    });

    expect(mockCreateServiceClient).toHaveBeenCalled();
    expect(mockServiceClient.from).toHaveBeenCalledWith("metokens");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "0xabc",
        owner_address: "0xdef",
      }),
    );
  });

  it("updateMeToken uses createServiceClient", async () => {
    const service = new MeTokenSupabaseService();
    await service.updateMeToken("0xAbC", { name: "Renamed" });

    expect(mockCreateServiceClient).toHaveBeenCalled();
    expect(mockServiceClient.from).toHaveBeenCalledWith("metokens");
    expect(mockEq).toHaveBeenCalledWith("address", "0xabc");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Renamed" }),
    );
  });
});