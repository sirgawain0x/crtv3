import { describe, expect, it } from "vitest";
import {
  parsePredictionDisplay,
  answerBytesToLabel,
  isSongchainCategory,
} from "./parse-prediction-display";

describe("parsePredictionDisplay", () => {
  it("parses unit-separated question text", () => {
    const raw =
      'Will it rain tomorrow?\u241f"Yes","No"\u241fcreative tv\u241fen_US';
    const parsed = parsePredictionDisplay(raw);
    expect(parsed.title).toBe("Will it rain tomorrow?");
    expect(parsed.outcomes).toContain("Yes");
    expect(parsed.category.toLowerCase()).toContain("creative");
  });

  it("maps bool answers", () => {
    const parsed = parsePredictionDisplay("Test?\u241f\u241fgeneral\u241fen_US");
    expect(answerBytesToLabel(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      parsed
    )).toBe("Yes");
    expect(answerBytesToLabel(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      parsed
    )).toBe("No");
  });

  it("returns null for unresolved non-boolean zero answer", () => {
    const parsed = parsePredictionDisplay(
      'Pick one?\u241f"A","B","C"\u241fgeneral\u241fen_US'
    );
    expect(answerBytesToLabel(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      parsed
    )).toBeNull();
  });

  it("detects songchain category", () => {
    expect(isSongchainCategory("songchain")).toBe(true);
    expect(isSongchainCategory("creative tv")).toBe(false);
  });

  it("parses bool question with template_id 0", () => {
    const raw =
      "Will the album drop this week?\u241fcreative tv\u241fen_US";
    const parsed = parsePredictionDisplay(raw, 0);
    expect(parsed.title).toBe("Will the album drop this week?");
    expect(parsed.category).toBe("creative tv");
    expect(parsed.type).toBe("bool");
    expect(parsed.title).not.toContain("[Badly formatted question]");
  });

  it("parses single-select question with template_id 2", () => {
    const raw = 'Who wins?\u241f"Alice","Bob"\u241fgeneral\u241fen_US';
    const parsed = parsePredictionDisplay(raw, 2);
    expect(parsed.title).toBe("Who wins?");
    expect(parsed.outcomes).toEqual(["Alice", "Bob"]);
    expect(parsed.type).toBe("single-select");
    expect(parsed.title).not.toContain("[Badly formatted question]");
  });

  it("parses bool question with template_id as bigint", () => {
    const raw = "Test question?\u241fgeneral\u241fen_US";
    const parsed = parsePredictionDisplay(raw, BigInt(0));
    expect(parsed.title).toBe("Test question?");
    expect(parsed.title).not.toContain("[Badly formatted question]");
  });
});
