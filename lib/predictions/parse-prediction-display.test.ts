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
});
