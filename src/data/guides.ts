/**
 * Guide hubs (IA): 6 curated topic hubs replacing sprawling Resources + Experiences.
 * Links only existing migrated posts and site pages — no invented articles.
 */

export type GuideLink = {
  title: string;
  href: string;
  description?: string;
  kind: "post" | "page";
};

export type GuideHub = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  links: GuideLink[];
};

export const guidesIntro = {
  label: "Guides",
  title: "Guides worth opening.",
  description:
    "Practical notes from trips already taken — planning, money, packing, smarter travel, stays, and experiences. No booking desk; just the journal.",
};

export const guideHubs: GuideHub[] = [
  {
    slug: "plan-a-trip",
    title: "Plan a trip",
    shortTitle: "Plan",
    description:
      "Checklists, first-timer destinations, and destination notes from itineraries I’ve already walked.",
    icon: "compass",
    links: [
      {
        title: "15 Steps to Effortlessly Plan Your Next Adventure",
        href: "/15-steps-to-effortlessly-plan-your-next-adventure",
        kind: "post",
      },
      {
        title: "Best Solo Travel Destinations for First-Time Travelers",
        href: "/best-solo-travel-destinations",
        kind: "post",
      },
      {
        title: "Cancun in 5 Days",
        href: "/cancun-5-day-travel-guide",
        kind: "post",
      },
      {
        title: "Discovering Iceland: A Week in the Land of Fire and Ice",
        href: "/discovering-iceland-a-week-in-the-land-of-fire-and-ice",
        kind: "post",
      },
      {
        title: "Rio de Janeiro Itinerary 2 Weeks",
        href: "/rio-de-janeiro-itinerary",
        kind: "post",
      },
      {
        title: "48 Hours in Toronto",
        href: "/toronto-travel-guide",
        kind: "post",
      },
    ],
  },
  {
    slug: "money-budget",
    title: "Money & budget",
    shortTitle: "Money",
    description:
      "Stretch a trip, cards I actually use, and money notes from the road.",
    icon: "wallet",
    links: [
      {
        title: "How to Travel the World on a Budget",
        href: "/travel-the-world-on-a-budget",
        kind: "post",
      },
      {
        title: "My Secret Weapon—A Spending Journal",
        href: "/stay-on-budget-travel-spending-journal",
        kind: "post",
      },
      {
        title: "How to Score Cheap Flights",
        href: "/how-to-score-cheap-flights",
        kind: "post",
      },
      {
        title: "How to Save Money on Accommodation",
        href: "/save-money-accommodation",
        kind: "post",
      },
      {
        title: "Wise Review",
        href: "/wise-card-review",
        kind: "post",
      },
      {
        title: "The Best Travel Credit Cards",
        href: "/top-travel-credit-cards",
        kind: "post",
      },
    ],
  },
  {
    slug: "pack-gear",
    title: "Pack & gear",
    shortTitle: "Pack",
    description:
      "What earns a spot in the bag — light packing and tech that survives real itineraries.",
    icon: "backpack",
    links: [
      {
        title: "How to Travel Comfortably with Minimal Luggage",
        href: "/travel-with-minimal-luggage",
        kind: "post",
      },
      {
        title: "10 Essential Travel Gadgets",
        href: "/travel-tech-essentials",
        kind: "post",
      },
    ],
  },
  {
    slug: "travel-smarter",
    title: "Travel smarter",
    shortTitle: "Smarter",
    description:
      "Lessons from the road — apps, jet lag, insurance, REAL ID, and traveling with a smaller footprint.",
    icon: "lightbulb",
    links: [
      {
        title: "Travel Like a Pro: 10 Easy Tips",
        href: "/10-tips-for-amazing-adventure",
        kind: "post",
      },
      {
        title: "The One Travel Mistake I’ll Never Make Again",
        href: "/travel-mistake-never-again",
        kind: "post",
      },
      {
        title: "Guide to Overcoming Jet Lag",
        href: "/guide-to-overcoming-jet-lag",
        kind: "post",
      },
      {
        title: "Best Apps for Stress-Free Travel",
        href: "/best-travel-apps",
        kind: "post",
      },
      {
        title: "How to Travel Sustainably and Responsibly",
        href: "/sustainable-travel-tips",
        kind: "post",
      },
      {
        title: "Why Travel Insurance is Essential",
        href: "/travel-insurance-allianz-world-nomads",
        kind: "post",
      },
      {
        title: "REAL ID Requirements",
        href: "/real-id-requirements-2025",
        kind: "post",
      },
      {
        title: "Automatic Refunds for Flight Delays",
        href: "/automatic-refunds-for-flight",
        kind: "post",
      },
    ],
  },
  {
    slug: "stays-getting-around",
    title: "Stays & getting around",
    shortTitle: "Stays",
    description:
      "Where I look for a place to sleep, and how I get from A to B without the sticker shock.",
    icon: "hotel",
    links: [
      {
        title: "Top Accommodation Sites of 2025",
        href: "/discover-the-top-accommodation-sites-of-2025",
        kind: "post",
      },
      {
        title: "How to Save Money on Accommodation",
        href: "/save-money-accommodation",
        kind: "post",
      },
      {
        title: "How to Score Cheap Flights",
        href: "/how-to-score-cheap-flights",
        kind: "post",
      },
      {
        title: "Automatic Refunds for Flight Delays",
        href: "/automatic-refunds-for-flight",
        kind: "post",
      },
      {
        title: "Greenland’s New International Airport",
        href: "/nuuk-airport-opening",
        kind: "post",
      },
    ],
  },
  {
    slug: "experiences",
    title: "Experiences",
    shortTitle: "Experiences",
    description:
      "Adventure days, outdoors, food finds, and the bucket-list moments worth the early alarm.",
    icon: "sparkles",
    links: [
      {
        title: "Top Adventure Travel Destinations for 2025",
        href: "/top-adventure-travel-destinations-for-2025",
        kind: "post",
      },
      {
        title: "Chasing Sunrise at Maroon Bells",
        href: "/maroon-bells",
        kind: "post",
      },
      {
        title: "U.S. Ski Destinations",
        href: "/the-ultimate-insiders-guide-to-u-s-ski-destinations",
        kind: "post",
      },
      {
        title: "Top 5 Destinations for Wine Lovers",
        href: "/wine-lovers-destinations",
        kind: "post",
      },
      {
        title: "Top 10 Must-Visit Cities in Europe",
        href: "/top-10-must-visit-european-cities",
        kind: "post",
      },
      {
        title: "NJ Wine Expo 2024",
        href: "/nj-wine-expo-2024",
        kind: "post",
      },
    ],
  },
];

export function getGuideHub(slug: string): GuideHub | undefined {
  return guideHubs.find((h) => h.slug === slug);
}

export function getGuideHubSlugs(): string[] {
  return guideHubs.map((h) => h.slug);
}

/** Nav items for Guides flyout / drawer */
export const guidesNav = guideHubs.map((h) => ({
  title: h.title,
  href: `/guides/${h.slug}`,
  description: h.description,
  icon: h.icon,
}));

/**
 * Old /resources/* and /experiences/* paths → best matching guide hub.
 * Used by next.config redirects.
 * `/experiences` itself is the Plan a Trip Viator page, so it is not redirected.
 * Legacy child paths (/experiences/day-trips and the rest) still go to the guide hub.
 */
export const legacyPathRedirects: { source: string; destination: string }[] = [
  { source: "/resources", destination: "/guides" },
  { source: "/resources/budget-travel", destination: "/guides/money-budget" },
  { source: "/resources/money-travel", destination: "/guides/money-budget" },
  { source: "/resources/packing-guides", destination: "/guides/pack-gear" },
  { source: "/resources/solo-travel", destination: "/guides/plan-a-trip" },
  {
    source: "/resources/stays-perks",
    destination: "/guides/stays-getting-around",
  },
  {
    source: "/resources/sustainable-travel",
    destination: "/guides/travel-smarter",
  },
  {
    source: "/resources/transportation-tips",
    destination: "/guides/stays-getting-around",
  },
  { source: "/resources/travel-gear", destination: "/guides/pack-gear" },
  { source: "/resources/travel-guides", destination: "/guides/plan-a-trip" },
  { source: "/resources/travel-tips", destination: "/guides/travel-smarter" },
  { source: "/resources/useful-apps", destination: "/guides/travel-smarter" },
  {
    source: "/experiences/adventure-travel",
    destination: "/guides/experiences",
  },
  { source: "/experiences/day-trips", destination: "/guides/experiences" },
  { source: "/experiences/outdoors", destination: "/guides/experiences" },
  { source: "/experiences/things-to-do", destination: "/guides/experiences" },
  { source: "/experiences/top-pics", destination: "/guides/experiences" },
  {
    source: "/experiences/tours-excursions",
    destination: "/guides/experiences",
  },
  { source: "/plan-your-trip", destination: "/tools" },
  { source: "/places", destination: "/destinations" },
  { source: "/places/:path*", destination: "/:path*" },
  // Phase D — thin WordPress leftovers → guide hubs
  { source: "/culinary", destination: "/guides/experiences" },
  { source: "/bucket-list", destination: "/guides/experiences" },
  { source: "/travel-wallet", destination: "/guides/money-budget" },
];

/** CMS slugs whose public URLs 301 into Guides. JSON may remain as archive. */
export const redirectedPageSlugs: Record<string, string> = {
  culinary: "/guides/experiences",
  "bucket-list": "/guides/experiences",
  "travel-wallet": "/guides/money-budget",
};

/** Slug → guide hub for blog filter by guide topic */
export const postGuideTopics: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const hub of guideHubs) {
    for (const link of hub.links) {
      if (link.kind !== "post") continue;
      const slug = link.href.replace(/^\//, "");
      if (!map[slug]) map[slug] = [];
      if (!map[slug].includes(hub.slug)) map[slug].push(hub.slug);
    }
  }
  return map;
})();
