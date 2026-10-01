import { afterEach, describe, expect, it, vi } from "vitest";
import { moderateChatMessage } from "./chat-moderation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("moderateChatMessage", () => {
  it("skips when Ollama is unset", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    const result = await moderateChatMessage({ content: "hello chat" });
    expect(result.evaluated).toBe(false);
    expect(result.blockPersist).toBe(false);
  });

  it("flags and blocks high-confidence toxicity", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubEnv("OLLAMA_DECISION_MODEL_STRICT", "nimble");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "nimble",
          answers: {
            toxic: { type: "noul", noul: 0.95 },
            spam: { type: "score", score: 0.2 },
          },
        })
      )
    );

    const result = await moderateChatMessage({
      content: "abusive message content here",
      streamId: "playback-1",
    });
    expect(result.evaluated).toBe(true);
    expect(result.flagged).toBe(true);
    expect(result.blockPersist).toBe(true);
  });

  it("does not block mild spam", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "nimble",
          answers: {
            toxic: { type: "noul", noul: 0.1 },
            spam: { type: "score", score: 1.2 },
          },
        })
      )
    );

    const result = await moderateChatMessage({ content: "check out my channel" });
    expect(result.blockPersist).toBe(false);
    expect(result.flagged).toBe(false);
  });
});
