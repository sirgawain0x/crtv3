import type { NewsletterProviderName } from "./types";

export function getNewsletterProvider(): NewsletterProviderName {
  const raw = process.env.NEWSLETTER_PROVIDER?.toLowerCase();
  if (raw === "creative") {
    return "creative";
  }
  return "paragraph";
}

export function getDearCreativePublicationSlug(): string {
  return process.env.NEXT_PUBLIC_DEAR_CREATIVE_NEWSLETTER_SLUG ?? "dear-creative";
}

export function buildIssueCanonicalUrl(publicationSlug: string, issueSlug: string): string {
  const base = (
    process.env.NEXT_PUBLIC_NEWSLETTER_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://tv.creativeplatform.xyz"
  ).replace(/\/$/, "");

  if (getNewsletterProvider() === "paragraph" && publicationSlug === getDearCreativePublicationSlug()) {
    return `https://news.creativeplatform.xyz/${issueSlug}`;
  }

  return `${base}/news/${publicationSlug}/${issueSlug}`;
}
