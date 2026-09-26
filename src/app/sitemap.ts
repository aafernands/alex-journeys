import type { MetadataRoute } from "next";
import { getAllDestinations } from "@/data/destinations";
import { getGuideHubSlugs } from "@/data/guides";
import { isPostIndexable } from "@/lib/post-seo";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/seo";

const STATIC_ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/start-here", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.9 },
  { path: "/destinations", changeFrequency: "weekly", priority: 0.9 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.85 },
  { path: "/experiences", changeFrequency: "weekly", priority: 0.7 },
  { path: "/stays", changeFrequency: "weekly", priority: 0.7 },
  { path: "/flights", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tools", changeFrequency: "monthly", priority: 0.6 },
  { path: "/premium", changeFrequency: "monthly", priority: 0.6 },
  { path: "/media-kit", changeFrequency: "monthly", priority: 0.5 },
  { path: "/policies", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/affiliate-disclosure", changeFrequency: "yearly", priority: 0.3 },
  { path: "/app", changeFrequency: "yearly", priority: 0.2 },
  { path: "/search", changeFrequency: "monthly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteConfig.url}${route.path === "/" ? "" : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  for (const post of getAllPosts()) {
    if (!isPostIndexable(post)) continue;
    entries.push({
      url: `${siteConfig.url}/${post.slug}`,
      lastModified: new Date(post.updatedAt ?? (post.date || now)),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const dest of getAllDestinations()) {
    entries.push({
      url: `${siteConfig.url}/${dest.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }

  for (const slug of getGuideHubSlugs()) {
    entries.push({
      url: `${siteConfig.url}/guides/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
