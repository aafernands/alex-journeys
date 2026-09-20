import type { NextConfig } from "next";
import { legacyPathRedirects } from "./src/data/guides";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        // Author photo uses ?v=updatedAt cache-bust from author-photo.json
        pathname: "/brand/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "alexjournly.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i1.wp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i2.wp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fernandesjourneys.com",
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
