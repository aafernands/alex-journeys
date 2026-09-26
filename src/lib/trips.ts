/**
 * Reader trips — Cloud Firestore subcollection:
 *   users/{userId}/trips/{tripId}
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  bookedChecklist,
  normalizeTripItems,
  parseTripWrite,
  savedTripLimit,
  tripCapacityMessage,
  type TripItem,
  type TripRecord,
  type TripWrite,
} from "@/lib/trip-record";

export class TripsUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "TripsUnavailableError";
  }
}

export class TripLimitError extends Error {
  readonly member: boolean;
  readonly limit: number;
  constructor(member = false, message?: string) {
    super(message ?? tripCapacityMessage(Number.POSITIVE_INFINITY, member) ?? "Too many trips.");
    this.name = "TripLimitError";
    this.member = member;
    this.limit = savedTripLimit(member);
  }
}

/**
 * Premium check used when the caller did not already resolve membership.
 * Any failure counts as a free reader, so the smaller limit applies.
 */
async function memberForLimit(userId: string): Promise<boolean> {
  try {
    const [{ getMembership }, { isPremium }] = await Promise.all([
      import("@/lib/membership-store"),
      import("@/lib/membership"),
    ]);
    return isPremium({ membership: await getMembership(userId) });
  } catch (err) {
    console.warn("[trips] membership lookup failed; using the free limit:", err);
    return false;
  }
}

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new TripsUnavailableError();
  }
  const db = getFirestoreDb();
  if (!db) {
    throw new TripsUnavailableError();
  }
  return db;
}

function tripsCollection(userId: string) {
  return requireDb().collection("users").doc(sanitizeUserId(userId)).collection("trips");
}

export function sanitizeUserId(userId: string): string {
  const id = userId.trim();
  if (!id || id.includes("/") || id.length > 256) {
    throw new Error("Invalid user id.");
  }
  return id;
}

export function sanitizeTripId(tripId: string): string {
  const id = tripId.trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new Error("Invalid trip id.");
  }
  return id;
}

function isoTimestamp(value: unknown, fallback: string): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return fallback;
}

function recordFromData(
  id: string,
  data: Record<string, unknown> | undefined,
): TripRecord | null {
  if (!data) return null;
  const parsed = parseTripWrite(data);
  if (!parsed.ok) return null;
  const now = new Date().toISOString();
  const checklist = Array.isArray(data.checklist)
    ? data.checklist.filter((entry): entry is string => typeof entry === "string")
    : bookedChecklist(parsed.data.items);
  return {
    id,
    ...parsed.data,
    checklist,
    createdAt: isoTimestamp(data.createdAt, now),
    updatedAt: isoTimestamp(data.updatedAt, now),
  };
}

function firestorePayload(write: TripWrite, createdAt: string, updatedAt: string) {
  const items: TripItem[] = normalizeTripItems(write.items);
  return {
    title: write.title,
    destination: write.destination,
    dateMode: write.dateMode,
    startDate: write.startDate,
    endDate: write.endDate,
    month: write.month,
    nights: write.nights,
    adults: write.adults,
    children: write.children,
    categories: write.categories,
    origin: write.origin,
    tripType: write.tripType,
    rooms: write.rooms,
    carPickupSameAsDestination: write.carPickupSameAsDestination,
    carPickupLocation: write.carPickupLocation,
    carDatesSameAsTrip: write.carDatesSameAsTrip,
    carPickupDate: write.carPickupDate,
    carDropoffDate: write.carDropoffDate,
    unsure: write.unsure,
    packingNotes: write.packingNotes,
    items,
    checklist: bookedChecklist(items),
    createdAt,
    updatedAt,
  };
}

/** List trips for a user, newest first. */
export async function listTrips(userId: string): Promise<TripRecord[]> {
  const snap = await tripsCollection(userId).orderBy("updatedAt", "desc").get();
  const trips: TripRecord[] = [];
  for (const doc of snap.docs) {
    const trip = recordFromData(doc.id, doc.data() as Record<string, unknown>);
    if (trip) trips.push(trip);
  }
  return trips;
}

export async function getTrip(
  userId: string,
  tripId: string,
): Promise<TripRecord | null> {
  const id = sanitizeTripId(tripId);
  const doc = await tripsCollection(userId).doc(id).get();
  if (!doc.exists) return null;
  return recordFromData(doc.id, (doc.data() ?? {}) as Record<string, unknown>);
}

/**
 * Create a trip. The saved-trip limit is enforced here, on the server, for
 * every caller: 5 for free readers, 200 for Premium members. Pass `member`
 * when the caller already looked it up; otherwise it is read from Firestore.
 */
export async function createTrip(
  userId: string,
  write: TripWrite,
  options: { member?: boolean } = {},
): Promise<TripRecord> {
  const member =
    typeof options.member === "boolean" ? options.member : await memberForLimit(userId);
  const counted = await tripsCollection(userId).count().get();
  const capacity = tripCapacityMessage(counted.data().count, member);
  if (capacity) throw new TripLimitError(member, capacity);

  const now = new Date().toISOString();
  const ref = tripsCollection(userId).doc();
  const payload = firestorePayload(write, now, now);
  await ref.set(payload);
  return {
    id: ref.id,
    ...write,
    items: payload.items,
    checklist: payload.checklist,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTrip(
  userId: string,
  tripId: string,
  write: TripWrite,
): Promise<TripRecord | null> {
  const id = sanitizeTripId(tripId);
  const ref = tripsCollection(userId).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const existingData = existing.data() as Record<string, unknown> | undefined;
  const createdAt = isoTimestamp(existingData?.createdAt, new Date().toISOString());
  const updatedAt = new Date().toISOString();
  const payload = firestorePayload(write, createdAt, updatedAt);
  await ref.set(payload);
  return {
    id,
    ...write,
    items: payload.items,
    checklist: payload.checklist,
    createdAt,
    updatedAt,
  };
}

/** Rename a trip the reader owns. Other fields stay as stored. */
export async function renameTrip(
  userId: string,
  tripId: string,
  title: string,
): Promise<TripRecord | null> {
  const id = sanitizeTripId(tripId);
  const ref = tripsCollection(userId).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const updatedAt = new Date().toISOString();
  await ref.update({ title, updatedAt });
  return recordFromData(id, {
    ...(existing.data() as Record<string, unknown>),
    title,
    updatedAt,
  });
}

/** Remove a trip. Idempotent. Ownership is the `users/{userId}` path. */
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  const id = sanitizeTripId(tripId);
  const { deleteTripInbound } = await import("@/lib/inbound-store");
  await deleteTripInbound(userId, id);
  await tripsCollection(userId).doc(id).delete();
}
