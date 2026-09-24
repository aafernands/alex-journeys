/**
 * Plan a Trip — types, defaults, and pure helpers.
 * Safe to import from client components (no filesystem).
 */

import { experiencesPath } from "@/lib/experiences";
import { flightsPath, prefilledAirport } from "@/lib/flights";
import { staysPath } from "@/lib/stays";

export const PLAN_A_TRIP_SLUG = "plan-a-trip";

export const TRIP_CATEGORIES = ["flights", "hotel", "car"] as const;
export type TripCategory = (typeof TRIP_CATEGORIES)[number];

export const PARTNER_SHOW_WHEN = ["flights", "hotel", "car", "extra"] as const;
export type PartnerShowWhen = (typeof PARTNER_SHOW_WHEN)[number];

export type DateMode = "exact" | "flexible";
export type TripType = "roundtrip" | "oneway";

export type PlannerState = {
  categories: TripCategory[];
  unsure: boolean;
  destination: string;
  dateMode: DateMode;
  startDate: string;
  endDate: string;
  month: string;
  nights: number;
  adults: number;
  children: number;
  origin: string;
  tripType: TripType;
  rooms: number;
  carPickupSameAsDestination: boolean;
  carPickupLocation: string;
  carDatesSameAsTrip: boolean;
  carPickupDate: string;
  carDropoffDate: string;
};

export type StepCopy = {
  heading: string;
  helper: string;
};

export type TripPlannerConfig = {
  title: string;
  label: string;
  intro: string;
  guidesEyebrow: string;
  guidesHeading: string;
  disclosure: string;
  /** Step 4 note that checked items stay in this browser. */
  checklistHint: string;
  flexibleDates: boolean;
  extras: boolean;
  continueLabel: string;
  backLabel: string;
  editLabel: string;
  getStepsLabel: string;
  editDetailsLabel: string;
  startOverLabel: string;
  chips: {
    flights: string;
    hotel: string;
    car: string;
    unsure: string;
  };
  steps: {
    categories: StepCopy;
    details: StepCopy;
    review: StepCopy;
    next: StepCopy;
  };
};

export type TripPlannerPartner = {
  key: string;
  label: string;
  buttonLabel: string;
  blurb: string;
  /**
   * Absolute http(s) URL. Slots are replaced when every token has a value:
   * {destination} {startDate} {endDate} {origin} {adults} {rooms}
   */
  affiliateUrlTemplate: string;
  /** Tools affiliate URL used when the template is empty or a slot is missing. */
  affiliateUrl: string;
  showWhen: PartnerShowWhen;
  enabled: boolean;
  sortOrder: number;
  isCore: boolean;
};

export type TripUrlValues = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  origin?: string;
  adults?: string;
  rooms?: string;
};

export type FieldErrors = Partial<Record<string, string>>;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const CATEGORY_LABEL: Record<TripCategory, string> = {
  flights: "Flights",
  hotel: "Hotel",
  car: "Car",
};

export const DEFAULT_CONFIG: TripPlannerConfig = {
  title: "Plan a trip",
  label: "Guides",
  intro:
    "Start with what you need — flights, a stay, a car, or all three. I’ll hand you next steps with the tools I actually use.",
  guidesEyebrow: "From the journal",
  guidesHeading: "Notes from trips I’ve already walked",
  disclosure:
    "Some links are affiliates. If you book through them I may earn a commission at no extra cost to you.",
  checklistHint:
    "Guests keep this itinerary in this browser. Sign in to save it on your account.",
  flexibleDates: true,
  extras: true,
  continueLabel: "Continue",
  backLabel: "Back",
  editLabel: "Edit",
  getStepsLabel: "Get my next steps",
  editDetailsLabel: "Edit trip details",
  startOverLabel: "Start over",
  chips: {
    flights: "Flights",
    hotel: "Hotel or stay",
    car: "Car rental",
    unsure: "Not sure yet — help me plan",
  },
  steps: {
    categories: {
      heading: "What do you want to book?",
      helper:
        "Pick one or combine them. I’ll give you next steps with the tools I actually use.",
    },
    details: {
      heading: "Trip details",
      helper: "A few basics so the next steps match your trip.",
    },
    review: {
      heading: "Look good?",
      helper: "Quick check before I build your next steps.",
    },
    next: {
      heading: "Your itinerary",
      helper: "Based on {destination} · {dates} · {travelers}",
    },
  },
};

const EXPEDIA = "https://expedia.com/affiliates/nyc/plan_trip";
const BOOKING = "https://tidd.ly/4kgHAYw";
const RENTCARS =
  "https://rentcars.com/en/?requestorid=9563&utm_source=alexjourneys.com&utm_medium=afiliado-link&utm_campaign=rent-car";
const WORLD_NOMADS =
  "https://www.tkqlhce.com/click-101054501-15417474?sid=find_insurance&url=https%3A%2F%2Fwww.worldnomads.com%2Ftravel-insurance";
const SAILY = "https://go.saily.site/aff_c?offer_id=101&aff_id=9600";
const VIATOR =
  "https://www.viator.com/?pid=P00143772&mcid=42383&medium=link&campaign=book-experience";

/** Booking.com search deep link on the AWIN ids already used in journal posts. */
const BOOKING_TEMPLATE =
  "https://www.awin1.com/cread.php?awinmid=6776&awinaffid=1762577&clickref=plan-a-trip&ued=https%3A%2F%2Fwww.booking.com%2Fsearchresults.html%3Fss%3D{destination}%26checkin%3D{startDate}%26checkout%3D{endDate}%26group_adults%3D{adults}%26no_rooms%3D{rooms}";

const VIATOR_TEMPLATE =
  "https://www.viator.com/searchResults/all?text={destination}&pid=P00143772&mcid=42383&medium=link&campaign=book-experience";

export const DEFAULT_PARTNERS: TripPlannerPartner[] = [
  {
    key: "expedia",
    label: "Flights",
    buttonLabel: "Search flights",
    blurb: "Search and book the route here.",
    affiliateUrlTemplate: EXPEDIA,
    affiliateUrl: EXPEDIA,
    showWhen: "flights",
    enabled: true,
    sortOrder: 1,
    isCore: true,
  },
  {
    key: "booking",
    label: "Find a place to stay",
    buttonLabel: "Search stays",
    blurb: "Search hotels here and book the stay on this site.",
    affiliateUrlTemplate: BOOKING_TEMPLATE,
    affiliateUrl: BOOKING,
    showWhen: "hotel",
    enabled: true,
    sortOrder: 2,
    isCore: true,
  },
  {
    key: "rentcars",
    label: "Sort out a rental car",
    buttonLabel: "Search cars",
    blurb: "Road-trip wheels without sticker shock.",
    affiliateUrlTemplate: RENTCARS,
    affiliateUrl: RENTCARS,
    showWhen: "car",
    enabled: true,
    sortOrder: 3,
    isCore: true,
  },
  {
    key: "world-nomads",
    label: "Cover the trip",
    buttonLabel: "Look at insurance",
    blurb: "Coverage I look at before longer trips.",
    affiliateUrlTemplate: WORLD_NOMADS,
    affiliateUrl: WORLD_NOMADS,
    showWhen: "extra",
    enabled: true,
    sortOrder: 4,
    isCore: false,
  },
  {
    key: "saily",
    label: "Stay online",
    buttonLabel: "Get an eSIM",
    blurb: "eSIM data when I need a local connection.",
    affiliateUrlTemplate: SAILY,
    affiliateUrl: SAILY,
    showWhen: "extra",
    enabled: true,
    sortOrder: 5,
    isCore: false,
  },
  {
    key: "viator",
    label: "Book something to do",
    buttonLabel: "Browse experiences",
    blurb: "Day tours and activities from past trips.",
    affiliateUrlTemplate: VIATOR_TEMPLATE,
    affiliateUrl: VIATOR,
    showWhen: "extra",
    enabled: true,
    sortOrder: 6,
    isCore: false,
  },
];

export function initialPlannerState(): PlannerState {
  return {
    categories: [],
    unsure: false,
    destination: "",
    dateMode: "exact",
    startDate: "",
    endDate: "",
    month: "",
    nights: 5,
    adults: 2,
    children: 0,
    origin: "",
    tripType: "roundtrip",
    rooms: 1,
    carPickupSameAsDestination: true,
    carPickupLocation: "",
    carDatesSameAsTrip: true,
    carPickupDate: "",
    carDropoffDate: "",
  };
}

export function effectiveCategories(state: PlannerState): TripCategory[] {
  if (state.unsure) return [...TRIP_CATEGORIES];
  return TRIP_CATEGORIES.filter((cat) => state.categories.includes(cat));
}

export function parseIsoDate(
  iso: string,
): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function formatMonthYear(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return "";
  return `${MONTHS[parsed.m - 1]} ${parsed.y}`;
}

export function formatDateRange(start: string, end: string): string {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (!a || !b) return [start, end].filter(Boolean).join("–");
  if (a.y === b.y && a.m === b.m) {
    return `${MONTHS[a.m - 1]} ${a.d}–${b.d}, ${a.y}`;
  }
  if (a.y === b.y) {
    return `${MONTHS[a.m - 1]} ${a.d}–${MONTHS[b.m - 1]} ${b.d}, ${a.y}`;
  }
  return `${MONTHS[a.m - 1]} ${a.d}, ${a.y}–${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
}

export function formatFlexible(month: string, nights: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) return month.trim();
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return month.trim();
  const count = Number.isFinite(nights) ? Math.max(0, Math.trunc(nights)) : 0;
  const nightLabel = count === 1 ? "night" : "nights";
  return `${MONTHS[monthIndex]} ${match[1]} · ${count} ${nightLabel}`;
}

/** First of the month through that day plus nights, in UTC so slots stay stable. */
export function flexibleRange(
  month: string,
  nights: number,
): { startDate: string; endDate: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (m < 1 || m > 12) return null;
  const nightCount = Number.isFinite(nights) ? Math.max(1, Math.trunc(nights)) : 1;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m - 1, 1 + nightCount));
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

export function usesFlexibleDates(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): boolean {
  return flexibleDatesEnabled && state.dateMode === "flexible";
}

export function dateSummary(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): string {
  if (usesFlexibleDates(state, flexibleDatesEnabled)) {
    return formatFlexible(state.month, state.nights);
  }
  if (state.startDate && state.endDate) {
    return formatDateRange(state.startDate, state.endDate);
  }
  return state.startDate || state.endDate || "";
}

export function resolvedTripDates(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): { startDate: string; endDate: string } | null {
  if (usesFlexibleDates(state, flexibleDatesEnabled)) {
    return flexibleRange(state.month, state.nights);
  }
  if (
    state.startDate &&
    state.endDate &&
    state.endDate >= state.startDate &&
    parseIsoDate(state.startDate) &&
    parseIsoDate(state.endDate)
  ) {
    return { startDate: state.startDate, endDate: state.endDate };
  }
  return null;
}

export function travelerSummary(state: PlannerState): string {
  const adults = Math.max(0, Math.trunc(state.adults));
  const children = Math.max(0, Math.trunc(state.children));
  const parts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];
  if (children > 0) {
    parts.push(`${children} ${children === 1 ? "child" : "children"}`);
  }
  return parts.join(" · ");
}

/**
 * Stable key for one plan on this browser. Category order is fixed so
 * “not sure” and picking all three share the same checklist.
 */
export function planFingerprint(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): string {
  const cats = effectiveCategories(state);
  const parts = [
    state.destination.trim().toLowerCase(),
    dateSummary(state, flexibleDatesEnabled),
    cats.join("+"),
    String(Math.max(0, Math.trunc(Number(state.adults)) || 0)),
    String(Math.max(0, Math.trunc(Number(state.children)) || 0)),
  ];
  if (cats.includes("flights")) {
    parts.push(state.origin.trim().toLowerCase(), state.tripType);
  }
  if (cats.includes("hotel")) {
    parts.push(`rooms:${Math.max(0, Math.trunc(Number(state.rooms)) || 0)}`);
  }
  if (cats.includes("car")) {
    parts.push(
      state.carPickupSameAsDestination
        ? "pickup:destination"
        : `pickup:${state.carPickupLocation.trim().toLowerCase()}`,
      state.carDatesSameAsTrip
        ? "cardates:trip"
        : `cardates:${state.carPickupDate}/${state.carDropoffDate}`,
    );
  }
  return parts.join("|");
}

export function bookingSummary(state: PlannerState): string {
  return effectiveCategories(state)
    .map((cat) => CATEGORY_LABEL[cat])
    .join(" · ");
}

export function reviewRows(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): { label: string; value: string }[] {
  const cats = effectiveCategories(state);
  const rows: { label: string; value: string }[] = [
    { label: "Booking", value: bookingSummary(state) },
    { label: "Destination", value: state.destination.trim() },
    { label: "Dates", value: dateSummary(state, flexibleDatesEnabled) },
    { label: "Travelers", value: travelerSummary(state) },
  ];
  if (cats.includes("flights")) {
    const trip =
      state.tripType === "oneway" ? "One-way" : "Round-trip";
    rows.push({ label: "From", value: `${state.origin.trim()} · ${trip}` });
  }
  if (cats.includes("hotel")) {
    rows.push({ label: "Rooms", value: String(Math.trunc(state.rooms)) });
  }
  if (cats.includes("car")) {
    rows.push({
      label: "Car pickup",
      value: state.carPickupSameAsDestination
        ? "Same as destination"
        : state.carPickupLocation.trim(),
    });
    rows.push({
      label: "Car dates",
      value: state.carDatesSameAsTrip
        ? "Same as trip"
        : formatDateRange(state.carPickupDate, state.carDropoffDate),
    });
  }
  return rows;
}

export function nextStepsSubhead(
  template: string,
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): string {
  return template
    .replaceAll("{destination}", state.destination.trim())
    .replaceAll("{dates}", dateSummary(state, flexibleDatesEnabled))
    .replaceAll("{travelers}", travelerSummary(state));
}

export function validateCategories(state: PlannerState): string | null {
  if (effectiveCategories(state).length === 0) {
    return "Pick at least one.";
  }
  return null;
}

export function validateDetails(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!state.destination.trim()) errors.destination = "Add a destination.";

  if (usesFlexibleDates(state, flexibleDatesEnabled)) {
    if (!/^\d{4}-\d{2}$/.test(state.month.trim())) {
      errors.month = "Choose a month.";
    }
    if (!Number.isFinite(state.nights) || state.nights < 1) {
      errors.nights = "Add at least one night.";
    }
  } else {
    if (!state.startDate) errors.startDate = "Add a start date.";
    if (!state.endDate) errors.endDate = "Add an end date.";
    if (
      state.startDate &&
      state.endDate &&
      state.endDate < state.startDate
    ) {
      errors.endDate = "End date can’t be before the start.";
    }
  }

  if (!Number.isFinite(state.adults) || state.adults < 1) {
    errors.adults = "At least one adult.";
  }
  if (!Number.isFinite(state.children) || state.children < 0) {
    errors.children = "Children can’t be negative.";
  }

  const cats = effectiveCategories(state);
  if (cats.includes("flights") && !state.origin.trim()) {
    errors.origin = "Add where you’re flying from.";
  }
  if (cats.includes("hotel")) {
    if (!Number.isFinite(state.rooms) || state.rooms < 1) {
      errors.rooms = "At least one room.";
    }
  }
  if (cats.includes("car")) {
    if (
      !state.carPickupSameAsDestination &&
      !state.carPickupLocation.trim()
    ) {
      errors.carPickupLocation = "Add a pickup location.";
    }
    if (!state.carDatesSameAsTrip) {
      if (!state.carPickupDate) errors.carPickupDate = "Add a pickup date.";
      if (!state.carDropoffDate) errors.carDropoffDate = "Add a drop-off date.";
      if (
        state.carPickupDate &&
        state.carDropoffDate &&
        state.carDropoffDate < state.carPickupDate
      ) {
        errors.carDropoffDate = "Drop-off can’t be before pickup.";
      }
    }
  }
  return errors;
}

export function tripUrlValues(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): TripUrlValues {
  const dates = resolvedTripDates(state, flexibleDatesEnabled);
  return {
    destination: state.destination.trim(),
    startDate: dates?.startDate,
    endDate: dates?.endDate,
    origin: state.origin.trim(),
    adults: String(Math.max(0, Math.trunc(state.adults))),
    rooms: String(Math.max(0, Math.trunc(state.rooms))),
  };
}

export function partnerUrlValues(
  partner: TripPlannerPartner,
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): TripUrlValues {
  const values = tripUrlValues(state, flexibleDatesEnabled);
  if (partner.showWhen === "car") {
    if (!state.carPickupSameAsDestination && state.carPickupLocation.trim()) {
      values.destination = state.carPickupLocation.trim();
    }
    if (!state.carDatesSameAsTrip && state.carPickupDate && state.carDropoffDate) {
      values.startDate = state.carPickupDate;
      values.endDate = state.carDropoffDate;
    }
  }
  return values;
}

/**
 * Replace `{slot}` tokens. Returns null when any token has no value so the
 * caller can open the plain Tools affiliate URL instead.
 */
export function fillAffiliateUrl(
  template: string,
  values: TripUrlValues,
): string | null {
  const raw = template.trim();
  if (!raw) return null;
  const tokens = raw.match(/\{[a-zA-Z]+\}/g);
  if (!tokens) return raw;
  let url = raw;
  for (const token of tokens) {
    const key = token.slice(1, -1) as keyof TripUrlValues;
    const value = values[key]?.trim();
    if (!value) return null;
    url = url.split(token).join(encodeURIComponent(value));
  }
  return url;
}

export function resolveAffiliateHref(
  partner: TripPlannerPartner,
  values: TripUrlValues,
): string {
  const filled = fillAffiliateUrl(partner.affiliateUrlTemplate, values);
  const candidate = (filled ?? partner.affiliateUrl).trim();
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return partner.affiliateUrl.trim();
}

/** Flight lane opens in-app search with the active trip. */
export function flightLaneHref(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
  tripId?: string | null,
): string {
  const values = tripUrlValues(state, flexibleDatesEnabled);
  return flightsPath({
    origin: prefilledAirport(values.origin ?? ""),
    destination: prefilledAirport(values.destination ?? ""),
    startDate: values.startDate,
    endDate: state.tripType === "oneway" ? "" : values.endDate,
    tripType: state.tripType,
    adults: state.adults,
    children: state.children,
    tripId,
  });
}

export function isFlightLanePartner(
  partner: Pick<TripPlannerPartner, "showWhen">,
): boolean {
  return partner.showWhen === "flights";
}

/** Hotel lane opens in-app stays with the active trip. */
export function hotelLaneHref(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
  tripId?: string | null,
): string {
  const values = tripUrlValues(state, flexibleDatesEnabled);
  return staysPath({
    destination: values.destination,
    startDate: values.startDate,
    endDate: values.endDate,
    adults: state.adults,
    children: state.children,
    rooms: state.rooms,
    tripId,
  });
}

/**
 * Lane CTA for partners that leave the site. Viator opens /experiences.
 * The hotel lane uses `hotelLaneHref` and the flight lane uses `flightLaneHref`.
 * Cars and the other partners keep their affiliate URLs.
 */
export function partnerLaneHref(
  partner: TripPlannerPartner,
  state: PlannerState,
  flexibleDatesEnabled: boolean,
  tripId?: string | null,
): string {
  if (isFlightLanePartner(partner)) {
    return flightLaneHref(state, flexibleDatesEnabled, tripId);
  }
  if (partner.key === "viator") {
    const values = tripUrlValues(state, flexibleDatesEnabled);
    return experiencesPath({
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      adults: state.adults,
      children: state.children,
    });
  }
  return resolveAffiliateHref(
    partner,
    partnerUrlValues(partner, state, flexibleDatesEnabled),
  );
}

export function visiblePartners(
  partners: TripPlannerPartner[],
  state: PlannerState,
  extrasOn: boolean,
): TripPlannerPartner[] {
  const cats = new Set(effectiveCategories(state));
  return partners
    .filter((partner) => partner.enabled)
    .filter((partner) => {
      if (partner.showWhen === "extra") return extrasOn;
      return cats.has(partner.showWhen);
    })
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stepCopy(value: unknown, fallback: StepCopy): StepCopy {
  const record = asRecord(value);
  return {
    heading: str(record.heading, fallback.heading),
    helper: str(record.helper, fallback.helper),
  };
}

export function normalizeConfig(raw: unknown): TripPlannerConfig {
  const record = asRecord(raw);
  const chips = asRecord(record.chips);
  const steps = asRecord(record.steps);
  const base = DEFAULT_CONFIG;
  return {
    title: str(record.title, base.title),
    label: str(record.label, base.label),
    intro: str(record.intro, base.intro),
    guidesEyebrow: str(record.guidesEyebrow, base.guidesEyebrow),
    guidesHeading: str(record.guidesHeading, base.guidesHeading),
    disclosure: str(record.disclosure, base.disclosure),
    checklistHint: str(record.checklistHint, base.checklistHint),
    flexibleDates: bool(record.flexibleDates, base.flexibleDates),
    extras: bool(record.extras, base.extras),
    continueLabel: str(record.continueLabel, base.continueLabel),
    backLabel: str(record.backLabel, base.backLabel),
    editLabel: str(record.editLabel, base.editLabel),
    getStepsLabel: str(record.getStepsLabel, base.getStepsLabel),
    editDetailsLabel: str(record.editDetailsLabel, base.editDetailsLabel),
    startOverLabel: str(record.startOverLabel, base.startOverLabel),
    chips: {
      flights: str(chips.flights, base.chips.flights),
      hotel: str(chips.hotel, base.chips.hotel),
      car: str(chips.car, base.chips.car),
      unsure: str(chips.unsure, base.chips.unsure),
    },
    steps: {
      categories: stepCopy(steps.categories, base.steps.categories),
      details: stepCopy(steps.details, base.steps.details),
      review: stepCopy(steps.review, base.steps.review),
      next: stepCopy(steps.next, base.steps.next),
    },
  };
}

function isShowWhen(value: unknown): value is PartnerShowWhen {
  return (
    typeof value === "string" &&
    (PARTNER_SHOW_WHEN as readonly string[]).includes(value)
  );
}

export function normalizePartner(raw: unknown): TripPlannerPartner | null {
  const record = asRecord(raw);
  const key = typeof record.key === "string" ? record.key.trim() : "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) return null;
  if (!isShowWhen(record.showWhen)) return null;
  const affiliateUrl =
    typeof record.affiliateUrl === "string" ? record.affiliateUrl.trim() : "";
  const affiliateUrlTemplate =
    typeof record.affiliateUrlTemplate === "string"
      ? record.affiliateUrlTemplate.trim()
      : "";
  if (!affiliateUrl && !affiliateUrlTemplate) return null;
  const sortOrder = Number(record.sortOrder);
  return {
    key,
    label: str(record.label, key),
    buttonLabel: str(record.buttonLabel, "Open"),
    blurb: typeof record.blurb === "string" ? record.blurb.trim() : "",
    affiliateUrlTemplate: affiliateUrlTemplate || affiliateUrl,
    affiliateUrl: affiliateUrl || affiliateUrlTemplate,
    showWhen: record.showWhen,
    enabled: record.enabled !== false,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isCore: record.isCore === true,
  };
}

export function normalizePartners(raw: unknown): TripPlannerPartner[] | null {
  const list = Array.isArray(raw) ? raw : asRecord(raw).partners;
  if (!Array.isArray(list)) return null;
  const partners: TripPlannerPartner[] = [];
  for (const item of list) {
    const partner = normalizePartner(item);
    if (partner) partners.push(partner);
  }
  return partners;
}
