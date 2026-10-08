import { getDearCreativePublicationSlug, getNewsletterProvider } from "./config";
import { fetchCreativeIssues } from "./providers/creative";
import { fetchParagraphIssues } from "./providers/paragraph";
import type { NewsletterIssue, NewsletterProviderName } from "./types";

export type { NewsletterIssue, NewsletterProviderName } from "./types";
export {
  buildIssueCanonicalUrl,
  getDearCreativePublicationSlug,
  getNewsletterProvider,
} from "./config";

export async function getNewsletterIssues(
  limit = 6,
  publicationSlug?: string
): Promise<NewsletterIssue[]> {
  const slug = publicationSlug ?? getDearCreativePublicationSlug();
  const provider = getNewsletterProvider();

  switch (provider) {
    case "creative":
      return fetchCreativeIssues(slug, limit);
    case "paragraph":
      if (slug !== getDearCreativePublicationSlug()) {
        return fetchCreativeIssues(slug, limit);
      }
      return fetchParagraphIssues(limit);
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}
