/**
 * Printable trip sections. Pure data — no PDF library — so the workspace
 * can lazy-load the renderer. Uses the same days, items, and packing notes
 * the trip workspace already saves locally and on an account.
 */
import { parseIsoDate } from "@/lib/trip-planner-model";
import {
  compareScheduledItems,
  formatTripDayDetail,
  itemScheduleTime,
  scheduledDayIndex,
  type TripDay,
  type TripItem,
  type TripItemStatus,
  type TripItemType,
} from "@/lib/trip-record";

/** Public journal name. Matches `site.name` in src/data/content.ts. */
export const TRIP_PDF_BRAND = "Alex Journeys";
export const TRIP_PDF_AUTHOR = "Alex Fernandes";
/** Printed in the footer. Matches the public host in src/data/content.ts. */
export const TRIP_PDF_SITE = "www.alexjourneys.com";

export const TRIP_PDF_SECTIONS = [
  "itinerary",
  "packing",
  "bookings",
  "everything",
] as const;
export type TripPdfSection = (typeof TRIP_PDF_SECTIONS)[number];

export type TripPdfSource = {
  title: string;
  destination: string;
  dates: string;
  days: TripDay[];
  items: TripItem[];
  packingNotes: string;
  /**
   * Signed-in display name, when the workspace knows one.
   * Booking names are the fallback and live on `bookingNames` or in item notes.
   */
  travelerName?: string;
  /** Passenger or guest names already stored with this trip’s bookings. */
  bookingNames?: string[];
};

export type PdfRow = { label: string; value: string };

export type PdfBlock =
  | { type: "section"; title: string }
  | { type: "day"; label: string; detail: string }
  | { type: "plan"; time: string; title: string; lines: string[]; notes: string }
  | { type: "message"; text: string }
  | { type: "category"; title: string }
  | { type: "check"; label: string; checked: boolean }
  | {
      type: "booking";
      kind: string;
      status: string;
      title: string;
      rows: PdfRow[];
      notes: string;
    };

export type TripPdfDocument = {
  filename: string;
  shareTitle: string;
  brand: string;
  author: string;
  site: string;
  title: string;
  dates: string;
  destination: string;
  /** Empty when no traveler name is known. The PDF leaves the line out. */
  travelerName: string;
  section: TripPdfSection;
  sectionLabel: string;
  blocks: PdfBlock[];
};

export type PackingItem = { label: string; checked: boolean };
export type PackingGroup = { title: string; items: PackingItem[] };

const SECTION_LABEL: Record<TripPdfSection, string> = {
  itinerary: "Itinerary",
  packing: "Packing list",
  bookings: "Bookings",
  everything: "Everything",
};

const KIND_LABEL: Record<TripItemType, string> = {
  hotel: "Stay",
  flight: "Flight",
  car: "Car",
  activity: "Experience",
  other: "Forwarded confirmation",
  note: "Note",
};

const KIND_ORDER: TripItemType[] = [
  "hotel",
  "flight",
  "car",
  "activity",
  "other",
];

const PRICE_PATTERN =
  /(?:\b(?:USD|EUR|GBP|CAD|AUD|BRL|MXN|ISK|CHF)\s*)?[$€£]\s?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\b(?:USD|EUR|GBP|CAD|AUD|BRL|MXN|ISK|CHF)\s+\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?\b/;

const ADDRESS_LINE =
  /^(?:address|hotel address|location)\s*:\s*(.+)$/im;

const STREET_LINE =
  /\b\d{1,5}\s+[A-Za-zÀ-ÿ0-9].{0,80}?\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|way|rua|calle|gata)\b/i;

const CHECKED_ITEM =
  /^(?:[-*•]\s+)?(?:\[[xX]\]|\([xX]\)|[✓✔☑])\s*(.*)$/;
const UNCHECKED_ITEM =
  /^(?:[-*•]\s+)?(?:\[\s?\]|\(\s?\)|[☐])\s*(.*)$/;
const BULLET_ITEM = /^[-*•]\s+(.*)$/;
const MARKDOWN_HEADING = /^#{1,3}\s+(.*)$/;

const EMPTY_ITINERARY =
  "No days or plans yet. Add dates and a few plans in your trip, then download this again.";
const EMPTY_DAY = "Nothing planned yet.";
const EMPTY_PACKING =
  "Nothing to pack yet. Add one item per line on the Packing tab. Put a category on its own line, then mark packed items with [x].";
const PLACEHOLDER_NAMES = new Set([
  "account",
  "guest",
  "reader",
  "traveler",
  "traveller",
  "user",
  "you",
]);

const BOOKING_NAME_LINE =
  /^(?:lead\s+)?(?:guest(?:\s+name)?|passenger(?:\s+name)?|travell?er(?:\s+name)?|booked\s+for|reserved\s+for|name)\s*[:\-–]\s*(.+)$/i;

/** A real person’s name. Placeholders, emails, and blank values are dropped. */
export function cleanTravelerName(value: string | null | undefined): string {
  if (!value) return "";
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 80) return "";
  if (name.includes("@") || /\d/.test(name)) return "";
  if (!/[A-Za-zÀ-ÿ]/.test(name)) return "";
  if (PLACEHOLDER_NAMES.has(name.toLowerCase())) return "";
  return name;
}

function travelerNameFromNotes(items: TripItem[]): string {
  for (const item of items) {
    if (item.type === "note") continue;
    for (const line of item.notes.split("\n")) {
      const match = line.trim().match(BOOKING_NAME_LINE);
      const name = cleanTravelerName(match?.[1]);
      if (name) return name;
    }
  }
  return "";
}

/**
 * Signed-in display name, then a name saved with a booking.
 * Returns "" when nothing usable is known.
 */
export function resolveTripTravelerName(source: TripPdfSource): string {
  const account = cleanTravelerName(source.travelerName);
  if (account) return account;
  for (const candidate of source.bookingNames ?? []) {
    const name = cleanTravelerName(candidate);
    if (name) return name;
  }
  return travelerNameFromNotes(source.items);
}

const EMPTY_BOOKINGS =
  "No bookings yet. Stays, flights, cars, experiences, and forwarded confirmations you add to this trip will show up here.";

export function tripPdfFilename(title: string, section: TripPdfSection): string {
  const slug =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "trip";
  const suffix =
    section === "packing"
      ? "packing-list"
      : section === "everything"
        ? "trip"
        : section;
  return `${slug}-${suffix}.pdf`;
}

/** Drop card numbers, security codes, and “ending in” fragments. */
export function redactPaymentDetails(value: string): string {
  let text = value.replace(/\r\n/g, "\n");
  text = text.replace(
    /\b(?:cvv|cvc|cid|security code)\s*[:#-]?\s*\d{3,4}\b/gi,
    "",
  );
  text = text.replace(
    /\b(?:card|credit card|debit card|cc)\s*(?:number|no\.?|#)?\s*[:#-]?\s*(?:\d[ -]?){12,19}/gi,
    "",
  );
  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, "");
  text = text.replace(
    /\b(?:ending(?:\s+in)?|last\s*4)\s*[:#-]?\s*\d{4}\b/gi,
    "",
  );
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/[ \t]+([,.;:])/g, "$1");
  text = text.replace(/\(\s*\)/g, "");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function extractPrice(notes: string): string {
  const match = notes.match(PRICE_PATTERN);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

export function extractAddress(notes: string): string {
  const labeled = notes.match(ADDRESS_LINE);
  if (labeled?.[1]?.trim()) return labeled[1].trim().slice(0, 180);
  for (const line of notes.split(/\n/)) {
    if (STREET_LINE.test(line)) return line.trim().slice(0, 180);
  }
  return "";
}

function itemMarker(line: string): { checked: boolean; label: string } | null {
  const checked = line.match(CHECKED_ITEM);
  if (checked) return { checked: true, label: (checked[1] ?? "").trim() };
  const open = line.match(UNCHECKED_ITEM);
  if (open) return { checked: false, label: (open[1] ?? "").trim() };
  const bullet = line.match(BULLET_ITEM);
  if (bullet) return { checked: false, label: (bullet[1] ?? "").trim() };
  return null;
}

function isMarkedItem(line: string): boolean {
  return itemMarker(line) !== null;
}

/** Categories from a heading line, then checklist items. Plain lines stay one group. */
export function parsePackingList(notes: string): PackingGroup[] {
  const lines = notes.replace(/\r\n/g, "\n").split("\n");
  const groups: PackingGroup[] = [];
  let current: PackingGroup | null = null;

  function openGroup(title: string) {
    const name = title.replace(/:\s*$/, "").replace(/\s+/g, " ").trim() || "To pack";
    current = { title: name.slice(0, 80), items: [] };
    groups.push(current);
    return current;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? "").trim();
    if (!line) continue;

    const markdown = line.match(MARKDOWN_HEADING);
    if (markdown?.[1]?.trim()) {
      openGroup(markdown[1]);
      continue;
    }

    const next =
      lines
        .slice(index + 1)
        .map((entry) => entry.trim())
        .find(Boolean) ?? "";
    const colonHeading =
      /:\s*$/.test(line) && line.length <= 60 && !isMarkedItem(line);
    const checklistHeading =
      !isMarkedItem(line) &&
      isMarkedItem(next) &&
      line.length <= 48 &&
      !/[.!?]$/.test(line);

    if (colonHeading || checklistHeading) {
      openGroup(line);
      continue;
    }

    const parsed = itemMarker(line);
    const label = (parsed?.label ?? line).replace(/\s+/g, " ").trim();
    if (!label) continue;
    const group = current ?? openGroup("To pack");
    group.items.push({
      label: label.slice(0, 200),
      checked: parsed?.checked ?? false,
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

function statusLabel(status: TripItemStatus): string {
  if (status === "booked") return "Booked";
  if (status === "skipped") return "Skipped";
  return "Planned";
}

function formatWhen(date?: string, time?: string): string {
  if (!date) return time ?? "";
  const detail = formatTripDayDetail(date);
  const year = parseIsoDate(date)?.y;
  const dated = detail && year ? `${detail}, ${year}` : date;
  return time ? `${dated} at ${time}` : dated;
}

function pushRow(rows: PdfRow[], label: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  rows.push({ label, value: trimmed.slice(0, 240) });
}

function cleanedNotes(notes: string, hide: string[]): string {
  let text = redactPaymentDetails(notes);
  const snippets = hide.map((entry) => entry.trim()).filter(Boolean);
  text = text
    .split("\n")
    .map((line) => {
      let next = line;
      for (const snippet of snippets) next = next.split(snippet).join(" ");
      next = next.replace(/\bcard\b/gi, " ");
      next = next.replace(
        /(?:\s*[·,:-]\s*)?\b(?:total|paid|price|cost|amount)\b\s*[:.]?\s*$/i,
        "",
      );
      return next;
    })
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || ADDRESS_LINE.test(trimmed)) return false;
      if (/^(?:address|hotel address|location)\s*:?\s*$/i.test(trimmed)) return false;
      const words = trimmed
        .replace(/\b(?:total|paid|price|cost|amount)\b/gi, "")
        .replace(/[^A-Za-zÀ-ÿ0-9]+/g, "");
      return words.length > 0;
    })
    .join("\n");
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bookingRows(item: TripItem, days: TripDay[]): { rows: PdfRow[]; notes: string } {
  const rows: PdfRow[] = [];
  const price = extractPrice(item.notes);
  const address = item.type === "car" ? "" : extractAddress(item.notes);

  if (item.type === "hotel") {
    pushRow(rows, "Check-in", formatWhen(item.checkinDate, item.checkinTime));
    pushRow(rows, "Check-out", formatWhen(item.checkoutDate, item.checkoutTime));
  } else if (item.type === "flight") {
    pushRow(rows, "Departs", formatWhen(item.departureDate, item.departureTime));
    pushRow(rows, "Returns", formatWhen(item.returnDate, item.returnTime));
  } else if (item.type === "car") {
    pushRow(rows, "Pick up", formatWhen(item.pickupDate, item.pickupTime));
    pushRow(rows, "Drop off", formatWhen(item.dropoffDate, item.dropoffTime));
    pushRow(rows, "Pick-up address", item.pickupLocation ?? "");
    if (item.dropoffLocation && item.dropoffLocation !== item.pickupLocation) {
      pushRow(rows, "Drop-off address", item.dropoffLocation);
    }
  } else {
    const index = scheduledDayIndex(item, days);
    const day = index == null ? undefined : days.find((entry) => entry.index === index);
    const when = [
      day ? `${day.label} · ${day.detail}` : "",
      itemScheduleTime(item),
    ]
      .filter(Boolean)
      .join(" · ");
    pushRow(rows, "When", when);
  }

  pushRow(rows, "Confirmation", item.confirmation ?? "");
  pushRow(rows, "Address", address);
  pushRow(rows, "Price", price);
  return {
    rows,
    notes: cleanedNotes(item.notes, [address, price]),
  };
}

function planDetails(item: TripItem): { lines: string[]; notes: string } {
  const lines: string[] = [];
  if (item.type !== "note") lines.push(KIND_LABEL[item.type]);
  if (item.status !== "booked") lines.push(statusLabel(item.status));

  if (item.type === "flight") {
    const depart = formatWhen(item.departureDate, item.departureTime);
    const back = formatWhen(item.returnDate, item.returnTime);
    if (depart) lines.push(`Departs ${depart}`);
    if (back) lines.push(`Returns ${back}`);
  } else if (item.type === "hotel") {
    const checkin = formatWhen(item.checkinDate, item.checkinTime);
    const checkout = formatWhen(item.checkoutDate, item.checkoutTime);
    if (checkin) lines.push(`Check in ${checkin}`);
    if (checkout) lines.push(`Check out ${checkout}`);
  } else if (item.type === "car") {
    const pickup = formatWhen(item.pickupDate, item.pickupTime);
    const dropoff = formatWhen(item.dropoffDate, item.dropoffTime);
    if (pickup) lines.push(`Pick up ${pickup}`);
    if (dropoff) lines.push(`Drop off ${dropoff}`);
    if (item.pickupLocation) lines.push(item.pickupLocation);
    if (item.dropoffLocation && item.dropoffLocation !== item.pickupLocation) {
      lines.push(`Drop off at ${item.dropoffLocation}`);
    }
  }

  const address = item.type === "car" ? "" : extractAddress(item.notes);
  if (address) lines.push(address);
  if (item.confirmation) lines.push(`Confirmation ${item.confirmation}`);
  const price = extractPrice(item.notes);
  if (price) lines.push(price);

  return {
    lines,
    notes: cleanedNotes(item.notes, [address, price]),
  };
}

function itineraryBlocks(source: TripPdfSource): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  const scheduled = new Set<string>();

  if (source.days.length === 0 && source.items.length === 0) {
    blocks.push({ type: "message", text: EMPTY_ITINERARY });
    return blocks;
  }

  for (const day of source.days) {
    const plans = source.items
      .filter((item) => scheduledDayIndex(item, source.days) === day.index)
      .sort(compareScheduledItems);
    for (const item of plans) scheduled.add(item.id);
    blocks.push({ type: "day", label: day.label, detail: day.detail });
    if (plans.length === 0) {
      blocks.push({ type: "message", text: EMPTY_DAY });
      continue;
    }
    for (const item of plans) {
      const details = planDetails(item);
      blocks.push({
        type: "plan",
        time: itemScheduleTime(item),
        title: item.title,
        lines: details.lines,
        notes: details.notes,
      });
    }
  }

  const loose = source.items
    .filter((item) => !scheduled.has(item.id))
    .sort(compareScheduledItems);
  if (loose.length > 0) {
    blocks.push({
      type: "day",
      label: "Not on a day yet",
      detail: "Add a day when you know it",
    });
    for (const item of loose) {
      const details = planDetails(item);
      blocks.push({
        type: "plan",
        time: itemScheduleTime(item),
        title: item.title,
        lines: details.lines,
        notes: details.notes,
      });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: "message", text: EMPTY_ITINERARY });
  }
  return blocks;
}

function packingBlocks(notes: string): PdfBlock[] {
  const groups = parsePackingList(notes);
  if (groups.length === 0) {
    return [{ type: "message", text: EMPTY_PACKING }];
  }
  const blocks: PdfBlock[] = [];
  for (const group of groups) {
    blocks.push({ type: "category", title: group.title });
    for (const item of group.items) {
      blocks.push({ type: "check", label: item.label, checked: item.checked });
    }
  }
  return blocks;
}

function isBooking(item: TripItem): boolean {
  return item.type !== "note";
}

function bookingBlocks(source: TripPdfSource): PdfBlock[] {
  const items = source.items.filter(isBooking).sort((a, b) => {
    const kind = KIND_ORDER.indexOf(a.type) - KIND_ORDER.indexOf(b.type);
    if (kind !== 0) return kind;
    const dateA = a.checkinDate || a.departureDate || a.pickupDate || "";
    const dateB = b.checkinDate || b.departureDate || b.pickupDate || "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.sortOrder - b.sortOrder;
  });
  if (items.length === 0) {
    return [{ type: "message", text: EMPTY_BOOKINGS }];
  }
  return items.map((item) => {
    const details = bookingRows(item, source.days);
    return {
      type: "booking" as const,
      kind: KIND_LABEL[item.type],
      status: statusLabel(item.status),
      title: item.title,
      rows: details.rows,
      notes: details.notes,
    };
  });
}

export function buildTripPdf(
  source: TripPdfSource,
  section: TripPdfSection,
): TripPdfDocument {
  const title = source.title.trim() || source.destination.trim() || "Trip";
  const destination = source.destination.trim();
  const blocks: PdfBlock[] =
    section === "everything"
      ? [
          { type: "section", title: "Itinerary" },
          ...itineraryBlocks(source),
          { type: "section", title: "Packing list" },
          ...packingBlocks(source.packingNotes),
          { type: "section", title: "Bookings" },
          ...bookingBlocks(source),
        ]
      : section === "itinerary"
        ? itineraryBlocks(source)
        : section === "packing"
          ? packingBlocks(source.packingNotes)
          : bookingBlocks(source);

  const sectionLabel = SECTION_LABEL[section];
  return {
    filename: tripPdfFilename(title, section),
    shareTitle: `${title} — ${sectionLabel}`,
    brand: TRIP_PDF_BRAND,
    author: TRIP_PDF_AUTHOR,
    site: TRIP_PDF_SITE,
    title,
    dates: source.dates.trim(),
    destination:
      destination && destination.toLowerCase() !== title.toLowerCase()
        ? destination
        : "",
    travelerName: resolveTripTravelerName(source),
    section,
    sectionLabel,
    blocks,
  };
}
