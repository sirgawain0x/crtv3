import { NextRequest, NextResponse } from "next/server";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import {
  PlatformAdminAuthError,
  requirePlatformAdmin,
} from "@/lib/access/require-platform-admin";
import { validateAndNormalizeXmerchProfileInput } from "@/lib/creator/xmerch-profile";
import { supabaseService } from "@/lib/sdk/supabase/service";
import { createClient } from "@/lib/sdk/supabase/server";
import { serverLogger } from "@/lib/utils/logger";

/**
 * PATCH /api/creator-profiles/admin/xmerch
 * Platform-admin only: set invite-only Creative Merch profile data for a creator.
 * Update-only: the creator must already have a creator_profiles row.
 */
export async function PATCH(request: NextRequest) {
  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  try {
    await requirePlatformAdmin(request);
  } catch (error) {
    if (error instanceof PlatformAdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, error: "Request body must be an object" },
      { status: 400 },
    );
  }

  const { owner_address, social_xmerch } = body as {
    owner_address?: unknown;
    social_xmerch?: unknown;
  };

  if (typeof owner_address !== "string" || !owner_address.trim()) {
    return NextResponse.json(
      { success: false, error: "owner_address is required" },
      { status: 400 },
    );
  }

  const xmerchValidation = validateAndNormalizeXmerchProfileInput(social_xmerch);
  if (!xmerchValidation.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid xMerch profile",
        fieldErrors: xmerchValidation.errors,
      },
      { status: 400 },
    );
  }

  const ownerAddress = owner_address.toLowerCase();
  const updatePayload = {
    social_xmerch: xmerchValidation.value,
    updated_at: new Date().toISOString(),
  };

  try {
    const client = supabaseService ?? (await createClient());

    const { data: existing, error: lookupError } = await client
      .from("creator_profiles")
      .select("owner_address")
      .eq("owner_address", ownerAddress)
      .maybeSingle();

    if (lookupError) {
      serverLogger.error("[creator-profiles/admin/xmerch] lookup error:", lookupError);
      return NextResponse.json(
        { success: false, error: lookupError.message },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Creator profile not found" },
        { status: 404 },
      );
    }

    const { data, error } = await client
      .from("creator_profiles")
      .update(updatePayload)
      .eq("owner_address", ownerAddress)
      .select();

    if (error) {
      serverLogger.error("[creator-profiles/admin/xmerch] update error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data?.[0] ?? null });
  } catch (error) {
    serverLogger.error("[creator-profiles/admin/xmerch] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      },
      { status: 500 },
    );
  }
}
