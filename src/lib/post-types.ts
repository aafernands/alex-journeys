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
  excerpt: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
  /** Optional guide hub slugs (e.g. "plan-a-trip") — lists the post on that Guides page. */
  guideHubs?: string[];
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
};
