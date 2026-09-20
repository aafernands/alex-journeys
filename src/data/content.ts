/**
 * Site copy for Fernandes Journeys (author: Alex Fernandes).
 * Blog posts live in src/content/posts/ (migrated from alexjournly.com).
 * Homepage featured stories are selected in posts/_index.json.
 */

import authorPhotoMeta from "@/data/author-photo.json";

export const site = {
  name: "Fernandes Journeys",
  authorName: "Alex Fernandes",
  authorPhoto: `${authorPhotoMeta.src}?v=${encodeURIComponent(authorPhotoMeta.updatedAt)}`,
  tagline: "Inspire. Capture. Discover.",
  email: "hello@fernandesjourneys.com",
  social: {
    instagram: "https://www.instagram.com/fernandesjourneys/",
    youtube: "https://www.youtube.com/@fernandesjourneys",
    pinterest: "https://pinterest.com/",
    coffee: "https://www.buymeacoffee.com/fernandesjourneys",
    newsletter: "#newsletter",
  },
};

export const about = {
  headline: "Hi, I’m Alex",
  paragraphs: [
    "I’m Alex Fernandes — traveler, photographer, and the voice behind Fernandes Journeys. Based in New Jersey, I share destinations from trips I’ve already taken: the routes, the neighborhoods, and the small details I’d tell a friend over coffee.",
    "Expect trip notes, destination pages, and favorites from the road — not an agency, not a booking service. Just a personal trip journal with room to breathe.",
    "Fernandes Journeys is my personal trip journal — one traveler, one set of stories.",
  ],
};

export const hero = {
  tagline: "Inspire. Capture. Discover.",
  subtitle:
    "A personal travel blog sharing places I’ve been and notes from the road — places, stories, guides, and photos from journeys already behind me.",
  ctaPrimary: "Explore places",
  ctaSecondary: "Read stories",
  /** Maroon Bells sunrise — matches the WordPress hero mood */
  image:
    "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/A60C26AF-799C-4F17-8A9F-F97A75ADB417-e1780787677499.webp?fit=1320%2C1728&ssl=1",
  imageAlt: "Sunrise over Maroon Bells reflected in a calm alpine lake",
};

/** Homepage Start Here funnel cards — Places · Stories · Guides */
export const startHereCards = [
  {
    title: "Places",
    href: "/destinations",
    icon: "map-pin",
    description:
      "Browse places I’ve actually visited — country pages and trip notes tied to real itineraries.",
    cta: "See places",
  },
  {
    title: "Stories",
    href: "/blog",
    icon: "book-open",
    description:
      "Guides, sunrise chases, packing fails, and the long-form notes from the road.",
    cta: "Read stories",
  },
  {
    title: "Guides",
    href: "/guides",
    icon: "compass",
    description:
      "Plan, money, packing, smarter travel, stays, and experiences — six hubs of notes I still use.",
    cta: "Open guides",
  },
];

/** Photo pills for the destination row on the homepage */
export const destinationPills = [
  {
    name: "Iceland",
    href: "/destinations/iceland",
    image:
      "https://i0.wp.com/alexjournly.com/wp-content/uploads/2025/07/IMG_6855-scaled-1.webp?fit=1440%2C1920&ssl=1",
    imageAlt: "Discovering Iceland…",
  },
  {
    name: "Brazil",
    href: "/destinations/brazil",
    image:
      "https://i0.wp.com/alexjournly.com/wp-content/uploads/2025/05/img_4839.webp?fit=1440%2C1920&ssl=1",
    imageAlt: "Rio de Janeiro, Brazil",
  },
  {
    name: "USA",
    href: "/destinations/united-states",
    image:
      "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/A60C26AF-799C-4F17-8A9F-F97A75ADB417-e1780787677499.webp?fit=1320%2C1728&ssl=1",
    imageAlt: "Maroon Bells View and Lake reflection…",
  },
  {
    name: "Mexico",
    href: "/destinations/mexico",
    image:
      "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/IMG_9395-scaled.webp?fit=1440%2C1920&ssl=1",
    imageAlt: "Cancún, Mexico",
  },
  {
    name: "Canada",
    href: "/destinations/canada",
    image:
      "https://i0.wp.com/alexjournly.com/wp-content/uploads/2024/10/img_0863-1.webp?fit=1280%2C1920&ssl=1",
    imageAlt: "Toronto, Canada",
  },
];

/** Banner behind the Hidden Gems featured tray */
export const featuredBand = {
  eyebrow: "Uncover",
  title: "Hidden Gems",
  image:
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1800&q=80",
  imageAlt: "Waterfall cascading through a misty valley",
};
