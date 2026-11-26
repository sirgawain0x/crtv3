import { describe, expect, it } from "vitest";
import { StreamProxyError, userMessageForStreamProxyError, parseStreamProxyFailure } from "./stream-proxy-errors";

describe("stream-proxy-errors", () => {
  it("maps StreamProxyError codes to user messages", () => {
    const err = new StreamProxyError(
      "quota exceeded",
      "LIVEPEER_ERROR",
      402,
    );
    expect(userMessageForStreamProxyError(err)).toBe("quota exceeded");
  });

  it("maps BOTID_DENIED to security message", () => {
    const err = new StreamProxyError("denied", "BOTID_DENIED", 403);
    expect(userMessageForStreamProxyError(err)).toContain("Security check");
  });
  it("preserves the migration conflict as an actionable, non-retry error", async () => {
    const error = await parseStreamProxyFailure(new Response(JSON.stringify({
      code: "STREAM_PROVIDER_MIGRATION_REQUIRED", error: "migration required",
    }), { status: 409, headers: { "Content-Type": "application/json" } }));
    expect(error.code).toBe("STREAM_PROVIDER_MIGRATION_REQUIRED");
    expect(error.status).toBe(409);
    expect(userMessageForStreamProxyError(error)).toContain("saved credentials have not been changed");
  });

});
