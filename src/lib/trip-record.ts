/**
 * Saved-trip shape shared by the itinerary hub, local drafts, and APIs.
 * Safe to import from client components (no Firestore, no filesystem).
 */
import {
  dateSummary,
  formatFlexible,
  formatMonthYear,
  initialPlannerState,
  parseIsoDate,
  PLAN_A_TRIP_SLUG,
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
};

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
};

const MAX_ITEMS = 40;

export function planATripHref(tripId?: string | null): string {
  const path = `/guides/${PLAN_A_TRIP_SLUG}`;
  if (!tripId) return path;
  return `${path}?trip=${encodeURIComponent(tripId)}`;
}

export function planATripLoginHref(tripId?: string | null): string {
  return `/login?callbackUrl=${encodeURIComponent(planATripHref(tripId))}`;
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

export function createTripItem(input: {
  type: TripItemType;
  title?: string;
  url?: string;
  notes?: string;
  laneKey?: string;
  sortOrder: number;
}): TripItem {
  const title = input.title?.trim() || defaultItemTitle(input.type);
  const laneKey = input.laneKey?.trim();
  return {
    id: createTripItemId(),
    type: input.type,
    title: title.slice(0, 160),
    url: input.url?.trim() ?? "",
    notes: input.notes?.trim().slice(0, 2000) ?? "",
    status: "todo",
    sortOrder: input.sortOrder,
    updatedAt: new Date().toISOString(),
    ...(laneKey ? { laneKey } : {}),
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
  if (url && !isSafeHttpUrl(url)) return null;

  const title =
    typeof record.title === "string" ? record.title.trim().slice(0, 160) : "";
  const notes =
    typeof record.notes === "string" ? record.notes.trim().slice(0, 2000) : "";
  if (!title && !url && !notes) return null;

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
    },
  };
}

export function tripWriteFromPlan(
  plan: { state: PlannerState; items: TripItem[] },
  flexibleDatesEnabled: boolean,
): TripWrite {
  const { state, items } = plan;
  return {
    title: suggestTripTitle(state, flexibleDatesEnabled),
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
  return {
    step: 4,
    state: plannerStateFromTrip(trip),
    items: trip.items,
    tripId: trip.id,
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
