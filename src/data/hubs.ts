/**
 * Topic hubs rebuilt from WordPress category landing pages
 * (travel-resources, travel-experiences, bucket-list post grids).
 * Links point at migrated blog posts / site pages — not booking widgets.
 */

export type HubTopic = {
  title: string;
  description: string;
  href: string;
};

export type HubPostRef = {
  slug: string;
};

export const resourcesIntro = {
  label: "Resources",
  title: "My favorite travel resources",
  description:
    "Tools, apps, and guides I actually use when planning trips — budget tips, packing, money abroad, and gear that earned a spot in my bag. No booking desk; just notes from the road.",
};

export const resourcesTopics: HubTopic[] = [
  {
    title: "Budget travel",
    description: "Stretch a trip without skipping the good parts.",
    href: "/blog/travel-the-world-on-a-budget",
  },
  {
    title: "Money abroad",
    description: "Cards, cash, and fees — what I use on the road.",
    href: "/travel-wallet",
  },
  {
    title: "Packing guides",
    description: "Light bags and the gadgets that earn their weight.",
    href: "/blog/travel-with-minimal-luggage",
  },
  {
    title: "Solo travel",
    description: "First-timer destinations and comfort-zone stretchers.",
    href: "/blog/best-solo-travel-destinations",
  },
  {
    title: "Stays & perks",
    description: "Where I look when hunting a place to sleep.",
    href: "/blog/discover-the-top-accommodation-sites-of-2025",
  },
  {
    title: "Sustainable travel",
    description: "Smaller footprint, better trips.",
    href: "/blog/sustainable-travel-tips",
  },
  {
    title: "Flights & transport",
    description: "Cheap seats, delays, and getting around.",
    href: "/blog/how-to-score-cheap-flights",
  },
  {
    title: "Travel gear",
    description: "Tech and kit that survive real itineraries.",
    href: "/blog/travel-tech-essentials",
  },
  {
    title: "Travel tips",
    description: "Planning checklists and lessons learned the hard way.",
    href: "/blog/15-steps-to-effortlessly-plan-your-next-adventure",
  },
  {
    title: "Useful apps",
    description: "Phone tools that lower travel stress.",
    href: "/blog/best-travel-apps",
  },
];

export const experiencesIntro = {
  label: "Experiences",
  title: "Must-try travel experiences",
  description:
    "Stories shaped by what I actually did on the ground — adventure days, food finds, outdoors, and the bucket-list moments worth the early alarm.",
};

export const experiencesTopics: HubTopic[] = [
  {
    title: "Adventure travel",
    description: "Heart-pounding places on my shortlist.",
    href: "/blog/top-adventure-travel-destinations-for-2025",
  },
  {
    title: "Bucket list",
    description: "Sunrise chases and once-in-a-while trips.",
    href: "/bucket-list",
  },
  {
    title: "Food & culture",
    description: "Flavors from Iceland to Brazil and street carts in between.",
    href: "/culinary",
  },
  {
    title: "Wine country",
    description: "Sips worth planning a weekend around.",
    href: "/blog/wine-lovers-destinations",
  },
  {
    title: "The outdoors",
    description: "Mountains, lakes, and alpine mornings.",
    href: "/blog/marron-bells",
  },
  {
    title: "Ski trips",
    description: "U.S. slopes from an insider’s notebook.",
    href: "/blog/the-ultimate-insiders-guide-to-u-s-ski-destinations",
  },
  {
    title: "City guides",
    description: "Weekend and two-week itineraries I’ve walked.",
    href: "/blog/toronto-travel-guide",
  },
  {
    title: "Beach escapes",
    description: "Sand, ferries, and late nights done right.",
    href: "/blog/cancun-5-day-travel-guide",
  },
];

/** Curated from the WordPress Bucket List posts widget */
export const bucketListSlugs: string[] = [
  "marron-bells",
  "top-adventure-travel-destinations-for-2025",
  "discovering-iceland-a-week-in-the-land-of-fire-and-ice",
  "rio-de-janeiro-itinerary",
  "best-solo-travel-destinations",
  "top-10-must-visit-european-cities",
  "wine-lovers-destinations",
  "the-ultimate-insiders-guide-to-u-s-ski-destinations",
];
