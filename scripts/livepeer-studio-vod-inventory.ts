#!/usr/bin/env npx tsx
/**
 * Livepeer Studio → FrameWorks VOD migration — PR1 inventory + archive tooling.
 *
 * Default (inventory, read-only): paginate Studio assets, cross-reference video_assets, emit JSON/CSV.
 * Archive (--archive <dest>): resumable checksum-verified export (do not run in CI/agents without approval).
 *
 * Usage:
 *   npx tsx scripts/livepeer-studio-vod-inventory.ts [--json out.json] [--csv out.csv]
 *   npx tsx scripts/livepeer-studio-vod-inventory.ts --archive /path/to/archive
 */
import dotenv from "dotenv";
import path from "node:path";
import { archiveStudioAssets } from "@/lib/livepeer/vod-migration/archive/archiver";
import { LocalFilesystemArchiveStorage } from "@/lib/livepeer/vod-migration/archive/local-storage";
import { listVideoAssetsFromSupabase } from "@/lib/livepeer/vod-migration/db-video-assets";
import {
  buildInventoryReport,
  formatInventoryTotalsLine,
} from "@/lib/livepeer/vod-migration/inventory";
import { writeInventoryCsv, writeInventoryJson } from "@/lib/livepeer/vod-migration/output";
import { listAllStudioAssets } from "@/lib/livepeer/vod-migration/studio-asset-client";
import {
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from "@/lib/sdk/livepeer/studioAuth";
import { createServiceClient } from "@/lib/sdk/supabase/service";

dotenv.config({ path: ".env.local" });
dotenv.config();

type CliOptions = {
  jsonOut?: string;
  csvOut?: string;
  archiveDest?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json" && argv[i + 1]) {
      opts.jsonOut = argv[++i];
    } else if (arg === "--csv" && argv[i + 1]) {
      opts.csvOut = argv[++i];
    } else if (arg === "--archive" && argv[i + 1]) {
      opts.archiveDest = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Livepeer Studio VOD inventory (read-only by default)

Options:
  --json <file>     Write inventory JSON report
  --csv <file>      Write inventory CSV report
  --archive <dir>   Archive mode (explicit; downloads source files — use only after G2 approval)
`);
      process.exit(0);
    }
  }
  return opts;
}

async function loadDbRows() {
  try {
    const supabase = createServiceClient();
    return await listVideoAssetsFromSupabase(supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[inventory] Skipping DB cross-reference: ${message}`);
    return [];
  }
}

async function runInventory(opts: CliOptions): Promise<void> {
  const token = resolveLivepeerStudioAuthToken();
  if (!token) {
    console.error("LIVEPEER_API_KEY or LIVEPEER_FULL_API_KEY is required for inventory mode.");
    process.exit(1);
  }

  const baseUrl = livepeerStudioApiBaseUrl();
  const [studioAssets, dbRows] = await Promise.all([
    listAllStudioAssets({ baseUrl, authToken: token }),
    loadDbRows(),
  ]);

  const report = buildInventoryReport({
    studioAssets,
    dbRows,
    studioApiBaseUrl: baseUrl,
  });

  const jsonDefault = path.join(process.cwd(), "livepeer-studio-inventory.json");
  const csvDefault = path.join(process.cwd(), "livepeer-studio-inventory.csv");
  await writeInventoryJson(opts.jsonOut ?? jsonDefault, report);
  await writeInventoryCsv(opts.csvOut ?? csvDefault, report);

  console.log(formatInventoryTotalsLine(report.totals));
  console.log(`\nWrote JSON: ${opts.jsonOut ?? jsonDefault}`);
  console.log(`Wrote CSV: ${opts.csvOut ?? csvDefault}`);
}

async function runArchive(dest: string): Promise<void> {
  const token = resolveLivepeerStudioAuthToken();
  if (!token) {
    console.error("LIVEPEER_API_KEY or LIVEPEER_FULL_API_KEY is required for archive mode.");
    process.exit(1);
  }

  const baseUrl = livepeerStudioApiBaseUrl();
  const studioAssets = await listAllStudioAssets({ baseUrl, authToken: token });
  const storage = new LocalFilesystemArchiveStorage(dest);

  const download = async (assetId: string) => {
    const res = await fetch(`${baseUrl}/api/asset/${encodeURIComponent(assetId)}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Download failed for ${assetId}: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const cd = res.headers.get("content-disposition") ?? "";
    const match = /filename="?([^";]+)"?/i.exec(cd);
    return { data: buffer, suggestedFilename: match?.[1] };
  };

  const { manifest, results } = await archiveStudioAssets({
    assets: studioAssets,
    storage,
    download,
  });

  const archived = results.filter((r) => r.status === "archived").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const mismatches = results.filter((r) => r.status === "checksum_mismatch").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log(
    [
      `Archive destination: ${manifest.destinationRoot}`,
      `Manifest entries: ${Object.keys(manifest.entries).length}`,
      `Archived this run: ${archived}`,
      `Skipped (resumed): ${skipped}`,
      `Checksum mismatches: ${mismatches}`,
      `Errors: ${errors}`,
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.archiveDest) {
    await runArchive(opts.archiveDest);
    return;
  }
  await runInventory(opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
