import {
  isStayConfirmationPath,
  type StayConfirmationDetails,
  type StaysQuery,
} from "@/lib/stays";
import {
  formatDateRange,
  initialPlannerState,
  type PlannerState,
} from "@/lib/trip-planner-model";
import {
  backupGuestDraft,
  getActivePlanSnapshot,
  writeActivePlan,
  type StoredPlan,
} from "@/lib/trip-planner-storage";
import {
  cleanConfirmation,
  createTripItem,
  isSafeHttpUrl,
  isSafeSitePath,
  planATripHref,
  storedPlanFromTrip,
  tripWriteFromPlan,
  type TripItem,
  type TripRecord,
} from "@/lib/trip-record";

/** Hash the hub scrolls to after a stay is booked. */
export const STAY_LANE_HASH = "plan-stay-lane";

const PENDING_KEY = "fj.plan-a-trip.pending-stays.v1";

export type StayTripContext = {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  rooms: number;
  tripId: string | null;
};

export type BookedStayInput = {
  hotelName: string;
  confirmation: string;
  notes: string;
  href: string;
  checkin?: string;
  checkout?: string;
  checkinTime?: string;
  checkoutTime?: string;
};

export type PendingBookedStay = {
  tripId: string;
  stay: BookedStayInput;
};

export type StayCommitResult =
  | { ok: true; href: string; saved: "account" | "local" | "pending" }
  | { ok: false; reason: "no-plan" };

export function stayTripContext(query: StaysQuery): StayTripContext {
  return {
    destination: query.destination.trim(),
    startDate: query.startDate,
    endDate: query.endDate,
    adults: query.adults,
    children: query.children,
    rooms: query.rooms,
    tripId: query.tripId || null,
  };
}

export function bookedStayFromConfirmation(
  confirmation: Pick<
    StayConfirmationDetails,
    "hotelName" | "confirmationCode" | "dateLabel" | "roomName" | "checkin" | "checkout"
  >,
  href: string,
): BookedStayInput {
  return {
    hotelName: confirmation.hotelName,
    confirmation: confirmation.confirmationCode,
    notes: [confirmation.dateLabel, confirmation.roomName].filter(Boolean).join(" · "),
    href,
    checkin: confirmation.checkin,
    checkout: confirmation.checkout,
  };
}

export function itineraryStayHref(tripId?: string | null): string {
  const base = planATripHref(tripId);
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}stay=booked#${STAY_LANE_HASH}`;
}

/**
 * Compact trip chrome for /stays. Null when the page was opened with no trip.
 */
export function stayBookingBar(query: StaysQuery): {
  label: string;
  backHref: string;
  backLabel: "Back to itinerary";
} | null {
  const context = stayTripContext(query);
  if (!context.destination && !context.tripId) return null;
  const place = context.destination || "your saved trip";
  const dates = context.destination
    ? formatDateRange(context.startDate, context.endDate)
    : "";
  return {
    label: dates ? `Booking for: ${place} · ${dates}` : `Booking for: ${place}`,
    backHref: planATripHref(context.tripId),
    backLabel: "Back to itinerary",
  };
}

export function stayItemHref(href: string): string {
  const trimmed = href.trim().slice(0, 2000);
  if (isSafeSitePath(trimmed) || isSafeHttpUrl(trimmed)) return trimmed;
  return "";
}

function samePlace(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left.length > 0 && left === right;
}

function withHotelCategory(state: PlannerState): PlannerState {
  if (state.unsure || state.categories.includes("hotel")) return state;
  return { ...state, categories: [...state.categories, "hotel"] };
}

function stayDayIndex(tripStart: string, checkin: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tripStart) || !/^\d{4}-\d{2}-\d{2}$/.test(checkin)) {
    return undefined;
  }
  const start = Date.parse(`${tripStart}T00:00:00Z`);
  const day = Date.parse(`${checkin}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(day)) return undefined;
  const index = Math.round((day - start) / 86_400_000) + 1;
  if (index < 1 || index > 90) return undefined;
  return index;
}

export function planMatchesStay(plan: StoredPlan, context: StayTripContext): boolean {
  if (context.tripId && plan.tripId) return plan.tripId === context.tripId;
  if (context.tripId && !plan.tripId) return false;
  return samePlace(plan.state.destination, context.destination);
}

export function seedPlanForStay(context: StayTripContext): StoredPlan {
  const state: PlannerState = {
    ...initialPlannerState(),
    categories: ["hotel"],
    destination: context.destination.trim(),
    dateMode: "exact",
    startDate: context.startDate,
    endDate: context.endDate,
    adults: context.adults > 0 ? context.adults : 2,
    children: Math.max(0, context.children),
    rooms: context.rooms > 0 ? context.rooms : 1,
  };
  return {
    step: 4,
    state,
    items: [],
    tripId: context.tripId,
    packingNotes: "",
    title: "",
    titleCustom: false,
  };
}

function isSameStay(item: TripItem, confirmation: string, href: string, title: string): boolean {
  if (item.type !== "hotel") return false;
  if (confirmation && item.confirmation === confirmation) return true;
  return Boolean(href) && item.url === href && item.title === title;
}

function withConfirmationHref(
  items: TripItem[],
  confirmation: string,
  href: string,
  title: string,
): TripItem[] {
  if (!href || !isStayConfirmationPath(href)) return items;
  let changed = false;
  const next = items.map((item) => {
    if (!isSameStay(item, confirmation, item.url, title)) return item;
    if (item.url === href || isStayConfirmationPath(item.url)) return item;
    changed = true;
    return { ...item, url: href, updatedAt: new Date().toISOString() };
  });
  return changed ? next : items;
}

/** Append a booked hotel, or leave the plan alone when that confirmation is already there. */
export function mergeBookedStay(
  plan: StoredPlan,
  stay: BookedStayInput,
): { plan: StoredPlan; added: boolean } {
  const confirmation = cleanConfirmation(stay.confirmation);
  const href = stayItemHref(stay.href);
  const title = stay.hotelName.trim().slice(0, 160);
  const state = withHotelCategory(plan.state);
  const already = plan.items.some((item) => isSameStay(item, confirmation, href, title));
  if (already) {
    const items = withConfirmationHref(plan.items, confirmation, href, title);
    const changed = state !== plan.state || plan.step !== 4 || items !== plan.items;
    return {
      added: false,
      plan: changed ? { ...plan, step: 4, state, items } : plan,
    };
  }
  const sortOrder = plan.items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
  const item = createTripItem({
    type: "hotel",
    title,
    url: href,
    notes: stay.notes,
    confirmation,
    status: "booked",
    laneKey: "booking",
    sortOrder,
    dayIndex: stayDayIndex(plan.state.startDate, stay.checkin ?? ""),
    checkinDate: stay.checkin,
    checkoutDate: stay.checkout,
    checkinTime: stay.checkinTime,
    checkoutTime: stay.checkoutTime,
  });
  return {
    added: true,
    plan: { ...plan, step: 4, state, items: [...plan.items, item] },
  };
}

export function mergePendingStays(plan: StoredPlan, stays: readonly BookedStayInput[]): StoredPlan {
  return stays.reduce((current, stay) => mergeBookedStay(current, stay).plan, plan);
}

/**
 * Which local plan can take this stay without a round trip to the account.
 * `account` means the URL names a saved trip that this browser does not have open.
 */
export function nextLocalPlan(
  local: StoredPlan | null,
  context: StayTripContext,
  stay: BookedStayInput,
): { kind: "local"; plan: StoredPlan } | { kind: "account" } | { kind: "none" } {
  if (local && planMatchesStay(local, context)) {
    return { kind: "local", plan: mergeBookedStay(local, stay).plan };
  }
  if (context.tripId) return { kind: "account" };
  if (!local && context.destination.trim()) {
    return {
      kind: "local",
      plan: mergeBookedStay(seedPlanForStay({ ...context, tripId: null }), stay).plan,
    };
  }
  if (local && samePlace(local.state.destination, context.destination)) {
    return { kind: "local", plan: mergeBookedStay(local, stay).plan };
  }
  return { kind: "none" };
}

export function queuePendingStay(
  list: readonly PendingBookedStay[],
  entry: PendingBookedStay,
): PendingBookedStay[] {
  const tripId = entry.tripId.trim();
  const confirmation = cleanConfirmation(entry.stay.confirmation);
  if (!tripId) return [...list];
  const exists = list.some((item) => {
    if (item.tripId !== tripId) return false;
    const code = cleanConfirmation(item.stay.confirmation);
    return Boolean(confirmation) && code === confirmation;
  });
  if (exists) return [...list];
  return [...list, { tripId, stay: entry.stay }].slice(-20);
}

export function takePendingForTrip(
  list: readonly PendingBookedStay[],
  tripId: string,
): { matches: BookedStayInput[]; rest: PendingBookedStay[] } {
  const matches: BookedStayInput[] = [];
  const rest: PendingBookedStay[] = [];
  for (const entry of list) {
    if (entry.tripId === tripId) matches.push(entry.stay);
    else rest.push(entry);
  }
  return { matches, rest };
}

function parsePending(raw: string | null): PendingBookedStay[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const stays: PendingBookedStay[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as { tripId?: unknown; stay?: unknown };
      const tripId = typeof record.tripId === "string" ? record.tripId.trim() : "";
      const stay = record.stay;
      if (!tripId || !stay || typeof stay !== "object") continue;
      const fields = stay as Partial<BookedStayInput>;
      if (typeof fields.hotelName !== "string" || !fields.hotelName.trim()) continue;
      stays.push({
        tripId,
        stay: {
          hotelName: fields.hotelName,
          confirmation: typeof fields.confirmation === "string" ? fields.confirmation : "",
          notes: typeof fields.notes === "string" ? fields.notes : "",
          href: typeof fields.href === "string" ? fields.href : "",
          checkin: typeof fields.checkin === "string" ? fields.checkin : "",
          checkout: typeof fields.checkout === "string" ? fields.checkout : "",
          checkinTime:
            typeof fields.checkinTime === "string" ? fields.checkinTime : "",
          checkoutTime:
            typeof fields.checkoutTime === "string" ? fields.checkoutTime : "",
        },
      });
    }
    return stays;
  } catch {
    return [];
  }
}

function pendingStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function rememberPendingBookedStay(entry: PendingBookedStay) {
  const store = pendingStorage();
  if (!store) return;
  const next = queuePendingStay(parsePending(store.getItem(PENDING_KEY)), entry);
  try {
    store.setItem(PENDING_KEY, JSON.stringify(next));
  } catch {
    /* private mode or quota */
  }
}

/** Fold stays booked before the account trip was open into the active plan. */
export function applyPendingBookedStays(tripId: string | null) {
  if (!tripId) return;
  const store = pendingStorage();
  if (!store) return;
  const { matches, rest } = takePendingForTrip(parsePending(store.getItem(PENDING_KEY)), tripId);
  if (matches.length === 0) return;
  const plan = getActivePlanSnapshot();
  if (!plan || plan.tripId !== tripId) return;
  writeActivePlan(mergePendingStays(plan, matches));
  try {
    store.setItem(PENDING_KEY, JSON.stringify(rest));
  } catch {
    /* the stay is already on the active plan */
  }
}

type AccountLoad =
  | { status: "ready"; plan: StoredPlan }
  | { status: "missing" }
  | { status: "unavailable" };

async function loadAccountPlan(tripId: string): Promise<AccountLoad> {
  try {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}`);
    if (res.status === 404) return { status: "missing" };
    if (!res.ok) return { status: "unavailable" };
    const data = (await res.json()) as { trip?: TripRecord };
    if (!data.trip?.id || !data.trip.destination) return { status: "unavailable" };
    return { status: "ready", plan: storedPlanFromTrip(data.trip) };
  } catch {
    return { status: "unavailable" };
  }
}

async function patchAccountPlan(plan: StoredPlan): Promise<boolean> {
  if (!plan.tripId) return false;
  try {
    const res = await fetch(`/api/trips/${encodeURIComponent(plan.tripId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tripWriteFromPlan(plan, true)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function writeGuestStay(
  local: StoredPlan | null,
  context: StayTripContext,
  stay: BookedStayInput,
): StoredPlan | null {
  if (local?.tripId) return null;
  const guest = nextLocalPlan(local, { ...context, tripId: null }, stay);
  if (guest.kind !== "local") return null;
  writeActivePlan(guest.plan);
  return guest.plan;
}

const inflight = new Map<string, Promise<StayCommitResult>>();

async function commitOnce(
  stay: BookedStayInput,
  context: StayTripContext,
): Promise<StayCommitResult> {
  const local = getActivePlanSnapshot();
  const decision = nextLocalPlan(local, context, stay);

  if (decision.kind === "local") {
    writeActivePlan(decision.plan);
    const tripId = decision.plan.tripId;
    if (tripId) {
      const saved = await patchAccountPlan(decision.plan);
      return {
        ok: true,
        href: itineraryStayHref(tripId),
        saved: saved ? "account" : "local",
      };
    }
    return { ok: true, href: itineraryStayHref(null), saved: "local" };
  }

  if (decision.kind === "account" && context.tripId) {
    const loaded = await loadAccountPlan(context.tripId);
    if (loaded.status === "ready") {
      const plan = mergeBookedStay(loaded.plan, stay).plan;
      const differentLocal = Boolean(local?.tripId && local.tripId !== context.tripId);
      if (!differentLocal) {
        if (local && !local.tripId && local.state.destination.trim()) {
          backupGuestDraft(local);
        }
        writeActivePlan(plan);
      }
      const saved = await patchAccountPlan(plan);
      return {
        ok: true,
        href: itineraryStayHref(context.tripId),
        saved: saved ? "account" : "local",
      };
    }
    if (loaded.status === "missing") {
      const guest = writeGuestStay(local, context, stay);
      if (!guest) return { ok: false, reason: "no-plan" };
      return { ok: true, href: itineraryStayHref(null), saved: "local" };
    }
    rememberPendingBookedStay({ tripId: context.tripId, stay });
    writeGuestStay(local, context, stay);
    return { ok: true, href: itineraryStayHref(context.tripId), saved: "pending" };
  }

  return { ok: false, reason: "no-plan" };
}

/** Write the booked hotel onto the open itinerary and, when it is saved, the account trip. */
export function commitBookedStay(
  stay: BookedStayInput,
  context: StayTripContext,
): Promise<StayCommitResult> {
  const key = `${context.tripId ?? ""}|${cleanConfirmation(stay.confirmation)}|${stay.href}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = commitOnce(stay, context).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
