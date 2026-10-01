import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateCampaignDraft } from "./campaign-gate";

const baseInput = {
  brandName: "Acme",
  brandHandle: "@acme",
  campaignTitle: "Summer drip hoodie drop",
  campaignDescription: "Buy the limited hoodie with code CREATIVE.",
  purchaseUrl: "https://shop.example.com/hoodie",
  productImageUrl: "https://cdn.example.com/hoodie.png",
  startDate: new Date("2026-06-01T00:00:00Z"),
  endDate: new Date("2026-06-30T00:00:00Z"),
  targetCreator: "0x1111111111111111111111111111111111111111",
  budgetUsdc: 500,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("evaluateCampaignDraft", () => {
  it("skips when Ollama is not configured", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    const result = await evaluateCampaignDraft(baseInput);
    expect(result.evaluated).toBe(false);
    expect(result.review).toBe("skipped");
  });

  it("marks auto_eligible on strong policy + quality", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubEnv("OLLAMA_DECISION_MODEL_STRICT", "nimble");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "nimble",
          answers: {
            brand_safe: { type: "noul", noul: 0.96 },
            dates_sensible: { type: "noul", noul: 0.9 },
            quality: { type: "score", score: 2.4 },
            niche: { type: "choice", choice: "entertainment" },
          },
        })
      )
    );

    const result = await evaluateCampaignDraft(baseInput);
    expect(result.evaluated).toBe(true);
    expect(result.review).toBe("auto_eligible");
    expect(result.niche).toBe("entertainment");
    expect(result.brandSafe).toBe(true);
  });

  it("needs_review when brand-safety fails", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "nimble",
          answers: {
            brand_safe: { type: "noul", noul: 0.1 },
            dates_sensible: { type: "noul", noul: 0.9 },
            quality: { type: "score", score: 2 },
            niche: { type: "choice", choice: "general" },
          },
        })
      )
    );

    const result = await evaluateCampaignDraft(baseInput);
    expect(result.review).toBe("needs_review");
    expect(result.brandSafe).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/brand-safety/i);
  });
});
