/**
 * Reader saved hotels — Cloud Firestore subcollection:
 *   users/{userId}/savedHotels/{hotelId}
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";

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

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
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

export async function listSavedHotels(userId: string): Promise<SavedHotel[]> {
  const uid = cleanUserId(userId);
  const snap = await collection(uid).orderBy("savedAt", "desc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    const hotelId = cleanHotelId(typeof data.hotelId === "string" ? data.hotelId : doc.id);
    const savedAt =
      typeof data.savedAt === "string"
        ? data.savedAt
        : data.savedAt?.toDate?.()?.toISOString?.() ?? new Date(0).toISOString();
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
    };
  });
}

export async function addSavedHotel(
  userId: string,
  input: Omit<SavedHotel, "savedAt" | "href">,
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
  const destination = city || neighborhood || name;
  const params = new URLSearchParams();
  if (destination) params.set("dest", destination);
  const href = `/stays/${hotelId}${params.size ? `?${params.toString()}` : ""}`;
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
  };
  await collection(uid).doc(hotelId).set(record, { merge: true });
  return record;
}

export async function removeSavedHotel(userId: string, hotelId: string): Promise<void> {
  const uid = cleanUserId(userId);
  const id = cleanHotelId(hotelId);
  await collection(uid).doc(id).delete();
}
