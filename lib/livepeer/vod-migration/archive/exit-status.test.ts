import { describe, expect, it } from "vitest";
import type { ArchiveAssetResult } from "./archiver";
import { archiveHasBlockingFailures, formatArchiveRunSummary } from "./exit-status";

describe("archiveHasBlockingFailures", () => {
  it("is false when only archived and skipped", () => {
    const results: ArchiveAssetResult[] = [
      { assetId: "a", status: "archived", bytes: 10 },
      { assetId: "b", status: "skipped", bytes: 5 },
    ];
    expect(archiveHasBlockingFailures(results)).toBe(false);
  });

  it("is true when any checksum_mismatch exists", () => {
    const results: ArchiveAssetResult[] = [
      {
        assetId: "a",
        status: "checksum_mismatch",
        expected: "abc",
        actual: "def",
      },
    ];
    expect(archiveHasBlockingFailures(results)).toBe(true);
  });

  it("is true when any error exists", () => {
    const results: ArchiveAssetResult[] = [{ assetId: "a", status: "error", message: "boom" }];
    expect(archiveHasBlockingFailures(results)).toBe(true);
  });
});

describe("formatArchiveRunSummary", () => {
  it("prints counts before exit-code decision", () => {
    const text = formatArchiveRunSummary({
      destinationRoot: "/archive",
      manifestEntryCount: 1,
      results: [{ assetId: "a", status: "error", message: "x" }],
    });
    expect(text).toContain("Errors: 1");
    expect(text).toContain("/archive");
  });
});
