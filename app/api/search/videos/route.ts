import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { supabaseService } from "@/lib/sdk/supabase/service";

export async function GET(request: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.generous(request);
  if (rl) return rl;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "8", 10) || 8,
    20
  );

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!supabaseService) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabaseService
    .from("video_assets")
    .select("id, title, thumbnail_url")
    .in("status", ["published", "minted"])
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data ?? []).map((row) => ({
    id: String(row.id),
    title: row.title ?? "Untitled",
    thumbnailUrl: row.thumbnail_url ?? undefined,
    href: `/discover/${row.id}`,
  }));

  return NextResponse.json({ results });
}
