/**
 * Stays search + book helpers. Safe to import from client components.
 * Network calls live in src/lib/liteapi.ts and stay on the server.
 */

const DEST_MAX = 80;
const HOTEL_ID_RE = /^[A-Za-z0-9_-]{2,64}$/;
const SESSION_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OFFER_ID_RE = /^[A-Za-z0-9+/=_-]{8,12000}$/;
const PREBOOK_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;
const CLIENT_REF_RE = /^fj-[0-9a-f-]{8,80}$/i;

export type StaysQuery = {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  rooms: number;
  sessionId: string;
};

export type StayMoney = {
  amount: number;
  currency: string;
};

export type StayListItem = {
  id: string;
  name: string;
  photo: string;
  rating: number | null;
  stars: number | null;
  neighborhood: string;
  city: string;
  fromPrice: StayMoney | null;
};

export type StayPhoto = {
  url: string;
  caption: string;
};

export type StayHotelContent = {
  id: string;
  name: string;
  description: string;
  photos: StayPhoto[];
  address: string;
  neighborhood: string;
  city: string;
  rating: number | null;
  stars: number | null;
  facilities: string[];
  checkIn: string;
  checkOut: string;
};

export type StayRefundable = "refundable" | "non-refundable" | "unknown";

export type StayRoomOffer = {
  offerId: string;
  name: string;
  boardName: string;
  refundable: StayRefundable;
  price: StayMoney | null;
  remarks: string;
};

export type StayPrebook = {
  prebookId: string;
  hotelId: string;
  currency: string;
  price: number | null;
  priceDifferencePercent: number;
  cancellationChanged: boolean;
  boardChanged: boolean;
  roomName: string;
  boardName: string;
  refundable: StayRefundable;
  remarks: string;
  checkin: string;
  checkout: string;
};

export type StayBooking = {
  bookingId: string;
  status: string;
  hotelConfirmationCode: string;
  hotelName: string;
  checkin: string;
  checkout: string;
  currency: string;
  price: number | null;
};

export type StayGuest = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type StayOccupancy = {
  adults: number;
  children?: number[];
};

const CHILD_AGE = 10;

export function cleanStayDestination(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DEST_MAX);
}

export function cleanStayDate(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) return "";
  const back = new Date(parsed).toISOString().slice(0, 10);
  return back === value ? value : "";
}

function cleanPositive(raw: string, fallback: number, max: number): number {
  if (!/^\d{1,2}$/.test(raw)) return fallback;
  const count = Number(raw);
  if (count < 1 || count > max) return fallback;
  return count;
}

function cleanChildren(raw: string): number {
  if (!raw) return 0;
  if (!/^\d{1,2}$/.test(raw)) return 0;
  const count = Number(raw);
  if (count < 0 || count > 8) return 0;
  return count;
}

function firstParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseStaysSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): StaysQuery {
  const startDate = cleanStayDate(
    firstParam(searchParams, "start") ||
      firstParam(searchParams, "startDate") ||
      firstParam(searchParams, "checkin"),
  );
  let endDate = cleanStayDate(
    firstParam(searchParams, "end") ||
      firstParam(searchParams, "endDate") ||
      firstParam(searchParams, "checkout"),
  );
  if (startDate && endDate && endDate <= startDate) endDate = "";
  const sessionRaw = firstParam(searchParams, "session").trim();
  return {
    destination: cleanStayDestination(
      firstParam(searchParams, "dest") ||
        firstParam(searchParams, "destination"),
    ),
    startDate,
    endDate,
    adults: cleanPositive(
      firstParam(searchParams, "adults") || firstParam(searchParams, "travelers"),
      2,
      16,
    ),
    children: cleanChildren(firstParam(searchParams, "children")),
    rooms: cleanPositive(firstParam(searchParams, "rooms"), 1, 8),
    sessionId: SESSION_RE.test(sessionRaw) ? sessionRaw.toLowerCase() : "",
  };
}

export function staysPath(input: {
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  adults?: number | string | null;
  children?: number | string | null;
  rooms?: number | string | null;
  sessionId?: string | null;
}): string {
  const query = parseStaysSearchParams({
    dest: input.destination ?? "",
    start: input.startDate ?? "",
    end: input.endDate ?? "",
    adults:
      input.adults == null || input.adults === ""
        ? undefined
        : String(input.adults),
    children:
      input.children == null || input.children === ""
        ? undefined
        : String(input.children),
    rooms:
      input.rooms == null || input.rooms === "" ? undefined : String(input.rooms),
    session: input.sessionId ?? "",
  });
  if (!query.destination) return "/stays";
  return `/stays?${staysQueryString(query)}`;
}

export function staysHotelPath(hotelId: string, query: StaysQuery): string {
  const id = hotelId.trim();
  if (!isStayHotelId(id)) return staysPath(query);
  const params = staysQueryString(query);
  return params ? `/stays/${id}?${params}` : `/stays/${id}`;
}

export function staysQueryString(query: StaysQuery): string {
  const params = new URLSearchParams();
  if (query.destination) params.set("dest", query.destination);
  if (query.startDate) params.set("start", query.startDate);
  if (query.endDate) params.set("end", query.endDate);
  if (query.adults) params.set("adults", String(query.adults));
  if (query.children > 0) params.set("children", String(query.children));
  if (query.rooms > 1) params.set("rooms", String(query.rooms));
  if (query.sessionId) params.set("session", query.sessionId);
  return params.toString();
}

export function isStayHotelId(hotelId: string): boolean {
  return HOTEL_ID_RE.test(hotelId);
}

export function isStayOfferId(offerId: string): boolean {
  return OFFER_ID_RE.test(offerId);
}

export function isStayPrebookId(prebookId: string): boolean {
  return PREBOOK_ID_RE.test(prebookId);
}

export function isStayClientReference(value: string): boolean {
  return CLIENT_REF_RE.test(value);
}

/** UTC calendar day, shifted back so a traveler just west of UTC is not blocked. */
export function staysEarliestCheckin(now = new Date()): string {
  return new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function stayNights(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

/** Null when the query can be sent to Nuitee. */
export function staysQueryIssue(query: StaysQuery, now = new Date()): string | null {
  if (!query.destination) return "Add a destination.";
  if (!query.startDate || !query.endDate) return "Add check-in and check-out.";
  if (query.endDate <= query.startDate) {
    return "Check-out has to be after check-in.";
  }
  const nights = stayNights(query.startDate, query.endDate);
  if (nights < 1) return "Check-out has to be after check-in.";
  if (nights > 30) return "Search up to 30 nights at a time.";
  if (query.startDate < staysEarliestCheckin(now)) {
    return "Those dates have already passed.";
  }
  if (query.rooms > query.adults) {
    return "Add at least one adult per room.";
  }
  return null;
}

/**
 * One occupancy per room. Extra adults spill onto the first rooms.
 * Children are priced as age 10 and stay with the first room — the
 * planner only collects a count, not ages.
 */
export function stayOccupancies(query: Pick<StaysQuery, "adults" | "children" | "rooms">): StayOccupancy[] {
  const rooms = Math.min(query.adults, Math.max(1, query.rooms));
  const adults = Math.max(rooms, query.adults);
  const base = Math.floor(adults / rooms);
  let extra = adults % rooms;
  const occupancies: StayOccupancy[] = [];
  for (let index = 0; index < rooms; index += 1) {
    const occupancy: StayOccupancy = {
      adults: base + (extra > 0 ? 1 : 0),
    };
    if (extra > 0) extra -= 1;
    if (index === 0 && query.children > 0) {
      occupancy.children = Array.from({ length: query.children }, () => CHILD_AGE);
    }
    occupancies.push(occupancy);
  }
  return occupancies;
}

export function formatStayMoney(money: StayMoney | null | undefined): string {
  if (!money || !Number.isFinite(money.amount)) return "";
  const currency = /^[A-Z]{3}$/.test(money.currency) ? money.currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: money.amount % 1 === 0 ? 0 : 2,
    }).format(money.amount);
  } catch {
    return `${money.amount.toFixed(2)} ${currency}`;
  }
}

export function formatStayRating(rating: number | null): string {
  if (rating == null || !Number.isFinite(rating)) return "";
  const rounded = Math.round(rating * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return rating > 5 ? `${text} / 10` : text;
}

export function plainStayText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function httpsUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function moneyFrom(value: unknown): StayMoney | null {
  const record = asRecord(value);
  if (!record) return null;
  const amount = numberOrNull(record.amount);
  const currency = text(record.currency, 3).toUpperCase();
  if (amount == null || amount < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  return { amount, currency };
}

function firstMoney(value: unknown): StayMoney | null {
  for (const item of asArray(value)) {
    const money = moneyFrom(item);
    if (money) return money;
  }
  return null;
}

function offerPrice(roomType: Record<string, unknown>): StayMoney | null {
  const offer = firstMoney(roomType.offerRetailRate);
  if (offer) return offer;
  for (const rate of asArray(roomType.rates)) {
    const record = asRecord(rate);
    const total = firstMoney(asRecord(record?.retailRate)?.total);
    if (total) return total;
  }
  return null;
}

function refundableOf(rate: Record<string, unknown> | null): StayRefundable {
  const policies = asRecord(rate?.cancellationPolicies);
  const tag = text(policies?.refundableTag, 8).toUpperCase();
  if (tag === "RFN") return "refundable";
  if (tag === "NRFN") return "non-refundable";
  return "unknown";
}

function neighborhoodOf(hotel: Record<string, unknown>): string {
  const locationType = text(hotel.location_type, 80);
  const city = text(hotel.city_name ?? hotel.city, 80);
  if (locationType && !/^(city|hotel|locality)$/i.test(locationType)) {
    return locationType;
  }
  const address = text(hotel.address, 180);
  if (address) {
    const first = address.split(",")[0]?.trim() ?? "";
    if (first && first.toLowerCase() !== city.toLowerCase()) return first.slice(0, 80);
  }
  return city;
}

export function mapStaySearch(payload: unknown): StayListItem[] {
  const root = asRecord(payload);
  if (!root) return [];
  const hotels = new Map<string, Record<string, unknown>>();
  for (const hotel of asArray(root.hotels)) {
    const record = asRecord(hotel);
    const id = text(record?.id, 64);
    if (record && id) hotels.set(id, record);
  }

  const cards: StayListItem[] = [];
  for (const row of asArray(root.data)) {
    const record = asRecord(row);
    const id = text(record?.hotelId, 64);
    if (!record || !isStayHotelId(id)) continue;
    const hotel = hotels.get(id) ?? {};
    let fromPrice: StayMoney | null = null;
    for (const roomType of asArray(record.roomTypes)) {
      const room = asRecord(roomType);
      if (!room) continue;
      const price = offerPrice(room);
      if (!price) continue;
      if (!fromPrice || price.amount < fromPrice.amount) fromPrice = price;
    }
    const name = text(hotel.name, 160) || "Hotel";
    cards.push({
      id,
      name,
      photo: httpsUrl(hotel.main_photo) || httpsUrl(hotel.thumbnail),
      rating: numberOrNull(hotel.rating),
      stars: numberOrNull(hotel.stars ?? hotel.starRating),
      neighborhood: neighborhoodOf(hotel),
      city: text(hotel.city_name ?? hotel.city, 80),
      fromPrice,
    });
  }

  cards.sort((a, b) => {
    if (a.fromPrice && b.fromPrice) return a.fromPrice.amount - b.fromPrice.amount;
    if (a.fromPrice) return -1;
    if (b.fromPrice) return 1;
    return a.name.localeCompare(b.name);
  });
  return cards;
}

function facilityName(value: unknown): string {
  if (typeof value === "string") return text(value, 80);
  const record = asRecord(value);
  return text(record?.name ?? record?.facility, 80);
}

function photoFrom(value: unknown): StayPhoto | null {
  if (typeof value === "string") {
    const url = httpsUrl(value);
    return url ? { url, caption: "" } : null;
  }
  const record = asRecord(value);
  if (!record) return null;
  const url = httpsUrl(record.urlHd) || httpsUrl(record.url) || httpsUrl(record.image);
  if (!url) return null;
  return { url, caption: text(record.caption ?? record.alt, 120) };
}

export function mapHotelContent(
  payload: unknown,
  fallbackId: string,
): StayHotelContent | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const id = text(data.id ?? data.hotelId, 64) || fallbackId;
  if (!isStayHotelId(id)) return null;
  const name = text(data.name, 160);
  if (!name) return null;
  const times = asRecord(data.checkinCheckoutTimes);
  const photos: StayPhoto[] = [];
  const seen = new Set<string>();
  const main = httpsUrl(data.main_photo);
  if (main) {
    photos.push({ url: main, caption: name });
    seen.add(main);
  }
  for (const image of asArray(data.hotelImages ?? data.images)) {
    const photo = photoFrom(image);
    if (!photo || seen.has(photo.url)) continue;
    seen.add(photo.url);
    photos.push(photo);
    if (photos.length >= 8) break;
  }
  const facilities: string[] = [];
  for (const facility of asArray(data.facilities ?? data.hotelFacilities)) {
    const label = facilityName(facility);
    if (!label || facilities.includes(label)) continue;
    facilities.push(label);
    if (facilities.length >= 16) break;
  }
  const description = plainStayText(
    text(data.hotelDescription ?? data.description, 4000),
  ).slice(0, 1400);
  return {
    id,
    name,
    description,
    photos,
    address: text(data.address, 180),
    neighborhood: neighborhoodOf(data),
    city: text(data.city ?? data.city_name, 80),
    rating: numberOrNull(data.rating),
    stars: numberOrNull(data.starRating ?? data.stars),
    facilities,
    checkIn: text(times?.checkin ?? times?.checkinStart, 40),
    checkOut: text(times?.checkout ?? times?.checkoutEnd, 40),
  };
}

export function mapRoomOffers(payload: unknown): StayRoomOffer[] {
  const root = asRecord(payload);
  if (!root) return [];
  const offers: StayRoomOffer[] = [];
  const seen = new Set<string>();
  for (const row of asArray(root.data)) {
    const hotel = asRecord(row);
    for (const roomType of asArray(hotel?.roomTypes)) {
      const room = asRecord(roomType);
      const offerId = text(room?.offerId, 12000);
      if (!room || !isStayOfferId(offerId) || seen.has(offerId)) continue;
      const rate = asRecord(asArray(room.rates)[0]);
      const name = text(rate?.name ?? room.name, 160) || "Room";
      seen.add(offerId);
      offers.push({
        offerId,
        name,
        boardName: text(rate?.boardName, 80),
        refundable: refundableOf(rate),
        price: offerPrice(room),
        remarks: plainStayText(text(rate?.remarks, 800)).slice(0, 320),
      });
    }
  }
  offers.sort((a, b) => {
    if (a.price && b.price) return a.price.amount - b.price.amount;
    if (a.price) return -1;
    if (b.price) return 1;
    return a.name.localeCompare(b.name);
  });
  return offers;
}

export function mapPrebook(payload: unknown): StayPrebook | null {
  const data = asRecord(asRecord(payload)?.data);
  if (!data) return null;
  const prebookId = text(data.prebookId, 128);
  if (!isStayPrebookId(prebookId)) return null;
  const room = asRecord(asArray(data.roomTypes)[0]);
  const rate = asRecord(asArray(room?.rates)[0]);
  const diff = numberOrNull(data.priceDifferencePercent) ?? 0;
  return {
    prebookId,
    hotelId: text(data.hotelId, 64),
    currency: text(data.currency, 3).toUpperCase() || "USD",
    price: numberOrNull(data.price),
    priceDifferencePercent: diff,
    cancellationChanged: data.cancellationChanged === true,
    boardChanged: data.boardChanged === true,
    roomName: text(rate?.name, 160),
    boardName: text(rate?.boardName, 80),
    refundable: refundableOf(rate),
    remarks: plainStayText(text(rate?.remarks, 800)).slice(0, 320),
    checkin: cleanStayDate(text(data.checkin, 10)),
    checkout: cleanStayDate(text(data.checkout, 10)),
  };
}

export function mapBooking(payload: unknown): StayBooking | null {
  const data = asRecord(asRecord(payload)?.data) ?? asRecord(payload);
  if (!data) return null;
  const bookingId = text(data.bookingId ?? data.id, 80);
  if (!bookingId) return null;
  const hotel = asRecord(data.hotel);
  const price = numberOrNull(data.price) ?? numberOrNull(asRecord(data.bookedPrice)?.amount);
  return {
    bookingId,
    status: text(data.status, 40) || "CONFIRMED",
    hotelConfirmationCode: text(
      data.hotelConfirmationCode ?? data.confirmationCode ?? data.reference,
      40,
    ),
    hotelName: text(hotel?.name ?? data.hotelName, 160),
    checkin: cleanStayDate(text(data.checkin, 10)),
    checkout: cleanStayDate(text(data.checkout, 10)),
    currency: text(data.currency, 3).toUpperCase() || "USD",
    price,
  };
}

export function upstreamStayMessage(payload: unknown, fallback: string): string {
  const root = asRecord(payload);
  const nested = asRecord(root?.error);
  const raw =
    text(nested?.message, 240) ||
    text(nested?.description, 240) ||
    text(root?.message, 240) ||
    text(root?.error, 240);
  if (!raw) return fallback;
  if (/api[- ]?key|unauthorized|invalid key/i.test(raw)) {
    return "Nuitee rejected the stays key on the server.";
  }
  return raw;
}

export function parseStayGuest(value: unknown): StayGuest | null {
  const record = asRecord(value);
  if (!record) return null;
  const firstName = personName(record.firstName);
  const lastName = personName(record.lastName);
  const email = text(record.email, 120);
  const phone = text(record.phone, 24).replace(/[^\d+]/g, "");
  if (!firstName || !lastName) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return { firstName, lastName, email, phone };
}

function personName(value: unknown): string {
  const name = text(value, 40);
  if (!/^[\p{L}][\p{L}'’ .-]{0,39}$/u.test(name)) return "";
  return name;
}

export function refundableLabel(value: StayRefundable): string {
  if (value === "refundable") return "Refundable";
  if (value === "non-refundable") return "Non-refundable";
  return "Cancellation varies";
}
