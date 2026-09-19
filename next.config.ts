import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
};

export default nextConfig;
