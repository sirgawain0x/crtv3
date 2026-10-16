import { createServiceClient } from "@/lib/sdk/supabase/service";
import { serverLogger } from "@/lib/utils/logger";
import type { NewsletterIssue } from "../types";
import { buildIssueCanonicalUrl } from "../config";

export async function fetchCreativeIssues(
  publicationSlug: string,
  limit = 6
): Promise<NewsletterIssue[]> {
  try {
    const supabase = createServiceClient();

    const { data: publication, error: pubError } = await supabase
      .from("newsletter_publications")
      .select("id, slug")
      .eq("slug", publicationSlug)
      .maybeSingle();

    if (pubError) {
      serverLogger.error("newsletter_publications lookup failed:", pubError);
      return [];
    }
    if (!publication) {
      return [];
    }

    const { data: issues, error: issuesError } = await supabase
      .from("newsletter_issues")
      .select("id, slug, title, subtitle, body_html, cover_image_url, published_at")
      .eq("publication_id", publication.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (issuesError) {
      serverLogger.error("newsletter_issues fetch failed:", issuesError);
      return [];
    }

    return (issues ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: row.cover_image_url,
      publishedAt: row.published_at
        ? new Date(row.published_at).getTime()
        : Date.now(),
      canonicalUrl: buildIssueCanonicalUrl(publication.slug, row.slug),
      bodyHtml: row.body_html,
    }));
  } catch (error) {
    serverLogger.error("fetchCreativeIssues error:", error);
    return [];
  }
}
