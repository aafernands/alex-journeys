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
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy-Report-Only",
        value:
          "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://www.viator.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com https://pbs.twimg.com https://abs.twimg.com https://www.viator.com; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://challenges.cloudflare.com https://www.viator.com https://api.stripe.com; frame-src 'self' https://challenges.cloudflare.com https://www.viator.com https://js.stripe.com https://hooks.stripe.com; form-action 'self'",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
