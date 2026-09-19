/**
 * Nav types + affiliate tools.
 * Guide hubs live in src/data/guides.ts.
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
