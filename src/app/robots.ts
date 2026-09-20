import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cms", "/cms/", "/api/", "/out", "/out/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
