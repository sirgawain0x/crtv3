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
    .from("prediction_market_creations")
    .select("question_id, title, category")
    .or(`title.ilike.%${q}%,category.ilike.%${q}%`)
    .not("question_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ results: [] });
  }

  const results = (data ?? [])
    .filter((row) => row.question_id)
    .map((row) => ({
      questionId: row.question_id as string,
      title: row.title ?? "Prediction",
      category: row.category ?? undefined,
      href: `/predict/${row.question_id}`,
    }));

  return NextResponse.json({ results });
}
