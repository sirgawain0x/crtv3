import {
  parseCreativeTVUrl,
  type ParsedCreativeTVUrl,
} from "@/lib/utils/creative-tv-url";

/**
 * Curated FAIR lineup — add one public Creative TV video link per entry.
 *
 * **Preferred for G2:** paste the full video page URL from the browser when viewing
 * a video on Creative TV, e.g.
 * `https://tv.creativeplatform.xyz/discover/550e8400-e29b-41d4-a716-446655440000`
 *
 * Also accepted:
 * - `/discover/{livepeer-asset-uuid}` or the bare asset UUID alone
 * - `https://tv.creativeplatform.xyz/watch/{playbackId}` or `/watch/{playbackId}`
 */
export const CHONES_FAIR_VIDEO_REFERENCES: readonly string[] = [];

export type FairVideoReferenceParseResult =
  | { ok: true; index: number; parsed: ParsedCreativeTVUrl }
  | { ok: false; index: number; raw: string; reason: string };

/** Parse a single FAIR config entry (delegates to {@link parseCreativeTVUrl}). */
export function parseFairVideoReference(
  input: string,
  opts?: { origin?: string },
): ParsedCreativeTVUrl {
  return parseCreativeTVUrl(input, opts);
}

/** Parse every entry in {@link CHONES_FAIR_VIDEO_REFERENCES} (or a custom list). */
export function parseFairVideoReferences(
  references: readonly string[],
  opts?: { origin?: string },
): FairVideoReferenceParseResult[] {
  return references.map((raw, index) => {
    const parsed = parseCreativeTVUrl(raw, opts);
    if (parsed.kind === "invalid") {
      return {
        ok: false,
        index,
        raw,
        reason: "Unrecognized Creative TV URL or identifier",
      };
    }
    return { ok: true, index, parsed };
  });
}
