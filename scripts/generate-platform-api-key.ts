#!/usr/bin/env tsx
import { randomBytes } from "crypto";
import { appendFileSync, existsSync } from "fs";
import path from "path";

type Tier = "admin" | "partner";

function parseArgs(argv: string[]) {
  let tier: Tier = "partner";
  let id = "mixtape";
  let writeEnv = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tier" && argv[i + 1]) {
      tier = argv[++i] as Tier;
    } else if (arg === "--id" && argv[i + 1]) {
      id = argv[++i];
    } else if (arg === "--write-env") {
      writeEnv = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (tier === "partner" && !id) {
    console.error("Error: --id is required for partner keys (e.g. mixtape).");
    process.exit(1);
  }

  if (tier !== "admin" && tier !== "partner") {
    console.error("Error: --tier must be admin or partner.");
    process.exit(1);
  }

  return { tier, id, writeEnv };
}

function printHelp() {
  console.log(`Usage:
  pnpm tsx scripts/generate-platform-api-key.ts --tier admin
  pnpm tsx scripts/generate-platform-api-key.ts --tier partner --id mixtape

Options:
  --tier admin|partner   Key tier (default: partner)
  --id <partnerId>       Partner id for partner tier (default: mixtape)
  --write-env            Append to .env.local (never commit this file)
`);
}

function generateSecret(tier: Tier, partnerId?: string): string {
  const random = randomBytes(32).toString("hex");
  if (tier === "admin") {
    return `crtv_admin_${random}`;
  }
  return `crtv_pk_${partnerId}_${random}`;
}

function main() {
  const { tier, id, writeEnv } = parseArgs(process.argv.slice(2));
  const secret = generateSecret(tier, tier === "partner" ? id : undefined);

  console.log("\nCreative TV Platform API key generated\n");
  console.log("⚠️  Save this secret now. It will not be shown again.\n");

  if (tier === "admin") {
    console.log(`Admin secret:\n  ${secret}\n`);
    console.log("Add to CRTV Vercel env:");
    console.log(`  CREATIVE_PLATFORM_ADMIN_API_KEYS=${secret}`);
    console.log("\nUse in requests:");
    console.log(`  Authorization: Bearer ${secret}`);
  } else {
    const envEntry = `${id}:${secret}`;
    console.log(`Partner id: ${id}`);
    console.log(`Partner secret:\n  ${secret}\n`);
    console.log("Add to CRTV Vercel env (append if multiple partners):");
    console.log(`  CREATIVE_PLATFORM_PARTNER_API_KEYS=${envEntry}`);
    console.log(`\nAdd to ${id} app server env (e.g. Mixtape):`);
    console.log(`  MIXTAPE_CRTV_API_KEY=${secret}`);
    console.log("\nMixtape server request example:");
    console.log(`  Authorization: Bearer ${secret}`);
  }

  if (writeEnv) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!existsSync(envPath)) {
      console.error("\nError: .env.local not found. Create it first or omit --write-env.");
      process.exit(1);
    }

    const varName =
      tier === "admin"
        ? "CREATIVE_PLATFORM_ADMIN_API_KEYS"
        : "CREATIVE_PLATFORM_PARTNER_API_KEYS";
    const line =
      tier === "admin"
        ? `${varName}=${secret}\n`
        : `${varName}=${id}:${secret}\n`;

    appendFileSync(envPath, `\n# Added by generate-platform-api-key.ts\n${line}`, "utf8");
    console.log(`\nAppended to ${envPath}`);
  }

  console.log("\nEnable gating:");
  console.log("  PLATFORM_API_ACCESS_ENABLED=true");
  console.log("  X402_API_RECIPIENT=0x...  # for paid external/agent access\n");
}

main();
