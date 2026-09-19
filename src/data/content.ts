/**
 * Site copy for Alex Journly / Fernandes Journeys.
 * Blog posts live in src/content/posts/ (migrated from alexjournly.com).
 * Homepage featured stories are selected in posts/_index.json.
 */

export const site = {
  name: "Alex Journly",
  journalName: "Fernandes Journeys",
  tagline: "Inspire. Capture. Discover.",
  email: "hello@alexjournly.com",
  social: {
    instagram: "https://instagram.com/",
    youtube: "https://youtube.com/",
    pinterest: "https://pinterest.com/",
    coffee: "https://www.buymeacoffee.com/fernandesjourneys",
    newsletter: "#newsletter",
  },
};

export const about = {
  headline: "Hey there — I’m Alex",
  paragraphs: [
    "I’m Alex Fernandes — traveler, photographer, and the voice behind this journal. Based in New Jersey, I share destinations from trips I’ve already taken: the routes, the neighborhoods, and the small details I’d tell a friend over coffee.",
    "Expect trip notes, destination pages, and favorites from the road — not an agency, not a booking service. Just a personal trip journal with room to breathe.",
  ],
};

export const hero = {
  tagline: "Inspire. Capture. Discover.",
  subtitle:
    "A personal travel journal of places I’ve been — destinations, trip notes, and photos from journeys already behind me.",
  ctaPrimary: "Explore destinations",
  ctaSecondary: "Read the blog",
  /** Maroon Bells sunrise — matches the WordPress hero mood */
  image:
    "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/A60C26AF-799C-4F17-8A9F-F97A75ADB417-e1780787677499.webp?fit=1320%2C1728&ssl=1",
  imageAlt: "Sunrise over Maroon Bells reflected in a calm alpine lake",
};

/** Photo pills for the destination row on the homepage */
export const destinationPills = [
  {
    name: "Iceland",
    href: "/destinations/iceland",
    image:
      "https://images.unsplash.com/photo-1531168556467-80aace525c26?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Icelandic waterfall and cliffs",
  },
  {
    name: "Brazil",
    href: "/destinations/brazil",
    image:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Christ the Redeemer overlooking Rio",
  },
  {
    name: "USA",
    href: "/destinations/united-states",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Open road through American landscape",
  },
  {
    name: "Mexico",
    href: "/destinations/mexico",
    image:
      "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Caribbean shoreline in Mexico",
  },
  {
    name: "Canada",
    href: "/destinations/canada",
    image:
      "https://images.unsplash.com/photo-1519834785168-50ca68536663?auto=format&fit=crop&w=600&q=80",
    imageAlt: "Toronto skyline and waterfront",
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
