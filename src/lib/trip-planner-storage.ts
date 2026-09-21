import {
  TRIP_CATEGORIES,
  type PlannerState,
} from "@/lib/trip-planner-model";
import {
  normalizeTripItems,
  type StoredTripPlan,
  type TripItem,
} from "@/lib/trip-record";

const CHECKS_KEY = "fj.plan-a-trip.checks.v1";
const ACTIVE_KEY = "fj.plan-a-trip.active.v1";
const BACKUP_KEY = "fj.plan-a-trip.backup.v1";
const MAX_PLANS = 30;

export type StoredPlan = StoredTripPlan;

export type { TripItem };

/** Server/hydration snapshot. The client snapshot replaces it after hydrate. */
export const PENDING_PLAN = { pending: true } as const;
export type PendingPlan = typeof PENDING_PLAN;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Same-tab writes and other-tab storage events. */
export function subscribeTripStore(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === CHECKS_KEY ||
      event.key === ACTIVE_KEY ||
      event.key === BACKUP_KEY
    ) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const CATEGORY_SET = new Set<string>(TRIP_CATEGORIES);

export function isPlannerState(value: unknown): value is PlannerState {
  if (!value || typeof value !== "object") return false;
  const state = value as PlannerState;
  if (!Array.isArray(state.categories)) return false;
  if (!state.categories.every((cat) => CATEGORY_SET.has(cat))) return false;
  if (typeof state.unsure !== "boolean") return false;
  if (state.dateMode !== "exact" && state.dateMode !== "flexible") return false;
  if (state.tripType !== "roundtrip" && state.tripType !== "oneway") return false;
  if (typeof state.adults !== "number" || typeof state.children !== "number") {
    return false;
  }
  if (typeof state.nights !== "number" || typeof state.rooms !== "number") {
    return false;
  }
  return (
    typeof state.destination === "string" &&
    typeof state.startDate === "string" &&
    typeof state.endDate === "string" &&
    typeof state.month === "string" &&
    typeof state.origin === "string" &&
    typeof state.carPickupSameAsDestination === "boolean" &&
    typeof state.carPickupLocation === "string" &&
    typeof state.carDatesSameAsTrip === "boolean" &&
    typeof state.carPickupDate === "string" &&
    typeof state.carDropoffDate === "string"
  );
}

export function parseStoredPlan(value: unknown): StoredPlan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    step?: unknown;
    state?: unknown;
    items?: unknown;
    tripId?: unknown;
  };
  if (
    record.step !== 1 &&
    record.step !== 2 &&
    record.step !== 3 &&
    record.step !== 4
  ) {
    return null;
  }
  if (!isPlannerState(record.state)) return null;
  const tripId =
    typeof record.tripId === "string" &&
    /^[A-Za-z0-9_-]{1,128}$/.test(record.tripId.trim())
      ? record.tripId.trim()
      : null;
  return {
    step: record.step,
    state: record.state,
    items: normalizeTripItems(record.items),
    tripId,
  };
}

let activeRaw: string | null = null;
let activeSnapshot: StoredPlan | null = null;

export function getActivePlanSnapshot(): StoredPlan | null {
  const raw = browserStorage()?.getItem(ACTIVE_KEY) ?? null;
  if (raw === activeRaw) return activeSnapshot;
  activeRaw = raw;
  if (!raw) {
    activeSnapshot = null;
    return null;
  }
  try {
    activeSnapshot = parseStoredPlan(JSON.parse(raw) as unknown);
  } catch {
    activeSnapshot = null;
  }
  return activeSnapshot;
}

export function getServerActivePlan(): PendingPlan {
  return PENDING_PLAN;
}

export function isPendingPlan(
  value: StoredPlan | null | PendingPlan,
): value is PendingPlan {
  return value === PENDING_PLAN;
}

export function getChecksRaw(): string {
  return browserStorage()?.getItem(CHECKS_KEY) ?? "";
}

export function getServerChecksRaw(): string {
  return "";
}

let parsedChecksKey = "";
let parsedChecks: string[] = [];

export function checksForFingerprint(raw: string, fingerprint: string): string[] {
  const cacheKey = `${fingerprint}\n${raw}`;
  if (cacheKey === parsedChecksKey) return parsedChecks;
  parsedChecksKey = cacheKey;
  if (!raw) {
    parsedChecks = [];
    return parsedChecks;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      parsedChecks = [];
      return parsedChecks;
    }
    const list = (parsed as Record<string, unknown>)[fingerprint];
    parsedChecks = Array.isArray(list)
      ? list.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    parsedChecks = [];
  }
  return parsedChecks;
}

function readCheckMap(): Record<string, string[]> {
  const raw = getChecksRaw();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: Record<string, string[]> = {};
    for (const [fingerprint, keys] of Object.entries(parsed)) {
      if (!Array.isArray(keys)) continue;
      map[fingerprint] = keys.filter((key): key is string => typeof key === "string");
    }
    return map;
  } catch {
    return {};
  }
}

export function writeChecks(fingerprint: string, keys: string[]) {
  const map = readCheckMap();
  delete map[fingerprint];
  map[fingerprint] = [...new Set(keys)];
  const entries = Object.entries(map);
  const trimmed = entries.slice(Math.max(0, entries.length - MAX_PLANS));
  const store = browserStorage();
  if (!store) return;
  try {
    store.setItem(CHECKS_KEY, JSON.stringify(Object.fromEntries(trimmed)));
    parsedChecksKey = "";
    emit();
  } catch {
    /* private mode or quota */
  }
}

export function writeActivePlan(plan: StoredPlan) {
  const store = browserStorage();
  if (!store) return;
  try {
    const raw = JSON.stringify(plan);
    store.setItem(ACTIVE_KEY, raw);
    activeRaw = raw;
    activeSnapshot = plan;
    emit();
  } catch {
    /* private mode or quota */
  }
}

/** Keep a guest draft when a saved trip is opened over it. */
export function backupGuestDraft(plan: StoredPlan) {
  if (plan.tripId || !plan.state.destination.trim()) return;
  const store = browserStorage();
  if (!store) return;
  try {
    store.setItem(BACKUP_KEY, JSON.stringify(plan));
    emit();
  } catch {
    /* private mode or quota */
  }
}

export function readGuestBackup(): StoredPlan | null {
  const raw = browserStorage()?.getItem(BACKUP_KEY);
  if (!raw) return null;
  try {
    return parseStoredPlan(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function clearGuestBackup() {
  const store = browserStorage();
  if (!store) return;
  try {
    store.removeItem(BACKUP_KEY);
    emit();
  } catch {
    /* private mode */
  }
}
