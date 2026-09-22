import type { FlightConfirmationDetails, FlightsQuery } from "@/lib/flights";
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
  cleanTime,
  createTripItem,
  isSafeHttpUrl,
  isSafeSitePath,
  planATripHref,
  storedPlanFromTrip,
  tripWriteFromPlan,
  type TripItem,
  type TripRecord,
} from "@/lib/trip-record";

/** Hash the hub scrolls to after a flight is booked. */
export const FLIGHT_LANE_HASH = "plan-flight-lane";

/** Partner key of the in-app flight lane. Kept so saved items still land on it. */
export const FLIGHT_LANE_KEY = "expedia";

const PENDING_KEY = "fj.plan-a-trip.pending-flights.v1";

export type FlightTripContext = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  tripType: FlightsQuery["tripType"];
  tripId: string | null;
};

export type BookedFlightInput = {
  title: string;
  confirmation: string;
  notes: string;
  href: string;
  departDate: string;
  time: string;
};

export type PendingBookedFlight = {
  tripId: string;
  flight: BookedFlightInput;
};

export type FlightCommitResult =
  | { ok: true; href: string; saved: "account" | "local" | "pending" }
  | { ok: false; reason: "no-plan" };

export function flightTripContext(query: FlightsQuery): FlightTripContext {
  return {
    origin: query.origin.trim(),
    destination: query.destination.trim(),
    startDate: query.startDate,
    endDate: query.endDate,
    adults: query.adults,
    children: query.children,
    tripType: query.tripType,
    tripId: query.tripId || null,
  };
}

export function bookedFlightFromConfirmation(
  confirmation: Pick<
    FlightConfirmationDetails,
    "title" | "confirmationCode" | "dateLabel" | "routeLabel" | "cabin" | "departDate" | "departTime"
  >,
  href: string,
): BookedFlightInput {
  return {
    title: confirmation.title,
    confirmation: confirmation.confirmationCode,
    notes: [confirmation.routeLabel, confirmation.dateLabel, confirmation.cabin]
      .filter(Boolean)
      .join(" · "),
    href,
    departDate: confirmation.departDate,
    time: confirmation.departTime,
  };
}

export function itineraryFlightHref(tripId?: string | null): string {
  const base = planATripHref(tripId);
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}flight=booked#${FLIGHT_LANE_HASH}`;
}

export function flightBookingBar(query: FlightsQuery): {
  label: string;
  backHref: string;
  backLabel: "Back to itinerary";
} | null {
  const context = flightTripContext(query);
  if (!context.destination && !context.origin && !context.tripId) return null;
  const route = [context.origin, context.destination].filter(Boolean).join(" → ");
  const place = route || "your saved trip";
  const dates =
    context.startDate && context.endDate
      ? formatDateRange(context.startDate, context.endDate)
      : context.startDate
        ? formatDateRange(context.startDate, context.startDate)
        : "";
  return {
    label: dates ? `Booking for: ${place} · ${dates}` : `Booking for: ${place}`,
    backHref: planATripHref(context.tripId),
    backLabel: "Back to itinerary",
  };
}

export function flightItemHref(href: string): string {
  const trimmed = href.trim().slice(0, 2000);
  if (isSafeSitePath(trimmed) || isSafeHttpUrl(trimmed)) return trimmed;
  return "";
}

function samePlace(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left.length > 0 && left === right;
}

function withFlightCategory(state: PlannerState): PlannerState {
  if (state.unsure || state.categories.includes("flights")) return state;
  return { ...state, categories: [...state.categories, "flights"] };
}

function flightDayIndex(tripStart: string, depart: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tripStart) || !/^\d{4}-\d{2}-\d{2}$/.test(depart)) {
    return undefined;
  }
  const start = Date.parse(`${tripStart}T00:00:00Z`);
  const day = Date.parse(`${depart}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(day)) return undefined;
  const index = Math.round((day - start) / 86_400_000) + 1;
  if (index < 1 || index > 90) return undefined;
  return index;
}

export function planMatchesFlight(plan: StoredPlan, context: FlightTripContext): boolean {
  if (context.tripId && plan.tripId) return plan.tripId === context.tripId;
  if (context.tripId && !plan.tripId) return false;
  return (
    samePlace(plan.state.origin, context.origin) &&
    samePlace(plan.state.destination, context.destination)
  );
}

export function seedPlanForFlight(context: FlightTripContext): StoredPlan {
  const state: PlannerState = {
    ...initialPlannerState(),
    categories: ["flights"],
    origin: context.origin.trim(),
    destination: context.destination.trim(),
    dateMode: "exact",
    startDate: context.startDate,
    endDate: context.endDate || context.startDate,
    tripType: context.tripType,
    adults: context.adults > 0 ? context.adults : 1,
    children: Math.max(0, context.children),
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

function isSameFlight(item: TripItem, confirmation: string, href: string, title: string): boolean {
  if (item.type !== "flight") return false;
  if (confirmation && item.confirmation === confirmation) return true;
  return Boolean(href) && item.url === href && item.title === title;
}

export function mergeBookedFlight(
  plan: StoredPlan,
  flight: BookedFlightInput,
): { plan: StoredPlan; added: boolean } {
  const confirmation = cleanConfirmation(flight.confirmation);
  const href = flightItemHref(flight.href);
  const title = flight.title.trim().slice(0, 160);
  const state = withFlightCategory(plan.state);
  const already = plan.items.some((item) => isSameFlight(item, confirmation, href, title));
  if (already) {
    const changed = state !== plan.state || plan.step !== 4;
    return {
      added: false,
      plan: changed ? { ...plan, step: 4, state } : plan,
    };
  }
  const sortOrder = plan.items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
  const item = createTripItem({
    type: "flight",
    title,
    url: href,
    notes: flight.notes,
    confirmation,
    status: "booked",
    laneKey: FLIGHT_LANE_KEY,
    sortOrder,
    dayIndex: flightDayIndex(plan.state.startDate, flight.departDate),
    time: cleanTime(flight.time),
  });
  return {
    added: true,
    plan: { ...plan, step: 4, state, items: [...plan.items, item] },
  };
}

export function mergePendingFlights(
  plan: StoredPlan,
  flights: readonly BookedFlightInput[],
): StoredPlan {
  return flights.reduce((current, flight) => mergeBookedFlight(current, flight).plan, plan);
}

export function nextLocalFlightPlan(
  local: StoredPlan | null,
  context: FlightTripContext,
  flight: BookedFlightInput,
): { kind: "local"; plan: StoredPlan } | { kind: "account" } | { kind: "none" } {
  if (local && planMatchesFlight(local, context)) {
    return { kind: "local", plan: mergeBookedFlight(local, flight).plan };
  }
  if (context.tripId) return { kind: "account" };
  if (!local && (context.destination.trim() || context.origin.trim())) {
    return {
      kind: "local",
      plan: mergeBookedFlight(seedPlanForFlight({ ...context, tripId: null }), flight).plan,
    };
  }
  if (
    local &&
    samePlace(local.state.origin, context.origin) &&
    samePlace(local.state.destination, context.destination)
  ) {
    return { kind: "local", plan: mergeBookedFlight(local, flight).plan };
  }
  return { kind: "none" };
}

export function queuePendingFlight(
  list: readonly PendingBookedFlight[],
  entry: PendingBookedFlight,
): PendingBookedFlight[] {
  const tripId = entry.tripId.trim();
  const confirmation = cleanConfirmation(entry.flight.confirmation);
  if (!tripId) return [...list];
  const exists = list.some((item) => {
    if (item.tripId !== tripId) return false;
    const code = cleanConfirmation(item.flight.confirmation);
    return Boolean(confirmation) && code === confirmation;
  });
  if (exists) return [...list];
  return [...list, { tripId, flight: entry.flight }].slice(-20);
}

export function takePendingFlightsForTrip(
  list: readonly PendingBookedFlight[],
  tripId: string,
): { matches: BookedFlightInput[]; rest: PendingBookedFlight[] } {
  const matches: BookedFlightInput[] = [];
  const rest: PendingBookedFlight[] = [];
  for (const entry of list) {
    if (entry.tripId === tripId) matches.push(entry.flight);
    else rest.push(entry);
  }
  return { matches, rest };
}

function parsePending(raw: string | null): PendingBookedFlight[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const flights: PendingBookedFlight[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as { tripId?: unknown; flight?: unknown };
      const tripId = typeof record.tripId === "string" ? record.tripId.trim() : "";
      const flight = record.flight;
      if (!tripId || !flight || typeof flight !== "object") continue;
      const fields = flight as Partial<BookedFlightInput>;
      if (typeof fields.title !== "string" || !fields.title.trim()) continue;
      flights.push({
        tripId,
        flight: {
          title: fields.title,
          confirmation: typeof fields.confirmation === "string" ? fields.confirmation : "",
          notes: typeof fields.notes === "string" ? fields.notes : "",
          href: typeof fields.href === "string" ? fields.href : "",
          departDate: typeof fields.departDate === "string" ? fields.departDate : "",
          time: typeof fields.time === "string" ? fields.time : "",
        },
      });
    }
    return flights;
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

export function rememberPendingBookedFlight(entry: PendingBookedFlight) {
  const store = pendingStorage();
  if (!store) return;
  const next = queuePendingFlight(parsePending(store.getItem(PENDING_KEY)), entry);
  try {
    store.setItem(PENDING_KEY, JSON.stringify(next));
  } catch {
    /* private mode or quota */
  }
}

export function applyPendingBookedFlights(tripId: string | null) {
  if (!tripId) return;
  const store = pendingStorage();
  if (!store) return;
  const { matches, rest } = takePendingFlightsForTrip(
    parsePending(store.getItem(PENDING_KEY)),
    tripId,
  );
  if (matches.length === 0) return;
  const plan = getActivePlanSnapshot();
  if (!plan || plan.tripId !== tripId) return;
  writeActivePlan(mergePendingFlights(plan, matches));
  try {
    store.setItem(PENDING_KEY, JSON.stringify(rest));
  } catch {
    /* the flight is already on the active plan */
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

function writeGuestFlight(
  local: StoredPlan | null,
  context: FlightTripContext,
  flight: BookedFlightInput,
): StoredPlan | null {
  if (local?.tripId) return null;
  const guest = nextLocalFlightPlan(local, { ...context, tripId: null }, flight);
  if (guest.kind !== "local") return null;
  writeActivePlan(guest.plan);
  return guest.plan;
}

const inflight = new Map<string, Promise<FlightCommitResult>>();

async function commitOnce(
  flight: BookedFlightInput,
  context: FlightTripContext,
): Promise<FlightCommitResult> {
  const local = getActivePlanSnapshot();
  const decision = nextLocalFlightPlan(local, context, flight);

  if (decision.kind === "local") {
    writeActivePlan(decision.plan);
    const tripId = decision.plan.tripId;
    if (tripId) {
      const saved = await patchAccountPlan(decision.plan);
      return {
        ok: true,
        href: itineraryFlightHref(tripId),
        saved: saved ? "account" : "local",
      };
    }
    return { ok: true, href: itineraryFlightHref(null), saved: "local" };
  }

  if (decision.kind === "account" && context.tripId) {
    const loaded = await loadAccountPlan(context.tripId);
    if (loaded.status === "ready") {
      const plan = mergeBookedFlight(loaded.plan, flight).plan;
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
        href: itineraryFlightHref(context.tripId),
        saved: saved ? "account" : "local",
      };
    }
    if (loaded.status === "missing") {
      const guest = writeGuestFlight(local, context, flight);
      if (!guest) return { ok: false, reason: "no-plan" };
      return { ok: true, href: itineraryFlightHref(null), saved: "local" };
    }
    rememberPendingBookedFlight({ tripId: context.tripId, flight });
    writeGuestFlight(local, context, flight);
    return { ok: true, href: itineraryFlightHref(context.tripId), saved: "pending" };
  }

  return { ok: false, reason: "no-plan" };
}

/** Write the booked flight onto the open itinerary and, when it is saved, the account trip. */
export function commitBookedFlight(
  flight: BookedFlightInput,
  context: FlightTripContext,
): Promise<FlightCommitResult> {
  const key = `${context.tripId ?? ""}|${cleanConfirmation(flight.confirmation)}|${flight.href}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = commitOnce(flight, context).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
