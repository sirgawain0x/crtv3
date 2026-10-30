export type CreativeTVLensActivityItem = {
  id: string;
  text: string;
  authorLabel: string;
  authorHandle: string | null;
  createdAt: string | null;
  orbUrl: string;
};

export type CreativeTVLensActivityResult = {
  items: CreativeTVLensActivityItem[];
  /** When set, the strip should not render (graceful degradation). */
  skipStrip?: boolean;
};
