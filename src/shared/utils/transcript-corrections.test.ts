import { describe, expect, it } from "vitest";
import {
  applyTranscriptWordCorrections,
  correctTranscriptWords,
  intervalsOverlap,
  wordIsInSelectedInterval,
} from "./transcript-corrections";

describe("wordIsInSelectedInterval", () => {
  it("does not select a neighbor that only shares a Whisper boundary overlap", () => {
    const first = { text: "hello", start: 0, end: 0.5 };
    const second = { text: "world", start: 0.48, end: 0.9 };

    expect(intervalsOverlap(first.start, first.end, 0, 0.5)).toBe(true);
    expect(intervalsOverlap(second.start, second.end, 0, 0.5)).toBe(true);

    expect(wordIsInSelectedInterval(first, 0, 0.5)).toBe(true);
    expect(wordIsInSelectedInterval(second, 0, 0.5)).toBe(false);
  });
});

describe("correctTranscriptWords", () => {
  const words = [
    { text: "hello", start: 0, end: 0.5 },
    { text: "world", start: 0.48, end: 0.9 },
  ];

  it("replaces only midpoint-selected words for a time range", () => {
    const correction = correctTranscriptWords(
      words,
      { start: 0, end: 0.5 },
      "hi",
    );
    expect(correction).toEqual({
      fromIndex: 0,
      toIndex: 0,
      text: "hi",
      start: 0,
      end: 0.5,
    });

    const applied = applyTranscriptWordCorrections(words, [correction!]);
    expect(applied).toEqual([
      { text: "hi", start: 0, end: 0.5 },
      { text: "world", start: 0.48, end: 0.9 },
    ]);
  });

  it("honors explicit dialog indices over overlapping timestamps", () => {
    const correction = correctTranscriptWords(
      words,
      { start: 0, end: 0.9, indices: [0] },
      "hi",
    );
    expect(correction?.fromIndex).toBe(0);
    expect(correction?.toIndex).toBe(0);

    const applied = applyTranscriptWordCorrections(words, [correction!]);
    expect(applied[1]?.text).toBe("world");
  });
});
