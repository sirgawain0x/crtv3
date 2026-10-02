import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluatePredictionDraft } from "./prediction-gate";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("evaluatePredictionDraft", () => {
  it("no-ops pass when TypeSafe is unset", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", ""); vi.stubEnv("OLLAMA_API_KEY", "");
    const result = await evaluatePredictionDraft({
      title: "Will ETH be above $5000 by Dec 2026?",
      questionType: "bool",
    });
    expect(result.evaluated).toBe(false);
    expect(result.pass).toBe(true);
    expect(result.blockCreate).toBe(false);
  });

  it("suggests type/category and blocks unresolvable drafts", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "tsk_test");

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        questions?: Record<string, unknown>;
      };
      if (body.questions && "resolvable" in body.questions) {
        return Response.json({
          model: "jev-1.13.0",
          answers: { resolvable: { type: "noul", noul: 0.1 } },
        });
      }
      return Response.json({
        model: "jev-1.13.0",
        answers: {
          question_type: { type: "choice", choice: "bool" },
          category: { type: "choice", choice: "finance" },
          clarity: { type: "score", score: 0.8 },
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await evaluatePredictionDraft({
      title: "Is jazz better than rock?",
      description: "Pure opinion",
    });

    expect(result.evaluated).toBe(true);
    expect(result.suggestedType).toBe("bool");
    expect(result.suggestedCategory).toBe("finance");
    expect(result.blockCreate).toBe(true);
    expect(result.pass).toBe(false);
  });

  it("passes a clear resolvable market", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "tsk_test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          questions?: Record<string, unknown>;
        };
        if (body.questions && "resolvable" in body.questions) {
          return Response.json({
            model: "jev-1.13.0",
            answers: { resolvable: { type: "noul", noul: 0.92 } },
          });
        }
        return Response.json({
          model: "jev-1.13.0",
          answers: {
            question_type: { type: "choice", choice: "bool" },
            category: { type: "choice", choice: "sports" },
            clarity: { type: "score", score: 2.6 },
          },
        });
      })
    );

    const result = await evaluatePredictionDraft({
      title: "Will Team A win the finals on 2026-07-01?",
      questionType: "bool",
      closeDate: "2026-07-02",
    });
    expect(result.pass).toBe(true);
    expect(result.blockCreate).toBe(false);
    expect(result.resolvable).toBe(true);
  });
});
