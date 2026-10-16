import {
  getPublicationPosts,
} from "@/app/actions/paragraph";
import type { NewsletterIssue } from "../types";
import { buildIssueCanonicalUrl, getDearCreativePublicationSlug } from "../config";

export async function fetchParagraphIssues(limit = 6): Promise<NewsletterIssue[]> {
  const pubSlug = getDearCreativePublicationSlug();
  const posts = await getPublicationPosts(limit);

  return posts.map((post: Record<string, unknown>) => {
    const slug = String(post.slug ?? post.id);
    const publishedRaw = post.publishedAt;
    const publishedAt =
      typeof publishedRaw === "number"
        ? publishedRaw
        : publishedRaw
          ? Number(publishedRaw)
          : Date.now();

    return {
      id: String(post.id),
      slug,
      title: String(post.title ?? "Untitled"),
      subtitle: (post.subtitle as string | undefined) ?? null,
      imageUrl: (post.imageUrl as string | undefined) ?? (post.cover_image as string | undefined) ?? null,
      publishedAt,
      canonicalUrl: buildIssueCanonicalUrl(pubSlug, slug),
      bodyHtml: null,
    };
  });
}
