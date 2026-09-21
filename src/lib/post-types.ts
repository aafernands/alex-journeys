export type FeaturedImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  /**
   * ISO timestamp of the last CMS Update & publish.
   * Omitted when the post has never been updated after first publish.
   * `date` remains the first-published date.
   */
  updatedAt?: string;
  excerpt: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
  /** Optional guide hub slugs (e.g. "plan-a-trip") — lists the post on that Guides page. */
  guideHubs?: string[];
};

/** Day-by-day trip timeline stored separately from contentHtml. */
export type PostItineraryBlock = {
  id: string;
  time?: string;
  place?: string;
  body: string;
};

export type PostItineraryDay = {
  id: string;
  label: string;
  title: string;
  summary?: string;
  blocks: PostItineraryBlock[];
};

export type PostItinerary = {
  enabled: boolean;
  title?: string;
  intro?: string;
  days: PostItineraryDay[];
};

/** WordPress-migrated posts keep the object source; CMS-published posts use "cms". */
export type PostSource =
  | "cms"
  | {
      site: string;
      url: string;
      wpId: number;
    };

export type Post = PostMeta & {
  contentHtml: string;
  source: PostSource;
  /** Optional structured day-by-day timeline (not HTML in content). */
  itinerary?: PostItinerary;
};
