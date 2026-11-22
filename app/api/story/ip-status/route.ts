import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from "next/server";

const STORY_API_BASE = process.env.STORY_API_BASE_URL ?? "https://api.storyapis.com/api/v4";

/** Infringement status from Story List IP Assets API (per provider). */
export interface InfringementStatusItem {
  status: string;
  isInfringing: boolean;
  providerName: string;
  providerURL: string;
  infringementDetails: string;
  customData?: string;
  responseTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryIPStatusResponse {
  ipId: string;
  infringementStatus: InfringementStatusItem[] | null;
  error?: string;
}

/**
 * GET /api/story/ip-status?ipId=0x...
 * Fetches IP asset from Story Protocol API and returns infringement status.
 * Requires STORY_API_KEY env for Story API (X-Api-Key). If not set, returns 503.
 */
export async function GET(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "story.ip-status" });
  if (!access.allowed) return access.response;

  const ipId = request.nextUrl.searchParams.get("ipId");
  if (!ipId || typeof ipId !== "string" || !ipId.trim()) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Missing or invalid ipId query parameter" },
      { status: 400 }
    ), access);
  }

  const apiKey = process.env.STORY_API_KEY ?? process.env.NEXT_PUBLIC_STORY_API_KEY;
  if (!apiKey) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Story API key not configured" },
      { status: 503 }
    ), access);
  }

  try {
    const res = await fetch(`${STORY_API_BASE}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        where: { ipIds: [ipId.trim()] },
        pagination: { limit: 1, offset: 0 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return withPlatformApiPaymentHeaders(NextResponse.json(
        { error: `Story API error: ${res.status}`, details: errText },
        { status: 502 }
      ), access);
    }

    const json = await res.json();
    const asset = Array.isArray(json?.data) ? json.data[0] : null;

    if (!asset) {
      return withPlatformApiPaymentHeaders(NextResponse.json<StoryIPStatusResponse>({
        ipId: ipId.trim(),
        infringementStatus: null,
      }), access);
    }

    return withPlatformApiPaymentHeaders(NextResponse.json<StoryIPStatusResponse>({
      ipId: asset.ipId ?? ipId.trim(),
      infringementStatus: asset.infringementStatus ?? null,
    }), access);
  } catch (e) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Failed to fetch IP status", details: String(e) },
      { status: 500 }
    ), access);
  }
}
