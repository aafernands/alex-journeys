/**
 * Saved-trip shape shared by the itinerary hub, local drafts, and APIs.
 * Safe to import from client components (no Firestore, no filesystem).
 */
import { cleanItemColor, type TripItemColor } from "@/lib/trip-item-color";
import {
  dateSummary,
  formatFlexible,
  formatMonthYear,
  initialPlannerState,
  parseIsoDate,
  PLAN_A_TRIP_SLUG,
  resolvedTripDates,
  TRIP_CATEGORIES,
  usesFlexibleDates,
  type DateMode,
  type PlannerState,
  type TripCategory,
  type TripPlannerPartner,
  type TripType,
} from "@/lib/trip-planner-model";

export const TRIP_ITEM_TYPES = [
  "flight",
  "hotel",
  "car",
  "activity",
  "note",
  "other",
] as const;
export type TripItemType = (typeof TRIP_ITEM_TYPES)[number];

export const TRIP_ITEM_STATUSES = ["todo", "booked", "skipped"] as const;
export type TripItemStatus = (typeof TRIP_ITEM_STATUSES)[number];

export const TRIP_STATUS_LABEL: Record<TripItemStatus, string> = {
  todo: "To book",
  booked: "Booked",
  skipped: "Skip",
};

const TYPE_TITLE: Record<TripItemType, string> = {
  flight: "Flight",
  hotel: "Stay",
  car: "Rental car",
  activity: "Experience",
  note: "Note",
  other: "Booking",
};

export type TripItem = {
  id: string;
  type: TripItemType;
  title: string;
  url: string;
  notes: string;
  status: TripItemStatus;
  sortOrder: number;
  updatedAt: string;
  /** Partner lane this item was added from, when it has one. */
  laneKey?: string;
  /** Optional booking confirmation code the reader typed or pasted. */
  confirmation?: string;
  /** 1-based day on this trip. Missing means unscheduled. */
  dayIndex?: number;
  /** Optional local time, `HH:MM`. */
  time?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  pickupTime?: string;
  dropoffTime?: string;
  departureDate?: string;
  returnDate?: string;
  departureTime?: string;
  returnTime?: string;
  checkinDate?: string;
  checkoutDate?: string;
  checkinTime?: string;
  checkoutTime?: string;
  /** Optional accent chosen by the reader. Missing uses the color for this kind of plan. */
  color?: TripItemColor;
};

export type TripDay = {
  index: number;
  date: string;
  label: string;
  detail: string;
};

/** One calendar week, Sunday through Saturday. Null cells sit outside the trip. */
export type TripWeek = {
  /** Sunday that opens the week, `YYYY-MM-DD`. */
  startDate: string;
  cells: Array<TripDay | null>;
};

export const TRIP_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;
const FULL_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;
const MAX_TRIP_DAYS = 45;

export type TripWrite = {
  title: string;
  destination: string;
  dateMode: DateMode;
  startDate: string;
  endDate: string;
  month: string;
  nights: number;
  adults: number;
  children: number;
  categories: TripCategory[];
  origin: string;
  tripType: TripType;
  rooms: number;
  carPickupSameAsDestination: boolean;
  carPickupLocation: string;
  carDatesSameAsTrip: boolean;
  carPickupDate: string;
  carDropoffDate: string;
  unsure: boolean;
  items: TripItem[];
  /** Freeform packing list for this trip. */
  packingNotes: string;
};

export type TripRecord = TripWrite & {
  id: string;
  /** Item ids currently marked booked. Derived on write. */
  checklist: string[];
  createdAt: string;
  updatedAt: string;
};

export type StoredTripPlan = {
  step: 1 | 2 | 3 | 4;
  state: PlannerState;
  items: TripItem[];
  tripId: string | null;
  packingNotes: string;
  /** Set when the reader named the trip. Empty uses the suggested title. */
  title?: string;
  titleCustom?: boolean;
};

/** Shown when Firestore env is missing or the trips API returns 503. */
export const TRIPS_ACCOUNT_UNAVAILABLE =
  "We can’t save trips to your account right now. This itinerary stays in this browser.";

export const TRIPS_LIST_UNAVAILABLE =
  "We can’t load your saved trips right now. Try again in a little while.";

export const MAX_SAVED_TRIPS = 50;

export function cleanPackingNotes(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").slice(0, 4000);
}

const MAX_ITEMS = 40;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(token: string): Uint8Array {
  const padded = token.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Guest share link. The hash carries the draft; no account is required. */
export function encodeSharedPlan(plan: {
  state: PlannerState;
  items: TripItem[];
  packingNotes?: string;
}): string {
  const json = JSON.stringify(tripWriteFromPlan(plan, true));
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeSharedPlan(token: string): StoredTripPlan | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(token.trim()));
    const parsed = parseTripWrite(JSON.parse(json) as unknown);
    if (!parsed.ok) return null;
    const state = plannerStateFromTrip(parsed.data);
    const suggested = suggestTripTitle(state, true);
    const custom = parsed.data.title.trim() !== suggested;
    return {
      step: 4,
      state,
      items: parsed.data.items,
      tripId: null,
      packingNotes: parsed.data.packingNotes,
      title: custom ? parsed.data.title : "",
      titleCustom: custom,
    };
  } catch {
    return null;
  }
}

export function sharePlanHref(plan: {
  state: PlannerState;
  items: TripItem[];
  packingNotes?: string;
}): string {
  return `${planATripHref()}#itinerary=${encodeSharedPlan(plan)}`;
}

export function planATripHref(tripId?: string | null): string {
  const path = `/guides/${PLAN_A_TRIP_SLUG}`;
  if (!tripId) return path;
  return `${path}?trip=${encodeURIComponent(tripId)}`;
}

export function planATripLoginHref(
  tripId?: string | null,
  intent: "signin" | "signup" = "signin",
): string {
  const params = new URLSearchParams();
  params.set("callbackUrl", planATripHref(tripId));
  if (intent === "signup") params.set("mode", "signup");
  return `/login?${params.toString()}`;
}

/**
 * Signed-out readers who open `?trip=` need to sign in, unless this browser
 * already has that itinerary open (they signed out while editing).
 */
export function shouldPromptTripSignIn(input: {
  urlTripId: string | null;
  signedIn: boolean;
  authLoading: boolean;
  planTripId: string | null;
}): boolean {
  if (!input.urlTripId || input.signedIn || input.authLoading) return false;
  return input.planTripId !== input.urlTripId;
}

/**
 * What to do with a step-4 draft once we know whether this browser started it
 * while signed out. Signed-in readers who never had a guest draft auto-save.
 */
export function accountSaveIntent(input: {
  authenticated: boolean;
  tripId: string | null;
  step: number;
  hasDestination: boolean;
  guestOrigin: boolean;
  dismissed: boolean;
}): "local" | "offer" | "declined" | "autosave" | "idle" {
  if (!input.authenticated) return "local";
  if (input.step !== 4 || !input.hasDestination) return "idle";
  if (!input.tripId && input.guestOrigin && input.dismissed) return "declined";
  if (!input.tripId && input.guestOrigin) return "offer";
  return "autosave";
}

export function tripCapacityMessage(count: number): string | null {
  if (!Number.isFinite(count) || count < MAX_SAVED_TRIPS) return null;
  return `You can save up to ${MAX_SAVED_TRIPS} trips. Remove one from My trips to save another.`;
}

export function parseTripTitle(
  raw: unknown,
): { ok: true; title: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Add a trip name." };
  const title = raw.trim().slice(0, 160);
  if (!title) return { ok: false, error: "Add a trip name." };
  return { ok: true, title };
}

/** `{ title }` alone renames a trip. Any other body is a full itinerary write. */
export function parseTitleOnlyPatch(
  raw: unknown,
): { ok: true; title: string } | { ok: false; error: string } | null {
  const record = asRecord(raw);
  if (!record) return null;
  const keys = Object.keys(record);
  if (!(keys.length === 1 && keys[0] === "title")) return null;
  return parseTripTitle(record.title);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Same-site path a trip item can store, such as `/stays/…`. */
export function isSafeSitePath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return false;
  }
  if (/[\u0000-\u001f\u007f\s\\]/.test(value)) return false;
  const path = value.split("?")[0]?.split("#")[0] ?? value;
  return !path.includes(":");
}

/** External http(s) link, or a same-site path. */
export function isTripItemUrl(value: string): boolean {
  return isSafeHttpUrl(value) || isSafeSitePath(value);
}

export function createTripItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultItemTitle(type: TripItemType): string {
  return TYPE_TITLE[type];
}

export function itemTypeForPartner(
  partner: Pick<TripPlannerPartner, "showWhen" | "key">,
): TripItemType {
  if (partner.showWhen === "flights") return "flight";
  if (partner.showWhen === "hotel") return "hotel";
  if (partner.showWhen === "car") return "car";
  if (partner.key === "viator") return "activity";
  return "other";
}

export function suggestTripTitle(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): string {
  const place = state.destination.split(",")[0]?.trim() || "Trip";
  if (usesFlexibleDates(state, flexibleDatesEnabled)) {
    const label = formatFlexible(state.month, state.nights);
    const monthPart = label.split(" · ")[0]?.trim();
    if (monthPart) return `${place} · ${monthPart}`;
  }
  const monthYear = formatMonthYear(state.startDate);
  if (monthYear) return `${place} · ${monthYear}`;
  const dates = dateSummary(state, flexibleDatesEnabled);
  return dates ? `${place} · ${dates}` : place;
}

export function cleanConfirmation(value: string): string {
  return value.trim().slice(0, 40).replace(/[^A-Za-z0-9-]/g, "");
}

export function cleanTime(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return "";
  return `${match[1]}:${match[2]}`;
}

export function cleanItemDate(value: string): string {
  const trimmed = value.trim();
  const parsed = parseIsoDate(trimmed);
  if (!parsed) return "";
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return date.toISOString().slice(0, 10) === trimmed ? trimmed : "";
}

export function cleanDayIndex(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 90) return null;
  return n;
}

/** Calendar days from the trip start through the end, inclusive. */
export function tripDays(
  state: PlannerState,
  flexibleDatesEnabled: boolean,
): TripDay[] {
  const range = resolvedTripDates(state, flexibleDatesEnabled);
  if (!range) return [];
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);
  if (!start || !end) return [];
  const startUtc = Date.UTC(start.y, start.m - 1, start.d);
  const endUtc = Date.UTC(end.y, end.m - 1, end.d);
  if (endUtc < startUtc) return [];
  const days: TripDay[] = [];
  for (let t = startUtc, index = 1; t <= endUtc && index <= MAX_TRIP_DAYS; t += 86_400_000, index += 1) {
    const iso = new Date(t).toISOString().slice(0, 10);
    days.push({
      index,
      date: iso,
      label: `Day ${index}`,
      detail: formatTripDayDetail(iso),
    });
  }
  return days;
}

export function formatTripDayDetail(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return "";
  const utc = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return `${TRIP_WEEKDAYS[utc.getUTCDay()]}, ${DAY_MONTHS[parsed.m - 1]} ${parsed.d}`;
}

function utcWeekday(isoDate: string): number | null {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).getUTCDay();
}

/**
 * Groups trip days into Sunday-start calendar weeks covering start through end.
 * Leading and trailing cells are null when the trip starts or ends mid-week.
 */
export function tripWeeks(days: TripDay[]): TripWeek[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const bySunday = new Map<string, Array<TripDay | null>>();
  const order: string[] = [];
  for (const day of sorted) {
    const parsed = parseIsoDate(day.date);
    const weekday = utcWeekday(day.date);
    if (!parsed || weekday == null) continue;
    const sunday = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d - weekday));
    const startDate = sunday.toISOString().slice(0, 10);
    let cells = bySunday.get(startDate);
    if (!cells) {
      cells = [null, null, null, null, null, null, null];
      bySunday.set(startDate, cells);
      order.push(startDate);
    }
    cells[weekday] = day;
  }
  return order.map((startDate) => ({
    startDate,
    cells: bySunday.get(startDate) ?? [null, null, null, null, null, null, null],
  }));
}

/** Short range for a week row, such as `Apr 11 – 17` or `Apr 26 – May 2`. */
export function formatTripWeekRange(startDate: string): string {
  const parsed = parseIsoDate(startDate);
  if (!parsed) return "";
  const end = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d + 6));
  const endParsed = parseIsoDate(end.toISOString().slice(0, 10));
  if (!endParsed) return "";
  const startLabel = `${DAY_MONTHS[parsed.m - 1]} ${parsed.d}`;
  const endLabel =
    parsed.m === endParsed.m && parsed.y === endParsed.y
      ? String(endParsed.d)
      : `${DAY_MONTHS[endParsed.m - 1]} ${endParsed.d}`;
  return `${startLabel} – ${endLabel}`;
}

/**
 * Clock time shown for an item, `HH:MM`.
 * Cars use pickup, flights use departure, stays use check-in.
 * Untimed items return an empty string.
 */
export function itemScheduleTime(item: {
  type?: TripItemType;
  time?: string;
  pickupTime?: string;
  departureTime?: string;
  checkinTime?: string;
}): string {
  if (item.type === "car") return item.pickupTime ?? "";
  if (item.type === "flight") return item.departureTime ?? item.time ?? "";
  if (item.type === "hotel") return item.checkinTime ?? item.time ?? "";
  return item.time ?? "";
}

/** Timed items first (by the time shown), then earlier sort order. Untimed items follow. */
export function compareScheduledItems(a: TripItem, b: TripItem): number {
  const ta = itemScheduleTime(a);
  const tb = itemScheduleTime(b);
  if (ta && tb && ta !== tb) return ta.localeCompare(tb);
  if (ta && !tb) return -1;
  if (!ta && tb) return 1;
  return a.sortOrder - b.sortOrder || a.updatedAt.localeCompare(b.updatedAt);
}

export function scheduledDayIndex(
  item: TripItem,
  daysOrCount: TripDay[] | number,
): number | null {
  const dayCount = Array.isArray(daysOrCount) ? daysOrCount.length : daysOrCount;
  const days = Array.isArray(daysOrCount) ? daysOrCount : null;
  const date =
    item.type === "car"
      ? item.pickupDate
      : item.type === "flight"
        ? item.departureDate
        : item.type === "hotel"
          ? item.checkinDate
          : undefined;
  if (days && date) {
    const matched = days.find((day) => day.date === date)?.index;
    if (matched) return matched;
  }
  if (item.dayIndex == null || dayCount < 1) return null;
  if (item.dayIndex < 1 || item.dayIndex > dayCount) return null;
  return item.dayIndex;
}

/** Clock time from pasted text, as `HH:MM`. Does not fetch a booking page. */
export function extractPastedTime(text: string): string {
  const match = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (minutes > 59 || hours > 23) return "";
  if (meridiem) {
    if (hours < 1 || hours > 12) return "";
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  }
  return cleanTime(
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  );
}

/** Trip day named in pasted text, by ISO date or a month-and-day phrase. */
export function mentionedTripDay(days: TripDay[], text: string): number | null {
  const folded = text.toLowerCase();
  for (const day of days) {
    if (folded.includes(day.date)) return day.index;
    const parsed = parseIsoDate(day.date);
    if (!parsed) continue;
    const shortName = DAY_MONTHS[parsed.m - 1].toLowerCase();
    const fullName = FULL_MONTHS[parsed.m - 1];
    const dayNumber = String(parsed.d);
    const named = [
      new RegExp(`\\b${fullName}\\.?\\s+${dayNumber}\\b`, "i"),
      new RegExp(`\\b${shortName}\\.?\\s+${dayNumber}\\b`, "i"),
      new RegExp(`\\b${dayNumber}\\s+${fullName}\\b`, "i"),
      new RegExp(`\\b${dayNumber}\\s+${shortName}\\.?\\b`, "i"),
    ];
    if (named.some((pattern) => pattern.test(text))) return day.index;
  }
  return null;
}

/**
 * Best-effort read of a pasted confirmation blurb.
 * Pulls the first http(s) link, a confirmation-looking token, and a clock time.
 * Does not fetch or scrape a booking site.
 */
export function extractBookingPaste(text: string): {
  url: string;
  confirmation: string;
  time: string;
} {
  const raw = text.trim();
  let url = "";
  const urlMatch = raw.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (urlMatch) {
    const candidate = urlMatch[0].replace(/[.,;:!?)]+$/, "");
    if (isSafeHttpUrl(candidate)) url = candidate.slice(0, 2000);
  }
  const confMatch = raw.match(
    /(?:\bconfirmation\b|\bconf\b\.?|\bbooking\s*(?:ref(?:erence)?|code|number|id)\b|\brecord\s*locator\b|\bpnr\b|\breservation\s*(?:code|number)?\b)\s*(?:number|code|no\.?|#|:)?\s*(?:is|:|#|-)?\s*([A-Za-z0-9][A-Za-z0-9-]{4,19})/i,
  );
  return {
    url,
    confirmation: confMatch ? cleanConfirmation(confMatch[1]) : "",
    time: extractPastedTime(raw),
  };
}

export function createTripItem(input: {
  type: TripItemType;
  title?: string;
  url?: string;
  notes?: string;
  confirmation?: string;
  dayIndex?: number | null;
  time?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  pickupTime?: string;
  dropoffTime?: string;
  departureDate?: string;
  returnDate?: string;
  departureTime?: string;
  returnTime?: string;
  checkinDate?: string;
  checkoutDate?: string;
  checkinTime?: string;
  checkoutTime?: string;
  status?: TripItemStatus;
  laneKey?: string;
  color?: TripItemColor | "";
  sortOrder: number;
}): TripItem {
  const title = input.title?.trim() || defaultItemTitle(input.type);
  const laneKey = input.laneKey?.trim();
  const confirmation = cleanConfirmation(input.confirmation ?? "");
  const time = cleanTime(input.time ?? "");
  const pickupLocation = input.pickupLocation?.trim().slice(0, 160) ?? "";
  const dropoffLocation = input.dropoffLocation?.trim().slice(0, 160) ?? "";
  const pickupDate = cleanItemDate(input.pickupDate ?? "");
  const dropoffDate = cleanItemDate(input.dropoffDate ?? "");
  const pickupTime = cleanTime(input.pickupTime ?? "");
  const dropoffTime = cleanTime(input.dropoffTime ?? "");
  const departureDate = cleanItemDate(input.departureDate ?? "");
  const returnDate = cleanItemDate(input.returnDate ?? "");
  const departureTime = cleanTime(input.departureTime ?? "");
  const returnTime = cleanTime(input.returnTime ?? "");
  const checkinDate = cleanItemDate(input.checkinDate ?? "");
  const checkoutDate = cleanItemDate(input.checkoutDate ?? "");
  const checkinTime = cleanTime(input.checkinTime ?? "");
  const checkoutTime = cleanTime(input.checkoutTime ?? "");
  const dayIndex = cleanDayIndex(input.dayIndex);
  const color = cleanItemColor(input.color);
  return {
    id: createTripItemId(),
    type: input.type,
    title: title.slice(0, 160),
    url: input.url?.trim() ?? "",
    notes: input.notes?.trim().slice(0, 2000) ?? "",
    status: input.status ?? "todo",
    sortOrder: input.sortOrder,
    updatedAt: new Date().toISOString(),
    ...(laneKey ? { laneKey } : {}),
    ...(confirmation ? { confirmation } : {}),
    ...(dayIndex ? { dayIndex } : {}),
    ...(time ? { time } : {}),
    ...(pickupLocation ? { pickupLocation } : {}),
    ...(dropoffLocation ? { dropoffLocation } : {}),
    ...(pickupDate ? { pickupDate } : {}),
    ...(dropoffDate ? { dropoffDate } : {}),
    ...(pickupTime ? { pickupTime } : {}),
    ...(dropoffTime ? { dropoffTime } : {}),
    ...(departureDate ? { departureDate } : {}),
    ...(returnDate ? { returnDate } : {}),
    ...(departureTime ? { departureTime } : {}),
    ...(returnTime ? { returnTime } : {}),
    ...(checkinDate ? { checkinDate } : {}),
    ...(checkoutDate ? { checkoutDate } : {}),
    ...(checkinTime ? { checkinTime } : {}),
    ...(checkoutTime ? { checkoutTime } : {}),
    ...(color ? { color } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isItemType(value: unknown): value is TripItemType {
  return (
    typeof value === "string" &&
    (TRIP_ITEM_TYPES as readonly string[]).includes(value)
  );
}

function isItemStatus(value: unknown): value is TripItemStatus {
  return (
    typeof value === "string" &&
    (TRIP_ITEM_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeTripItem(raw: unknown, index: number): TripItem | null {
  const record = asRecord(raw);
  if (!record || !isItemType(record.type)) return null;

  let url = typeof record.url === "string" ? record.url.trim() : "";
  if (url.length > 2000) url = url.slice(0, 2000);
  if (url && !isTripItemUrl(url)) return null;

  const title =
    typeof record.title === "string" ? record.title.trim().slice(0, 160) : "";
  const notes =
    typeof record.notes === "string" ? record.notes.trim().slice(0, 2000) : "";
  const confirmation = cleanConfirmation(
    typeof record.confirmation === "string" ? record.confirmation : "",
  );
  const time = cleanTime(typeof record.time === "string" ? record.time : "");
  const pickupLocation =
    typeof record.pickupLocation === "string"
      ? record.pickupLocation.trim().slice(0, 160)
      : "";
  const dropoffLocation =
    typeof record.dropoffLocation === "string"
      ? record.dropoffLocation.trim().slice(0, 160)
      : "";
  const pickupDate =
    typeof record.pickupDate === "string" ? cleanItemDate(record.pickupDate) : "";
  const dropoffDate =
    typeof record.dropoffDate === "string"
      ? cleanItemDate(record.dropoffDate)
      : "";
  const pickupTime =
    typeof record.pickupTime === "string" ? cleanTime(record.pickupTime) : "";
  const dropoffTime =
    typeof record.dropoffTime === "string" ? cleanTime(record.dropoffTime) : "";
  const departureDate =
    typeof record.departureDate === "string" ? cleanItemDate(record.departureDate) : "";
  const returnDate =
    typeof record.returnDate === "string" ? cleanItemDate(record.returnDate) : "";
  const departureTime =
    typeof record.departureTime === "string" ? cleanTime(record.departureTime) : "";
  const returnTime =
    typeof record.returnTime === "string" ? cleanTime(record.returnTime) : "";
  const checkinDate =
    typeof record.checkinDate === "string" ? cleanItemDate(record.checkinDate) : "";
  const checkoutDate =
    typeof record.checkoutDate === "string" ? cleanItemDate(record.checkoutDate) : "";
  const checkinTime =
    typeof record.checkinTime === "string" ? cleanTime(record.checkinTime) : "";
  const checkoutTime =
    typeof record.checkoutTime === "string" ? cleanTime(record.checkoutTime) : "";
  const dayIndex = cleanDayIndex(record.dayIndex);
  if (!title && !url && !notes && !confirmation) return null;

  let id = typeof record.id === "string" ? record.id.trim() : "";
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) id = createTripItemId();

  const sortOrder = Number(record.sortOrder);
  const updatedAt =
    typeof record.updatedAt === "string" && !Number.isNaN(Date.parse(record.updatedAt))
      ? record.updatedAt
      : new Date().toISOString();

  const laneRaw = typeof record.laneKey === "string" ? record.laneKey.trim() : "";
  const laneKey = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(laneRaw)
    ? laneRaw.slice(0, 40)
    : "";
  const color = cleanItemColor(record.color);

  return {
    id,
    type: record.type,
    title: title || defaultItemTitle(record.type),
    url,
    notes,
    status: isItemStatus(record.status) ? record.status : "todo",
    sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : index,
    updatedAt,
    ...(laneKey ? { laneKey } : {}),
    ...(confirmation ? { confirmation } : {}),
    ...(dayIndex ? { dayIndex } : {}),
    ...(time ? { time } : {}),
    ...(pickupLocation ? { pickupLocation } : {}),
    ...(dropoffLocation ? { dropoffLocation } : {}),
    ...(pickupDate ? { pickupDate } : {}),
    ...(dropoffDate ? { dropoffDate } : {}),
    ...(pickupTime ? { pickupTime } : {}),
    ...(dropoffTime ? { dropoffTime } : {}),
    ...(departureDate ? { departureDate } : {}),
    ...(returnDate ? { returnDate } : {}),
    ...(departureTime ? { departureTime } : {}),
    ...(returnTime ? { returnTime } : {}),
    ...(checkinDate ? { checkinDate } : {}),
    ...(checkoutDate ? { checkoutDate } : {}),
    ...(checkinTime ? { checkinTime } : {}),
    ...(checkoutTime ? { checkoutTime } : {}),
    ...(color ? { color } : {}),
  };
}

export function normalizeTripItems(raw: unknown): TripItem[] {
  if (!Array.isArray(raw)) return [];
  const items: TripItem[] = [];
  for (const entry of raw) {
    if (items.length >= MAX_ITEMS) break;
    const item = normalizeTripItem(entry, items.length);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.sortOrder - b.sortOrder || a.updatedAt.localeCompare(b.updatedAt));
}

function clampCount(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function dateOrEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return parseIsoDate(trimmed) ? trimmed : null;
}

function monthOrEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^\d{4}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function parseTripWrite(
  raw: unknown,
): { ok: true; data: TripWrite } | { ok: false; error: string } {
  const record = asRecord(raw);
  if (!record) return { ok: false, error: "Invalid trip." };

  const destination =
    typeof record.destination === "string" ? record.destination.trim() : "";
  if (!destination) return { ok: false, error: "Add a destination." };
  if (destination.length > 160) {
    return { ok: false, error: "Destination is too long." };
  }

  const dateMode: DateMode = record.dateMode === "flexible" ? "flexible" : "exact";
  const tripType: TripType = record.tripType === "oneway" ? "oneway" : "roundtrip";
  const startDate = dateOrEmpty(record.startDate);
  const endDate = dateOrEmpty(record.endDate);
  const month = monthOrEmpty(record.month);
  const carPickupDate = dateOrEmpty(record.carPickupDate);
  const carDropoffDate = dateOrEmpty(record.carDropoffDate);
  if (
    startDate === null ||
    endDate === null ||
    month === null ||
    carPickupDate === null ||
    carDropoffDate === null
  ) {
    return { ok: false, error: "Check the trip dates." };
  }

  const categories = TRIP_CATEGORIES.filter(
    (cat) => Array.isArray(record.categories) && record.categories.includes(cat),
  );

  if (Array.isArray(record.items) && record.items.length > MAX_ITEMS) {
    return { ok: false, error: "Too many itinerary items." };
  }
  const items = normalizeTripItems(record.items);

  const stateForTitle = {
    ...initialPlannerState(),
    destination,
    dateMode,
    startDate,
    endDate,
    month,
    nights: clampCount(record.nights, 5, 0, 90),
  };
  const providedTitle =
    typeof record.title === "string" ? record.title.trim().slice(0, 160) : "";

  const origin = typeof record.origin === "string" ? record.origin.trim().slice(0, 120) : "";
  const carPickupLocation =
    typeof record.carPickupLocation === "string"
      ? record.carPickupLocation.trim().slice(0, 160)
      : "";

  return {
    ok: true,
    data: {
      title: providedTitle || suggestTripTitle(stateForTitle, true),
      destination,
      dateMode,
      startDate,
      endDate,
      month,
      nights: stateForTitle.nights,
      adults: clampCount(record.adults, 1, 0, 30),
      children: clampCount(record.children, 0, 0, 30),
      categories,
      origin,
      tripType,
      rooms: clampCount(record.rooms, 1, 0, 30),
      carPickupSameAsDestination: record.carPickupSameAsDestination !== false,
      carPickupLocation,
      carDatesSameAsTrip: record.carDatesSameAsTrip !== false,
      carPickupDate,
      carDropoffDate,
      unsure: record.unsure === true,
      items,
      packingNotes: cleanPackingNotes(record.packingNotes).trim(),
    },
  };
}

export function tripWriteFromPlan(
  plan: {
    state: PlannerState;
    items: TripItem[];
    packingNotes?: string;
    title?: string;
    titleCustom?: boolean;
  },
  flexibleDatesEnabled: boolean,
): TripWrite {
  const { state, items } = plan;
  const customTitle = plan.titleCustom ? plan.title?.trim().slice(0, 160) : "";
  return {
    title: customTitle || suggestTripTitle(state, flexibleDatesEnabled),
    destination: state.destination.trim(),
    dateMode: state.dateMode,
    startDate: state.startDate,
    endDate: state.endDate,
    month: state.month,
    nights: state.nights,
    adults: state.adults,
    children: state.children,
    categories: state.categories,
    origin: state.origin,
    tripType: state.tripType,
    rooms: state.rooms,
    carPickupSameAsDestination: state.carPickupSameAsDestination,
    carPickupLocation: state.carPickupLocation,
    carDatesSameAsTrip: state.carDatesSameAsTrip,
    carPickupDate: state.carPickupDate,
    carDropoffDate: state.carDropoffDate,
    unsure: state.unsure,
    items,
    packingNotes: cleanPackingNotes(plan.packingNotes).trim(),
  };
}

export function plannerStateFromTrip(trip: TripWrite): PlannerState {
  const base = initialPlannerState();
  return {
    ...base,
    categories: TRIP_CATEGORIES.filter((cat) => trip.categories.includes(cat)),
    unsure: trip.unsure,
    destination: trip.destination,
    dateMode: trip.dateMode,
    startDate: trip.startDate,
    endDate: trip.endDate,
    month: trip.month,
    nights: trip.nights,
    adults: trip.adults,
    children: trip.children,
    origin: trip.origin,
    tripType: trip.tripType,
    rooms: trip.rooms,
    carPickupSameAsDestination: trip.carPickupSameAsDestination,
    carPickupLocation: trip.carPickupLocation,
    carDatesSameAsTrip: trip.carDatesSameAsTrip,
    carPickupDate: trip.carPickupDate,
    carDropoffDate: trip.carDropoffDate,
  };
}

export function storedPlanFromTrip(trip: TripRecord): StoredTripPlan {
  const state = plannerStateFromTrip(trip);
  const suggested = suggestTripTitle(state, true);
  const custom = trip.title.trim() !== suggested;
  return {
    step: 4,
    state,
    items: trip.items,
    tripId: trip.id,
    packingNotes: trip.packingNotes,
    title: custom ? trip.title : "",
    titleCustom: custom,
  };
}

export function bookedChecklist(items: TripItem[]): string[] {
  return items.filter((item) => item.status === "booked").map((item) => item.id);
}

export function isReasonableTripDraft(plan: {
  step: number;
  state: PlannerState;
  items: TripItem[];
}): boolean {
  if (!plan.state.destination.trim()) return false;
  return plan.step === 4 || plan.items.length > 0;
}

export function itemsForLane(
  items: TripItem[],
  partner: Pick<TripPlannerPartner, "key" | "showWhen">,
): TripItem[] {
  const type = itemTypeForPartner(partner);
  return items.filter(
    (item) => item.laneKey === partner.key || (!item.laneKey && item.type === type),
  );
}
