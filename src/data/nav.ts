/**
 * Nav + affiliate tools from WordPress Blog Menu (id 42) and Trip Planner.
 * Font Awesome titles replaced with lucide icon keys.
 * Login intentionally omitted.
 */

export type NavChild = {
  title: string;
  href: string;
  description?: string;
  icon: string;
};

export type AffiliateTool = {
  title: string;
  partner: string;
  href: string;
  description: string;
  icon: string;
};

export const experiencesNav: NavChild[] = [
  {
    title: "Adventure Travel",
    href: "/experiences/adventure-travel",
    description: "Thrilling journeys that push the limits.",
    icon: "mountain",
  },
  {
    title: "Bucket List",
    href: "/bucket-list",
    description: "Must-see trips worth the early alarm.",
    icon: "star",
  },
  {
    title: "Day Trips",
    href: "/experiences/day-trips",
    description: "Short getaways and local escapes.",
    icon: "sun",
  },
  {
    title: "Food & Culture",
    href: "/culinary",
    description: "Flavors, markets, and cultural bites.",
    icon: "utensils",
  },
  {
    title: "The Outdoors",
    href: "/experiences/outdoors",
    description: "Trails, parks, and alpine mornings.",
    icon: "trees",
  },
  {
    title: "Things to Do",
    href: "/experiences/things-to-do",
    description: "Activities from past trips.",
    icon: "map-pin",
  },
  {
    title: "Top Pics",
    href: "/experiences/top-pics",
    description: "Personal highlights and themed lists.",
    icon: "sparkles",
  },
  {
    title: "Tours & Excursions",
    href: "/experiences/tours-excursions",
    description: "Guided days I actually enjoyed.",
    icon: "binoculars",
  },
];

export const resourcesNav: NavChild[] = [
  {
    title: "Budget Travel",
    href: "/resources/budget-travel",
    description: "Stretch a trip without skipping the good parts.",
    icon: "wallet",
  },
  {
    title: "Money & Travel",
    href: "/resources/money-travel",
    description: "Cards, cash, and fees abroad.",
    icon: "banknote",
  },
  {
    title: "Packing Guides",
    href: "/resources/packing-guides",
    description: "What earns a spot in the bag.",
    icon: "backpack",
  },
  {
    title: "Solo Travel",
    href: "/resources/solo-travel",
    description: "First-timer destinations and tips.",
    icon: "user",
  },
  {
    title: "Stays & Perks",
    href: "/resources/stays-perks",
    description: "Hotels, unique stays, and rewards.",
    icon: "hotel",
  },
  {
    title: "Sustainable Travel",
    href: "/resources/sustainable-travel",
    description: "Smaller footprint, better trips.",
    icon: "leaf",
  },
  {
    title: "Transportation Tips",
    href: "/resources/transportation-tips",
    description: "Flights, transit, and getting around.",
    icon: "plane",
  },
  {
    title: "Travel Gear",
    href: "/resources/travel-gear",
    description: "Kit that survives real itineraries.",
    icon: "suitcase",
  },
  {
    title: "Travel Guides",
    href: "/resources/travel-guides",
    description: "Destination notes from trips taken.",
    icon: "book-open",
  },
  {
    title: "Travel Tips",
    href: "/resources/travel-tips",
    description: "Packing, booking, and planning smarter.",
    icon: "lightbulb",
  },
  {
    title: "Useful Apps",
    href: "/resources/useful-apps",
    description: "Phone tools that lower travel stress.",
    icon: "smartphone",
  },
];


/** Items shown at the top of the Resources flyout / drawer (not the resources hub grid). */
export const resourcesMenuExtras: NavChild[] = [
  {
    title: "Experiences",
    href: "/experiences",
    description: "Adventure, food, outdoors, and day trips.",
    icon: "sparkles",
  },
  {
    title: "Trip tools",
    href: "/plan-your-trip",
    description: "Booking partners and apps I actually use.",
    icon: "compass",
  },
];

/** Useful affiliate partners from /plan-your-trip — not booking widgets. */
export const tripPlannerTools: AffiliateTool[] = [
  {
    title: "Find Accommodation",
    partner: "Booking.com",
    href: "https://tidd.ly/4kgHAYw",
    description: "Where I usually start when hunting a place to sleep.",
    icon: "hotel",
  },
  {
    title: "Explore Experiences",
    partner: "Viator",
    href: "https://www.viator.com/?pid=P00143772&mcid=42383&medium=link&campaign=book-experience",
    description: "Day tours and activities from past trips.",
    icon: "compass",
  },
  {
    title: "Find Cheap Flights",
    partner: "Expedia",
    href: "https://expedia.com/affiliates/nyc/plan_trip",
    description: "Flight search when I’m comparing options.",
    icon: "plane",
  },
  {
    title: "Affordable Car Rentals",
    partner: "Rentcars.com",
    href: "https://rentcars.com/en/?requestorid=9563&utm_source=fernandesjourneys.com&utm_medium=afiliado-link&utm_campaign=rent-car",
    description: "Road-trip wheels without sticker shock.",
    icon: "car",
  },
  {
    title: "Travel Insurance",
    partner: "World Nomads",
    href: "https://www.tkqlhce.com/click-101054501-15417474?sid=find_insurance&url=https%3A%2F%2Fwww.worldnomads.com%2Ftravel-insurance",
    description: "Coverage I look at before longer trips.",
    icon: "shield",
  },
  {
    title: "International Transfers",
    partner: "Wise",
    href: "https://wise.prf.hn/l/LAXNDNR/",
    description: "Moving money across borders with fewer fees.",
    icon: "banknote",
  },
  {
    title: "Speak a New Language",
    partner: "Babbel",
    href: "http://babbel.sjv.io/YRjqnr",
    description: "Phrase practice before landing somewhere new.",
    icon: "languages",
  },
  {
    title: "Stay Connected Anywhere",
    partner: "Saily",
    href: "https://go.saily.site/aff_c?offer_id=101&aff_id=9600",
    description: "eSIM data when I need a local connection.",
    icon: "wifi",
  },
];
