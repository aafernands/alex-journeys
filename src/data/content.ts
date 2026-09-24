/**
 * Site copy for Alex Journeys (author: Alex Fernandes).
 * Blog posts live in src/content/posts/ (migrated from alexjournly.com).
 * Homepage featured stories are selected in posts/_index.json.
 */

import authorPhotoMeta from "@/data/author-photo.json";

export const site = {
  name: "Alex Journeys",
  url: "https://www.alexjourneys.com",
  authorName: "Alex Fernandes",
  authorPhoto: `${authorPhotoMeta.src}?v=${encodeURIComponent(authorPhotoMeta.updatedAt)}`,
  tagline: "Inspire. Capture. Discover.",
  email: "contact@alexjourneys.com",
  social: {
    instagram: "https://www.instagram.com/alexjrnys/",
    youtube: "https://www.youtube.com/@alexjrnys",
    pinterest: "https://www.pinterest.com/alexjrnys/",
    coffee: "https://www.buymeacoffee.com/alexjrnys",
    newsletter: "#newsletter",
  },
};

export const about = {
  headline: "Hi, I’m Alex",
  paragraphs: [
    "I’m Alex Fernandes — traveler, photographer, and the voice behind Alex Journeys. Based in New Jersey, I share destinations from trips I’ve already taken: the routes, the neighborhoods, and the small details I’d tell a friend over coffee.",
    "Expect trip notes, destination pages, and favorites from the road — not an agency, not a booking service. Just a personal trip journal with room to breathe.",
    "Alex Journeys is my personal trip journal — one traveler, one set of stories.",
  ],
};

/** Fallback hero defaults — live homepage values come from site-design.json (CMS → Website design). */
export const hero = {
  tagline: "Inspire. Capture. Discover.",
  subtitle:
    "A personal travel blog sharing places I’ve been and notes from the road — places, stories, guides, and photos from journeys already behind me.",
  ctaPrimary: "Explore places",
  ctaSecondary: "Plan a trip",
  /** Maroon Bells sunrise — matches the WordPress hero mood */
  image:
    "/media/migrated/2026-06-a60c26af-799c-4f17-8a9f-f97a75adb417-e1780787677499-fcca20aa.webp",
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
    href: "/iceland",
    image:
      "/media/migrated/2025-07-img-6855-scaled-1-1afdda54.webp",
    imageAlt: "Discovering Iceland…",
  },
  {
    name: "Brazil",
    href: "/brazil",
    image:
      "/media/migrated/2025-05-img-4839-c7c74644.webp",
    imageAlt: "Rio de Janeiro, Brazil",
  },
  {
    name: "USA",
    href: "/united-states",
    image:
      "/media/migrated/2026-06-a60c26af-799c-4f17-8a9f-f97a75adb417-e1780787677499-fcca20aa.webp",
    imageAlt: "Maroon Bells View and Lake reflection…",
  },
  {
    name: "Mexico",
    href: "/mexico",
    image:
      "/media/migrated/2026-06-img-9395-scaled-1a44b1f7.webp",
    imageAlt: "Cancún, Mexico",
  },
  {
    name: "Canada",
    href: "/canada",
    image:
      "/media/migrated/2024-10-img-0863-1-5008158e.webp",
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
