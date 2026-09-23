/**
 * Reader saved hotels — Cloud Firestore subcollection:
 *   users/{userId}/savedHotels/{hotelId}
 *
 * Saving is account-only. A saved hotel is also attached to one account trip:
 * - use the current trip when one is supplied;
 * - otherwise reuse a trip for the same destination;
 * - otherwise create one lightweight trip for that destination.
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import { createTripItem, planATripHref, type TripRecord, type TripWrite } from "@/lib/trip-record";
import { createTrip, getTrip, listTrips, updateTrip } from "@/lib/trips";

export type SavedHotel = {
  hotelId: string;
  name: string;
  city: string;
  neighborhood: string;
  photo: string;
  rating: number | null;
  stars: number | null;
  savedAt: string;
  href: string;
  tripId: string;
  tripHref: string;
};

export type SaveHotelContext = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  tripId?: string;
};

export class SavedHotelsUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "SavedHotelsUnavailableError";
  }
}

function requireDb() {
  if (!isFirebaseConfigured()) throw new SavedHotelsUnavailableError();
  const db = getFirestoreDb();
  if (!db) throw new SavedHotelsUnavailableError();
  return db;
}

function collection(userId: string) {
  return requireDb().collection("users").doc(userId).collection("savedHotels");
}

function cleanUserId(value: string) {
  const id = value.trim();
  if (!id || id.includes("/") || id.length > 256) throw new Error("Invalid user id.");
  return id;
}

function cleanHotelId(value: string) {
  const id = value.trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(id)) throw new Error("Invalid hotel id.");
  return id;
}

function cleanTripId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value.trim())
    ? value.trim()
    : "";
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanDate(value: unknown) {
  if (typeof value !== "string") return "";
  const date = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    ? date
    : "";
}

function cleanCount(value: unknown, fallback: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(max, Math.trunc(n)));
}

function cleanHttps(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function cleanNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizePlace(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameDestination(a: string, b: string) {
  const left = normalizePlace(a);
  const right = normalizePlace(b);
  return Boolean(left && right && left === right);
}

function hotelHref(hotelId: string, destination: string, context: SaveHotelContext) {
  const params = new URLSearchParams();
  if (destination) params.set("dest", destination);
  const startDate = cleanDate(context.startDate);
  const endDate = cleanDate(context.endDate);
  if (startDate) params.set("start", startDate);
  if (endDate) params.set("end", endDate);
  const adults = Math.max(1, cleanCount(context.adults, 2, 30));
  const children = cleanCount(context.children, 0, 30);
  const rooms = Math.max(1, cleanCount(context.rooms, 1, 30));
  params.set("adults", String(adults));
  if (children > 0) params.set("children", String(children));
  if (rooms > 1) params.set("rooms", String(rooms));
  return `/stays/${hotelId}${params.size ? `?${params.toString()}` : ""}`;
}

function savedHotelFromDoc(doc: { id: string; data(): Record<string, any> }): SavedHotel {
  const data = doc.data();
  const hotelId = cleanHotelId(typeof data.hotelId === "string" ? data.hotelId : doc.id);
  const savedAt =
    typeof data.savedAt === "string"
      ? data.savedAt
      : data.savedAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString();
  const tripId = cleanTripId(data.tripId);
  return {
    hotelId,
    name: cleanText(data.name, 160) || "Hotel",
    city: cleanText(data.city, 80),
    neighborhood: cleanText(data.neighborhood, 80),
    photo: cleanHttps(data.photo),
    rating: cleanNumber(data.rating),
    stars: cleanNumber(data.stars),
    savedAt,
    href:
      typeof data.href === "string" && data.href.startsWith("/stays/")
        ? data.href
        : `/stays/${hotelId}`,
    tripId,
    tripHref: tripId ? planATripHref(tripId) : "",
  };
}

export async function listSavedHotels(userId: string): Promise<SavedHotel[]> {
  const uid = cleanUserId(userId);
  const snap = await collection(uid).orderBy("savedAt", "desc").get();
  return snap.docs.map((doc) => savedHotelFromDoc(doc as never));
}

async function getSavedHotel(userId: string, hotelId: string): Promise<SavedHotel | null> {
  const uid = cleanUserId(userId);
  const id = cleanHotelId(hotelId);
  const doc = await collection(uid).doc(id).get();
  if (!doc.exists) return null;
  return savedHotelFromDoc(doc as never);
}

function buildDraftTrip(destination: string, context: SaveHotelContext, hotelName: string, href: string): TripWrite {
  const startDate = cleanDate(context.startDate);
  const endDate = cleanDate(context.endDate);
  const nights =
    startDate && endDate
      ? Math.max(
          0,
          Math.round(
            (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
              86_400_000,
          ),
        )
      : 0;
  return {
    title: destination,
    destination,
    dateMode: "exact",
    startDate,
    endDate,
    month: "",
    nights,
    adults: Math.max(1, cleanCount(context.adults, 2, 30)),
    children: cleanCount(context.children, 0, 30),
    categories: ["hotel"],
    origin: "",
    tripType: "roundtrip",
    rooms: Math.max(1, cleanCount(context.rooms, 1, 30)),
    carPickupSameAsDestination: true,
    carPickupLocation: "",
    carDatesSameAsTrip: true,
    carPickupDate: "",
    carDropoffDate: "",
    unsure: false,
    items: [
      createTripItem({
        type: "hotel",
        title: hotelName,
        url: href,
        notes: "Saved hotel",
        status: "todo",
        laneKey: "hotel",
        sortOrder: 0,
      }),
    ],
    packingNotes: "",
  };
}

function mergeSavedHotelIntoTrip(trip: TripRecord, hotelName: string, href: string): TripWrite {
  const exists = trip.items.some(
    (item) =>
      item.type === "hotel" &&
      (item.url === href || item.title.trim().toLowerCase() === hotelName.trim().toLowerCase()),
  );
  return {
    ...trip,
    categories: trip.categories.includes("hotel")
      ? trip.categories
      : [...trip.categories, "hotel"],
    items: exists
      ? trip.items
      : [
          ...trip.items,
          createTripItem({
            type: "hotel",
            title: hotelName,
            url: href,
            notes: "Saved hotel",
            status: "todo",
            laneKey: "hotel",
            sortOrder:
              trip.items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1,
          }),
        ],
  };
}

async function ensureTripForSavedHotel(
  userId: string,
  input: {
    hotelId: string;
    name: string;
    city: string;
    neighborhood: string;
    href: string;
  },
  context: SaveHotelContext,
): Promise<TripRecord> {
  const preferredTripId = cleanTripId(context.tripId);
  if (preferredTripId) {
    const current = await getTrip(userId, preferredTripId);
    if (current) {
      const updated = await updateTrip(
        userId,
        current.id,
        mergeSavedHotelIntoTrip(current, input.name, input.href),
      );
      if (updated) return updated;
    }
  }

  const destination =
    cleanText(context.destination, 160) ||
    cleanText(input.city, 80) ||
    cleanText(input.neighborhood, 80) ||
    input.name;

  const trips = await listTrips(userId);
  const matching =
    trips.find((trip) =>
      trip.items.some((item) => item.type === "hotel" && item.url === input.href),
    ) ?? trips.find((trip) => sameDestination(trip.destination, destination));

  if (matching) {
    const updated = await updateTrip(
      userId,
      matching.id,
      mergeSavedHotelIntoTrip(matching, input.name, input.href),
    );
    if (updated) return updated;
  }

  return createTrip(userId, buildDraftTrip(destination, context, input.name, input.href));
}

export async function addSavedHotel(
  userId: string,
  input: Omit<SavedHotel, "savedAt" | "href" | "tripId" | "tripHref">,
  context: SaveHotelContext = {},
): Promise<SavedHotel> {
  const uid = cleanUserId(userId);
  const hotelId = cleanHotelId(input.hotelId);
  const name = cleanText(input.name, 160);
  if (!name) throw new Error("Missing hotel name.");
  const city = cleanText(input.city, 80);
  const neighborhood = cleanText(input.neighborhood, 80);
  const photo = cleanHttps(input.photo);
  const rating = cleanNumber(input.rating);
  const stars = cleanNumber(input.stars);
  const savedAt = new Date().toISOString();
  const destination = cleanText(context.destination, 160) || city || neighborhood || name;
  const href = hotelHref(hotelId, destination, context);
  const trip = await ensureTripForSavedHotel(
    uid,
    { hotelId, name, city, neighborhood, href },
    context,
  );
  const record: SavedHotel = {
    hotelId,
    name,
    city,
    neighborhood,
    photo,
    rating,
    stars,
    savedAt,
    href,
    tripId: trip.id,
    tripHref: planATripHref(trip.id),
  };
  await collection(uid).doc(hotelId).set(record, { merge: true });
  return record;
}

export async function removeSavedHotel(userId: string, hotelId: string): Promise<void> {
  const uid = cleanUserId(userId);
  const id = cleanHotelId(hotelId);
  const saved = await getSavedHotel(uid, id);

  if (saved?.tripId) {
    const trip = await getTrip(uid, saved.tripId);
    if (trip) {
      const items = trip.items.filter(
        (item) =>
          !(
            item.type === "hotel" &&
            (item.url === saved.href ||
              item.title.trim().toLowerCase() === saved.name.trim().toLowerCase())
          ),
      );
      if (items.length !== trip.items.length) {
        await updateTrip(uid, trip.id, { ...trip, items });
      }
    }
  }

  await collection(uid).doc(id).delete();
}
