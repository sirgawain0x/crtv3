import { describe, expect, it } from "vitest";
import { mapGraphQuestionToRow } from "@/lib/reality-social/map-graph-question";

describe("mapGraphQuestionToRow", () => {
  it("maps unanswered questions without answer timestamps", () => {
    const row = mapGraphQuestionToRow(
      {
        id: "0xabc",
        question: "Will it rain?␟Yes,No␟",
        created: "100",
        best_answer: "0x",
        last_bond_ts: "100",
        last_bond: "0",
        bounty: "1000",
        template_id: "2",
        finalize_ts: null,
      },
      "0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8",
    );

    expect(row.currentAnswer).toBeNull();
    expect(row.currentAnswerTimestamp).toBeNull();
    expect(row.data).toBe("Will it rain?␟Yes,No␟");
    expect(row.contract).toBe("0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8");
  });
});
