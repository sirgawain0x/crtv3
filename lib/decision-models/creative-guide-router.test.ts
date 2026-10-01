import { afterEach, describe, expect, it, vi } from "vitest";
import { routeCreativeGuideMessage } from "./creative-guide-router";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("routeCreativeGuideMessage", () => {
  it("falls back to substring match when decision models are unset", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    const result = await routeCreativeGuideMessage("How do I upload my first clip?");
    expect(result.escalate).toBe(false);
    expect(result.content).toContain("pick a video");
    expect(result.source).toBe("substring");
  });

  it("uses decision-model intent when configured", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubEnv("OLLAMA_DECISION_MODEL_ROUTING", "tev1:4b");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "tev1:4b",
          answers: {
            intent: { type: "choice", choice: "metoken_explain", confidence: 0.9 },
          },
        })
      )
    );

    const result = await routeCreativeGuideMessage(
      "Can you tell me about creator personal tokens?"
    );
    expect(result.source).toBe("decision");
    expect(result.escalate).toBe(false);
    expect(result.intent).toBe("metoken_explain");
    expect(result.content).toContain("MeToken");
  });

  it("escalates when the model chooses escalate", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "tev1:4b",
          answers: { intent: { type: "choice", choice: "escalate" } },
        })
      )
    );

    const result = await routeCreativeGuideMessage("Explain deep tokenomics");
    expect(result.source).toBe("decision");
    expect(result.escalate).toBe(true);
  });
});
