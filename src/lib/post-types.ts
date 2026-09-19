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
};

export type Post = PostMeta & {
  contentHtml: string;
  source: {
    site: string;
    url: string;
    wpId: number;
  };
};
