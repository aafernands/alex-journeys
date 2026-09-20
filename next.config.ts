import type { NextConfig } from "next";
import { legacyPathRedirects } from "./src/data/guides";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        // Author photo uses ?v=updatedAt cache-bust from author-photo.json
        pathname: "/brand/**",
      },
      {
        pathname: "/media/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return legacyPathRedirects.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
