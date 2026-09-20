import type { NextConfig } from "next";
import { legacyPathRedirects } from "./src/data/guides";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
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
      {
        // Google profile photos for /account
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    const legacy = legacyPathRedirects.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: true,
    }));
    return [
      ...legacy,
      // Cleaner public URLs: posts + destination countries at /{slug}
      { source: "/blog/:slug", destination: "/:slug", permanent: true },
      {
        source: "/destinations/:slug",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
