/**
 * The members hub (/premium/perks): which perks exist, where they live, and
 * what free readers get instead. Safe for client and server.
 */
import { FREE_SAVED_TRIPS, planATripHref } from "@/lib/trip-record";
import type { PostMeta } from "@/lib/post-types";

export const PERKS_HUB_PATH = "/premium/perks";
export const DOWNLOADS_PATH = "/premium/downloads";
export const DEALS_PATH = "/premium/deals";
export const JOIN_PATH = "/premium#plans";

export type HubPerkId = "stories" | "downloads" | "deals" | "trip-planner" | "hotel-rates";

export type HubPerk = {
  id: HubPerkId;
  title: string;
  /** What members get. */
  detail: string;
  /** What changes for a free reader, shown on the locked card. */
  lockedDetail: string;
  href: string | null;
  cta: string;
  comingSoon?: boolean;
};

export const HUB_PERKS: HubPerk[] = [
  {
    id: "stories",
    title: "Members-only stories",
    detail: "The stories Alex keeps for members, in full.",
    lockedDetail: "Free readers see the opening. Members read the rest.",
    href: "#member-stories",
    cta: "Read",
  },
  {
    id: "downloads",
    title: "Downloads",
    detail: "PDF guides and Alex\u2019s Lightroom presets, ready to keep.",
    lockedDetail: "PDF guides and Lightroom presets, for members.",
    href: DOWNLOADS_PATH,
    cta: "Open downloads",
  },
  {
    id: "deals",
    title: "Weekly deals",
    detail: "Deal notes on flights out of Newark, JFK, and Philadelphia.",
    lockedDetail: "Deal notes from Newark, JFK, and Philadelphia, for members.",
    href: DEALS_PATH,
    cta: "See deals",
  },
  {
    id: "trip-planner",
    title: "Trip planner (unlimited)",
    detail: "Save as many trips as you plan and share a link to any of them.",
    lockedDetail: `Free accounts save up to ${FREE_SAVED_TRIPS} trips. Members save unlimited trips and share links.`,
    href: planATripHref(),
    cta: "Plan a trip",
  },
  {
    id: "hotel-rates",
    title: "Member hotel rates",
    detail: "A member rate on stays, once it is ready.",
    lockedDetail: "A member rate on stays, once it is ready.",
    href: null,
    cta: "Coming soon",
    comingSoon: true,
  },
];

/** Deal notes, newest first. */
export function dealNotes(posts: readonly PostMeta[]): PostMeta[] {
  return posts
    .filter((post) => post.dealNote === true)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/** Members-only stories that are not deal notes, newest first. */
export function memberStories(posts: readonly PostMeta[]): PostMeta[] {
  return posts
    .filter((post) => post.membersOnly === true && post.dealNote !== true)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
