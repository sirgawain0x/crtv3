import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLivepeerRealtimeMetrics } from "./useLivepeerRealtimeMetrics";

describe("fetchLivepeerRealtimeMetrics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses a successful realtime viewership response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: true,
          playbackId: "playback-live-1",
          viewerCount: 42,
        }),
      ),
    );

    await expect(fetchLivepeerRealtimeMetrics("playback-live-1")).resolves.toEqual({
      playbackId: "playback-live-1",
      viewerCount: 42,
    });
  });

  it("throws with error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Failed to query real-time views" }, { status: 500 }),
      ),
    );

    await expect(fetchLivepeerRealtimeMetrics("p1")).rejects.toThrow(
      "Failed to query real-time views",
    );
  });

  it("aborts when signal is aborted", async () => {
    const ac = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {
            ac.signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );

    const pending = fetchLivepeerRealtimeMetrics("p1", ac.signal);
    ac.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
