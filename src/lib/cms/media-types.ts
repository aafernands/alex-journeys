export type MediaSource = "wordpress-cdn" | "upload" | "external";

export type MediaUsedBy = {
  type: "post" | "page";
  slug: string;
};

export type MediaItem = {
  id: string;
  /** Stable kebab id; usually same as id */
  slug: string;
  url: string;
  alt: string;
  source: MediaSource;
  width?: number;
  height?: number;
  usedBy: MediaUsedBy[];
  createdAt: string;
};

export type MediaIndex = {
  updatedAt: string;
  count: number;
  items: MediaItem[];
};
