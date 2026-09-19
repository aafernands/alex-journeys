/**
 * Topic hub pages mapped from WP category archives → related migrated posts.
 */

export type Topic = {
  slug: string;
  section: "resources" | "experiences";
  title: string;
  description: string;
  icon: string;
  postSlugs: string[];
};

export const topics: Topic[] = [
  {
    slug: "budget-travel",
    section: "resources",
    title: "Budget Travel",
    description: "Stretch a trip without skipping the good parts.",
    icon: "wallet",
    postSlugs: [
      "travel-the-world-on-a-budget",
      "stay-on-budget-travel-spending-journal",
      "how-to-score-cheap-flights",
      "save-money-accommodation",
    ],
  },
  {
    slug: "money-travel",
    section: "resources",
    title: "Money & Travel",
    description: "Cards, cash, and fees — what I use on the road.",
    icon: "banknote",
    postSlugs: ["wise-card-review", "top-travel-credit-cards"],
  },
  {
    slug: "packing-guides",
    section: "resources",
    title: "Packing Guides",
    description: "Light bags and the gadgets that earn their weight.",
    icon: "backpack",
    postSlugs: ["travel-with-minimal-luggage", "travel-tech-essentials"],
  },
  {
    slug: "solo-travel",
    section: "resources",
    title: "Solo Travel",
    description: "First-timer destinations and comfort-zone stretchers.",
    icon: "user",
    postSlugs: ["best-solo-travel-destinations", "travel-mistake-never-again"],
  },
  {
    slug: "stays-perks",
    section: "resources",
    title: "Stays & Perks",
    description: "Where I look when hunting a place to sleep.",
    icon: "hotel",
    postSlugs: [
      "discover-the-top-accommodation-sites-of-2025",
      "save-money-accommodation",
      "top-travel-credit-cards",
    ],
  },
  {
    slug: "sustainable-travel",
    section: "resources",
    title: "Sustainable Travel",
    description: "Smaller footprint, better trips.",
    icon: "leaf",
    postSlugs: ["sustainable-travel-tips"],
  },
  {
    slug: "transportation-tips",
    section: "resources",
    title: "Transportation Tips",
    description: "Flights, delays, and getting around.",
    icon: "plane",
    postSlugs: [
      "how-to-score-cheap-flights",
      "automatic-refunds-for-flight",
      "guide-to-overcoming-jet-lag",
    ],
  },
  {
    slug: "travel-gear",
    section: "resources",
    title: "Travel Gear",
    description: "Tech and kit that survive real itineraries.",
    icon: "suitcase",
    postSlugs: ["travel-tech-essentials", "travel-with-minimal-luggage"],
  },
  {
    slug: "travel-guides",
    section: "resources",
    title: "Travel Guides",
    description: "Destination notes from journeys already taken.",
    icon: "book-open",
    postSlugs: [
      "cancun-5-day-travel-guide",
      "discovering-iceland-a-week-in-the-land-of-fire-and-ice",
      "rio-de-janeiro-itinerary",
      "toronto-travel-guide",
      "15-steps-to-effortlessly-plan-your-next-adventure",
    ],
  },
  {
    slug: "travel-tips",
    section: "resources",
    title: "Travel Tips",
    description: "Planning checklists and lessons from the road.",
    icon: "lightbulb",
    postSlugs: [
      "10-tips-for-amazing-adventure",
      "15-steps-to-effortlessly-plan-your-next-adventure",
      "travel-mistake-never-again",
      "guide-to-overcoming-jet-lag",
      "real-id-requirements-2025",
    ],
  },
  {
    slug: "useful-apps",
    section: "resources",
    title: "Useful Apps",
    description: "Phone tools that lower travel stress.",
    icon: "smartphone",
    postSlugs: ["best-travel-apps"],
  },
  {
    slug: "adventure-travel",
    section: "experiences",
    title: "Adventure Travel",
    description: "Heart-pounding places on my shortlist.",
    icon: "mountain",
    postSlugs: [
      "top-adventure-travel-destinations-for-2025",
      "marron-bells",
      "the-ultimate-insiders-guide-to-u-s-ski-destinations",
    ],
  },
  {
    slug: "day-trips",
    section: "experiences",
    title: "Day Trips",
    description: "Short getaways from past itineraries.",
    icon: "sun",
    postSlugs: ["marron-bells", "toronto-travel-guide", "nj-wine-expo-2024"],
  },
  {
    slug: "outdoors",
    section: "experiences",
    title: "The Outdoors",
    description: "Mountains, lakes, and alpine mornings.",
    icon: "trees",
    postSlugs: [
      "marron-bells",
      "discovering-iceland-a-week-in-the-land-of-fire-and-ice",
      "the-ultimate-insiders-guide-to-u-s-ski-destinations",
    ],
  },
  {
    slug: "things-to-do",
    section: "experiences",
    title: "Things to Do",
    description: "Activities and sights from trips I’ve taken.",
    icon: "map-pin",
    postSlugs: [
      "cancun-5-day-travel-guide",
      "rio-de-janeiro-itinerary",
      "toronto-travel-guide",
      "top-10-must-visit-european-cities",
    ],
  },
  {
    slug: "top-pics",
    section: "experiences",
    title: "Top Pics",
    description: "Personal highlights and themed lists.",
    icon: "sparkles",
    postSlugs: [
      "wine-lovers-destinations",
      "best-solo-travel-destinations",
      "top-10-must-visit-european-cities",
      "top-adventure-travel-destinations-for-2025",
    ],
  },
  {
    slug: "tours-excursions",
    section: "experiences",
    title: "Tours & Excursions",
    description: "Guided days and excursions from the journal.",
    icon: "binoculars",
    postSlugs: [
      "cancun-5-day-travel-guide",
      "discovering-iceland-a-week-in-the-land-of-fire-and-ice",
      "marron-bells",
    ],
  },
];

export function getTopicsBySection(section: Topic["section"]): Topic[] {
  return topics.filter((t) => t.section === section);
}

export function getTopic(section: Topic["section"], slug: string): Topic | null {
  return topics.find((t) => t.section === section && t.slug === slug) || null;
}
