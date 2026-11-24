/** Prepare guarded apply/rollback artifacts only. No credentials, provider calls or database writes. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderStreamCutoverSql } from "../lib/video-provider/migration/stream-cutover";
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--snapshot" || args[2] !== "--output")
    throw new Error("Use --snapshot PATH --output NEW_PRIVATE_DIRECTORY");
  const snapshots = JSON.parse(await readFile(args[1], "utf8"));
  if (!Array.isArray(snapshots))
    throw new Error("A reviewed channel snapshot array is required");
  const apply = renderStreamCutoverSql(snapshots, "apply"),
    rollback = renderStreamCutoverSql(snapshots, "rollback");
  const output = resolve(args[3]);
  await mkdir(output, { mode: 0o700 });
  await writeFile(resolve(output, "apply.sql"), apply, {
    mode: 0o600,
    flag: "wx",
  });
  await writeFile(resolve(output, "rollback.sql"), rollback, {
    mode: 0o600,
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      mode: "dry-run",
      channels: snapshots.length,
      databaseWrites: 0,
      providerRequests: 0,
      containsIngestKeys: false,
    }),
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Channel cutover preparation failed",
  );
  process.exitCode = 1;
});
