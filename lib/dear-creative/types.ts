export type DearCreativePost = {
  slug: string;
  title: string;
  publishedAt: string;
  excerpt?: string;
  coverImage?: string;
  canonicalUrl?: string;
  isGated?: boolean;
  tags?: string[];
  category?: string;
};

export type DearCreativePublicStats = {
  activeSubscriberCount?: number;
};
