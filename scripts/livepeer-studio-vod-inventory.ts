#!/usr/bin/env npx tsx
/**
 * Livepeer Studio → FrameWorks VOD migration — PR1 inventory + archive tooling.
 *
 * Default (inventory, read-only): paginate Studio assets, cross-reference video_assets, emit JSON/CSV.
 * Archive (--archive <dest>): resumable checksum-verified export (do not run in CI/agents without approval).
 */
import dotenv from "dotenv";
import path from "node:path";
import { archiveStudioAssets } from "@/lib/livepeer/vod-migration/archive/archiver";
import {
  archiveHasBlockingFailures,
  formatArchiveRunSummary,
} from "@/lib/livepeer/vod-migration/archive/exit-status";
import { LocalFilesystemArchiveStorage } from "@/lib/livepeer/vod-migration/archive/local-storage";
import { loadVideoAssetsForInventory } from "@/lib/livepeer/vod-migration/inventory-db-load";
import { listVideoAssetsFromSupabase } from "@/lib/livepeer/vod-migration/db-video-assets";
import {
  buildInventoryReport,
  formatInventoryTotalsLine,
} from "@/lib/livepeer/vod-migration/inventory";
import { writeInventoryCsv, writeInventoryJson } from "@/lib/livepeer/vod-migration/output";
import {
  fetchStudioAssetDownloadTarget,
  fetchStudioAssetSourceStream,
} from "@/lib/livepeer/vod-migration/studio-asset-download";
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
  skipDb?: boolean;
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
    } else if (arg === "--skip-db") {
      opts.skipDb = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Livepeer Studio VOD inventory (read-only by default)

Options:
  --json <file>     Write inventory JSON report
  --csv <file>      Write inventory CSV report
  --skip-db         Skip video_assets cross-reference (orphan counts not meaningful)
  --archive <dir>   Archive mode (explicit; downloads source files — use only after G2 approval)
`);
      process.exit(0);
    }
  }
  return opts;
}

async function runInventory(opts: CliOptions): Promise<void> {
  const token = resolveLivepeerStudioAuthToken();
  if (!token) {
    console.error("LIVEPEER_API_KEY or LIVEPEER_FULL_API_KEY is required for inventory mode.");
    process.exit(1);
  }

  const baseUrl = livepeerStudioApiBaseUrl();

  let dbLoad: Awaited<ReturnType<typeof loadVideoAssetsForInventory>>;
  try {
    dbLoad = await loadVideoAssetsForInventory({
      skipDb: Boolean(opts.skipDb),
      fetchDbRows: async () => {
        const supabase = createServiceClient();
        return listVideoAssetsFromSupabase(supabase);
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[inventory] DB cross-reference failed (exit 1): ${message}`);
    process.exit(1);
  }

  const studioList = await listAllStudioAssets({ baseUrl, authToken: token });
  console.log(`Studio list pages fetched: ${studioList.pageCount}`);

  const report = buildInventoryReport({
    studioAssets: studioList.assets,
    dbRows: dbLoad.rows,
    dbCrossReference: dbLoad.dbCrossReference,
    studioApiBaseUrl: baseUrl,
    studioListPageCount: studioList.pageCount,
  });

  const jsonDefault = path.join(process.cwd(), "livepeer-studio-inventory.json");
  const csvDefault = path.join(process.cwd(), "livepeer-studio-inventory.csv");
  await writeInventoryJson(opts.jsonOut ?? jsonDefault, report);
  await writeInventoryCsv(opts.csvOut ?? csvDefault, report);

  console.log(formatInventoryTotalsLine(report.totals, report.dbCrossReference));
  console.log(`\nWrote JSON: ${opts.jsonOut ?? jsonDefault}`);
  console.log(`Wrote CSV: ${opts.csvOut ?? csvDefault}`);
}

async function runArchive(dest: string): Promise<number> {
  const token = resolveLivepeerStudioAuthToken();
  if (!token) {
    console.error("LIVEPEER_API_KEY or LIVEPEER_FULL_API_KEY is required for archive mode.");
    return 1;
  }

  const baseUrl = livepeerStudioApiBaseUrl();
  const studioList = await listAllStudioAssets({ baseUrl, authToken: token });
  console.log(`Studio list pages fetched: ${studioList.pageCount}`);
  const storage = new LocalFilesystemArchiveStorage(dest);

  const download = async (assetId: string) => {
    const target = await fetchStudioAssetDownloadTarget({
      baseUrl,
      authToken: token,
      assetId,
    });
    const { body, suggestedFilename } = await fetchStudioAssetSourceStream({
      downloadUrl: target.downloadUrl,
    });
    return {
      stream: body,
      suggestedFilename: suggestedFilename ?? target.suggestedFilename,
    };
  };

  const { manifest, results } = await archiveStudioAssets({
    assets: studioList.assets,
    storage,
    download,
  });

  const summary = formatArchiveRunSummary({
    destinationRoot: manifest.destinationRoot,
    manifestEntryCount: Object.keys(manifest.entries).length,
    results,
  });
  console.log(summary);
  return archiveHasBlockingFailures(results) ? 1 : 0;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.archiveDest) {
    const code = await runArchive(opts.archiveDest);
    process.exit(code);
    return;
  }
  await runInventory(opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
