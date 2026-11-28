import path from "node:path";

function archiveRootWithSep(archiveRoot: string): string {
  const resolved = path.resolve(archiveRoot);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function filenameEscapesArchiveRoot(
  archiveRoot: string,
  assetId: string,
  filename: string,
): boolean {
  const full = path.resolve(archiveRoot, "assets", assetId, filename);
  const rootWithSep = archiveRootWithSep(archiveRoot);
  const rootResolved = path.resolve(archiveRoot);
  return full !== rootResolved && !full.startsWith(rootWithSep);
}

/**
 * Canonical relative path for an archived asset file under the archive root.
 */
export function relativePathForAsset(
  assetId: string,
  suggestedFilename: string | undefined,
  archiveRoot: string,
): string {
  const trimmed = suggestedFilename?.trim() || "";
  const defaultName = `${assetId}.mp4`;

  const normalizedForTraversal = (trimmed || defaultName).replace(/\\/g, "/");
  const hasTraversalSegment = normalizedForTraversal
    .split("/")
    .some((segment) => segment === "..");

  let safeName = trimmed || defaultName;
  if (
    safeName === "." ||
    safeName === ".." ||
    hasTraversalSegment ||
    filenameEscapesArchiveRoot(archiveRoot, assetId, safeName)
  ) {
    safeName = defaultName;
  } else {
    safeName = safeName.replace(/[^\w.\-]+/g, "_");
    if (!safeName || safeName === "." || safeName === "..") {
      safeName = defaultName;
    } else if (filenameEscapesArchiveRoot(archiveRoot, assetId, safeName)) {
      safeName = defaultName;
    }
  }

  return `assets/${assetId}/${safeName}`;
}