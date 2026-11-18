import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import { CREATOR_PROFILE_TWIN_STATUS_SELECT } from "@/lib/sdk/supabase/creator-profiles-select";
import { findCreativeTwinTemplate } from "@/lib/pinata/api";
import { serverLogger } from "@/lib/utils/logger";

/**
 * Read-only twin connection status for a creator. Safe to expose to the
 * client — the gateway token is never returned, only whether one is set
 * plus the public-facing identifiers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ownerAddress = searchParams.get("owner");
  if (!ownerAddress) {
    return NextResponse.json(
      { success: false, error: "owner is required" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    serverLogger.error("twin/status: service client unavailable:", err);
    return NextResponse.json(
      { success: false, error: "Twin status is not configured" },
      { status: 503 },
    );
  }
  const { data, error } = await supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_TWIN_STATUS_SELECT)
    .eq("owner_address", ownerAddress.toLowerCase())
    .maybeSingle();

  if (error) {
    serverLogger.error("twin/status: read failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to read profile" },
      { status: 500 }
    );
  }

  if (!data?.twin_pinata_agent_id) {
    return NextResponse.json({
      success: true,
      connected: false,
    });
  }

  // snapshotCid integrity check — re-verifies on every read so a template
  // version bump shows up as "outdated" instead of an unmoving stale badge.
  const template = await findCreativeTwinTemplate().catch(() => null);
  const verified =
    !!template?.snapshotCid &&
    !!data.twin_pinata_snapshot_cid &&
    template.snapshotCid === data.twin_pinata_snapshot_cid;

  return NextResponse.json({
    success: true,
    connected: !!data.twin_pinata_gateway_token,
    verified,
    agentId: data.twin_pinata_agent_id,
    agentName: data.twin_pinata_agent_name,
    connectedAt: data.twin_pinata_connected_at,
    templateSnapshotCid: template?.snapshotCid ?? null,
    agentSnapshotCid: data.twin_pinata_snapshot_cid,
  });
}
