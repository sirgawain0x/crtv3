"use server";

import { NextRequest, NextResponse } from "next/server";
import {
  assertUploadsAndAssetsAvailable,
  FrameWorksUploadsAssetsUnavailableError,
  resolveVideoProviderId,
} from "@/lib/video-provider";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { requireWalletAuth, WalletAuthError } from "@/lib/auth/require-wallet";

type ClientLivepeerUploadFields = {
  name?: unknown;
  size?: unknown;
  sizeBytes?: unknown;
};

/**
 * Allowlisted client fields for Studio request-upload (see assetUploadActions / UploadAssetData).
 * Creator and storage policy are set server-side from verified wallet auth.
 */
function buildStudioRequestUploadBody(
  client: ClientLivepeerUploadFields,
  creatorAddress: string,
):
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string; status: number } {
  const name = typeof client.name === "string" ? client.name.trim() : "";
  if (!name) {
    return { ok: false, error: "name is required", status: 400 };
  }

  const rawSize = client.size ?? client.sizeBytes;
  const size =
    typeof rawSize === "number" ? rawSize : typeof rawSize === "string" ? Number(rawSize) : NaN;
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "size must be a positive number", status: 400 };
  }

  return {
    ok: true,
    body: {
      name,
      size,
      storage: { ipfs: true },
      creatorId: { type: "unverified", value: creatorAddress },
      staticMp4: true,
    },
  };
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.LIVEPEER_FULL_API_URL ?? "https://livepeer.studio";
  const livepeerUrl = `${baseUrl}/api/stream`;

  if (!process.env.LIVEPEER_FULL_API_KEY)
    return NextResponse.json(
      { error: "Missing Livepeer API key" },
      { status: 500 }
    );

  const response = await fetch(livepeerUrl, {
    headers: {
      Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok)
    return NextResponse.json(
      { error: "Failed to fetch streams", details: await response.text() },
      { status: response.status }
    );

  const json = await response.json();
  return NextResponse.json(json);
}

export async function POST(request: NextRequest) {
  if (resolveVideoProviderId() === "frameworks") {
    return NextResponse.json(
      {
        error:
          "FrameWorks VOD uploads use the provider upload flow (request-upload / server actions), not Livepeer Studio proxy.",
      },
      { status: 409 },
    );
  }

  try {
    assertUploadsAndAssetsAvailable("livepeer.route.POST.request-upload");
  } catch (error) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let verifiedAddress: string;
  try {
    const verified = await requireWalletAuth(request);
    verifiedAddress = verified.address;
  } catch (authErr) {
    if (authErr instanceof WalletAuthError) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    throw authErr;
  }

  const baseUrl = process.env.LIVEPEER_FULL_API_URL ?? "https://livepeer.studio";
  const livepeerUpload = `${baseUrl}/api/asset/request-upload`;

  if (!process.env.LIVEPEER_FULL_API_KEY)
    return NextResponse.json(
      { error: "Missing Livepeer API key" },
      { status: 500 }
    );

  let clientJson: ClientLivepeerUploadFields;
  try {
    clientJson = (await request.json()) as ClientLivepeerUploadFields;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const built = buildStudioRequestUploadBody(clientJson, verifiedAddress);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  const response = await fetch(livepeerUpload, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(built.body),
  });

  if (!response.ok)
    return NextResponse.json(
      { error: "Failed to upload asset", details: await response.text() },
      { status: response.status }
    );

  const json = await response.json();
  return NextResponse.json(json);
}