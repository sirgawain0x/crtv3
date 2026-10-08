import { NextRequest, NextResponse } from "next/server";
import { fetchCreativeIssues } from "@/lib/newsletter/providers/creative";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const issues = await fetchCreativeIssues(slug, 50);

  return NextResponse.json({
    publicationSlug: slug,
    issues,
  });
}
