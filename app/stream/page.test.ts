import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import StreamAliasPage from "./page";

describe("StreamAliasPage", () => {
  it("redirects to go-live", () => {
    StreamAliasPage();
    expect(redirect).toHaveBeenCalledWith("/go-live");
  });
});
