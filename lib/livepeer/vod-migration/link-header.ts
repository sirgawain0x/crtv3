/** Parse Studio list `Link: <...?cursor=...>; rel="next"` (see Livepeer Studio dashboard client). */
export function parseNextCursorFromLinkHeader(
  linkHeader: string | null,
): string | null {
  if (!linkHeader) return null;

  for (const segment of linkHeader.split(",")) {
    if (!/rel="next"/i.test(segment)) continue;
    const angle = /<([^>]+)>/.exec(segment);
    if (!angle) continue;
    try {
      const url = new URL(angle[1]);
      const cursor = url.searchParams.get("cursor");
      if (cursor) return cursor;
    } catch {
      continue;
    }
  }
  return null;
}
