export type NewsletterProviderName = "paragraph" | "creative";

export type NewsletterIssue = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  publishedAt: number;
  canonicalUrl: string;
  bodyHtml?: string | null;
};

export type NewsletterPublicationRef = {
  slug: string;
  title: string;
};
