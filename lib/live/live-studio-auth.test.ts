import { describe, expect, it } from "vitest";
import { resolveLiveStudioAuthPhase } from "./live-studio-auth";

describe("resolveLiveStudioAuthPhase", () => {
  it("waits for Privy ready before treating user as logged out", () => {
    expect(
      resolveLiveStudioAuthPhase({
        privyReady: false,
        isAuthenticated: false,
      }),
    ).toBe("privy_init");
  });

  it("shows logged out only after Privy is ready", () => {
    expect(
      resolveLiveStudioAuthPhase({
        privyReady: true,
        isAuthenticated: false,
      }),
    ).toBe("logged_out");
  });

  it("continues when Privy is ready and user is authenticated", () => {
    expect(
      resolveLiveStudioAuthPhase({
        privyReady: true,
        isAuthenticated: true,
      }),
    ).toBe("authenticated");
  });
});
