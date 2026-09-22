/**
 * Plan a Trip → Experiences.
 * Safe to import from client components (no filesystem).
 *
 * Commission:
 * The widget’s Book Now stays inside Viator’s iframe. Those clicks are
 * attributed by data-vi-partner-id (P00143772) and data-vi-campaign.
 * Do not route iframe navigations through /out — that replaces the widget
 * URL and can drop the partner id.
 * Text links that leave this site use the existing /out?to=…&aff=1 wrapper
 * around a Viator search URL that still carries pid, mcid, and campaign.
 */

import {
  VIATOR_PARTNER_ID,
  viatorDynamicWidgetMarkup,
} from "@/lib/viator";

/** Matches the widget name Alex should use in Viator Widgets Hub. */
export const EXPERIENCES_CAMPAIGN = "plan-experiences";

/** MCID already used on Fernandes Journeys Viator links. */
export const VIATOR_LINK_MCID = "42383";

/**
 * Empty until a Dynamic widget ref is pasted into
 * src/content/experiences/viator.json (`dynamicWidgetRef`) or
 * `VIATOR_DYNAMIC_WIDGET_REF`. A fake W-… id is not used — Viator would
 * request a widget that does not exist.
 */
export const VIATOR_DYNAMIC_WIDGET_REF_PLACEHOLDER = "";

const DEST_MAX = 80;

export type ExperiencesQuery = {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number | null;
  children: number | null;
};

export type ViatorExperiencesSettings = {
  partnerId: string;
  /** Valid W-… ref, or empty when the dashboard ref has not been pasted yet. */
  widgetRef: string;
  campaign: string;
  language: string;
  currency: string;
  widgetReady: boolean;
};

export function cleanDestination(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DEST_MAX);
}

function cleanIso(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return value;
}

function cleanCount(
  raw: number | string | null | undefined,
  max = 30,
): number | null {
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 1 || raw > max) return null;
    return raw;
  }
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{1,2}$/.test(value)) return null;
  const count = Number(value);
  if (count < 1 || count > max) return null;
  return count;
}

function firstParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseExperiencesSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ExperiencesQuery {
  const startDate = cleanIso(
    firstParam(searchParams, "start") ||
      firstParam(searchParams, "startDate") ||
      firstParam(searchParams, "from"),
  );
  let endDate = cleanIso(
    firstParam(searchParams, "end") ||
      firstParam(searchParams, "endDate") ||
      firstParam(searchParams, "to"),
  );
  if (startDate && endDate && endDate < startDate) endDate = "";

  return {
    destination: cleanDestination(
      firstParam(searchParams, "dest") || firstParam(searchParams, "destination"),
    ),
    startDate,
    endDate,
    adults: cleanCount(
      firstParam(searchParams, "adults") || firstParam(searchParams, "travelers"),
    ),
    children: cleanCount(firstParam(searchParams, "children")),
  };
}

/** Site path for the experiences page. Empty destination is the empty state. */
export function experiencesPath(input: {
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  adults?: number | string | null;
  children?: number | string | null;
}): string {
  const destination = cleanDestination(input.destination);
  if (!destination) return "/experiences";
  const startDate = cleanIso(input.startDate);
  let endDate = cleanIso(input.endDate);
  if (startDate && endDate && endDate < startDate) endDate = "";
  const adults = cleanCount(input.adults);
  const children = cleanCount(input.children);

  const params = new URLSearchParams();
  if (destination) params.set("dest", destination);
  if (startDate) params.set("start", startDate);
  if (endDate) params.set("end", endDate);
  if (adults) params.set("adults", String(adults));
  if (children) params.set("children", String(children));
  const query = params.toString();
  return query ? `/experiences?${query}` : "/experiences";
}

export function buildExperiencesWidget(
  query: ExperiencesQuery,
  settings: Pick<
    ViatorExperiencesSettings,
    "partnerId" | "widgetRef" | "campaign" | "language" | "currency"
  >,
): string {
  if (!query.destination) return "";
  return viatorDynamicWidgetMarkup({
    partnerId: settings.partnerId || VIATOR_PARTNER_ID,
    widgetRef: settings.widgetRef,
    searchTerm: query.destination,
    campaign: settings.campaign || EXPERIENCES_CAMPAIGN,
    language: settings.language,
    currency: settings.currency,
    travelDateFrom: query.startDate,
    travelDateTo: query.endDate,
    adults: query.adults,
    children: query.children,
  });
}

/** Affiliate search used when a click leaves this site (then wrapped in /out). */
export function viatorExperiencesSearchUrl(
  destination: string,
  partnerId: string = VIATOR_PARTNER_ID,
  campaign: string = EXPERIENCES_CAMPAIGN,
): string {
  const params = new URLSearchParams({
    text: cleanDestination(destination),
    pid: partnerId || VIATOR_PARTNER_ID,
    mcid: VIATOR_LINK_MCID,
    medium: "link",
    campaign: campaign || EXPERIENCES_CAMPAIGN,
  });
  return `https://www.viator.com/searchResults/all?${params.toString()}`;
}
