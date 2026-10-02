import { afterEach, describe, expect, it, vi } from "vitest";
import { routeCreativeGuideMessage } from "./creative-guide-router";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("routeCreativeGuideMessage", () => {
  it("falls back to substring match when TypeSafe is unset", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", ""); vi.stubEnv("OLLAMA_API_KEY", "");
    const result = await routeCreativeGuideMessage("How do I upload my first clip?");
    expect(result.escalate).toBe(false);
    expect(result.content).toContain("pick a video");
    expect(result.source).toBe("substring");
  });

  it("uses decision-model intent when configured", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "tsk_test");
    vi.stubEnv("TYPESAFE_MODEL", "jev-latest");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "jev-1.13.0",
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
    vi.stubEnv("TYPESAFE_API_KEY", "tsk_test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "jev-1.13.0",
          answers: { intent: { type: "choice", choice: "escalate" } },
        })
      )
    );

    const result = await routeCreativeGuideMessage("Explain deep tokenomics");
    expect(result.source).toBe("decision");
    expect(result.escalate).toBe(true);
  });
});
