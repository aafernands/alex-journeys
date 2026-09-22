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
        // Google profile photos for /account and the header avatar
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        // X profile photos. Auth.js stores profile_image_url as returned
        // by https://api.x.com/2/users/me (no host rewrite).
        // Uploaded avatars: https://pbs.twimg.com/profile_images/…
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/profile_images/**",
      },
      {
        // X default avatar when the account has no uploaded photo:
        // https://abs.twimg.com/sticky/default_profile_images/…
        protocol: "https",
        hostname: "abs.twimg.com",
        pathname: "/sticky/default_profile_images/**",
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
      // Saves live on Account — no standalone Saved page
      { source: "/saved", destination: "/account", permanent: true },
      {
        source: "/saved/:path*",
        destination: "/account",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
