import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Alex Journeys",
    short_name: "Alex Journeys",
    description: "Your trips and travel inspiration, one tap away.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f0e6",
    theme_color: "#211e17",
    icons: [{ src: "/brand/favicon.png", sizes: "2000x2000", type: "image/png", purpose: "any" }],
  };
}
