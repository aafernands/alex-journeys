/**
 * Flights search + book helpers. Safe to import from client components.
 * Network calls live in src/lib/flights-service.ts and stay on the server.
 */

const PLACE_MAX = 80;
const OFFER_ID_RE = /^[A-Za-z0-9+/=_-]{8,8000}$/;
const PREBOOK_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;
const TRIP_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const BOOKING_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const NAME_RE = /^[\p{L}][\p{L}'’ .-]{0,39}$/u;

export const FLIGHT_CABINS = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;
export type FlightCabin = (typeof FLIGHT_CABINS)[number];

export const FLIGHT_CABIN_LABEL: Record<FlightCabin, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium economy",
  BUSINESS: "Business",
  FIRST: "First",
};

export type FlightTripType = "roundtrip" | "oneway";

export type FlightsQuery = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType: FlightTripType;
  adults: number;
  children: number;
  cabin: FlightCabin;
  tripId: string;
};

export type FlightMoney = {
  amount: number;
  currency: string;
};

export type FlightSegmentView = {
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  direction: string;
  durationMinutes: number;
  flightNumber: string;
  carrierName: string;
  carrierCode: string;
};

export type FlightOffer = {
  offerId: string;
  journeyKey: string;
  airline: string;
  airlineCode: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  outboundStops: number;
  returnStops: number;
  durationMinutes: number;
  price: FlightMoney | null;
  cabin: string;
  refundable: boolean | null;
  changeable: boolean | null;
  baggage: string;
  conditions: string[];
  seatsRemaining: number | null;
  cheapest: boolean;
  segments: FlightSegmentView[];
};

export type FlightPriceChange = {
  oldTotal: number | null;
  newTotal: number | null;
  currency: string;
  messages: string[];
};

export type FlightAirport = {
  code: string;
  label: string;
};

/** Stripe credentials from a Nuitee prebook. The client secret is meant for the browser. */
export type FlightCardPayment = {
  transactionId: string;
  clientSecret: string;
  publishableKey: string;
};

/**
 * Body for `POST /flights/bookings` after Stripe confirms.
 * The only method this checkout sends is `TRANSACTION_ID`.
 */
export type FlightBookingPayment = {
  method: "TRANSACTION_ID";
  transactionId: string;
};

/** Shown when prebook has no Stripe secrets, so we do not call bookings. */
export const FLIGHT_CARD_REQUIRED = "Complete card payment first";

/**
 * Shown when prebook returned a client secret but no Stripe publishable key.
 * Elements cannot mount without `pk_test_` / `pk_live_` from Nuitee.
 */
export const FLIGHT_PUBLISHABLE_KEY_MISSING =
  "Nuitee prebook did not include a Stripe publishable key, so the card form cannot load. In Nuitee Connect, enable Stripe for this API key’s environment. Prebook must return publishableKey as pk_test_ with a sand_ key, or pk_live_ in production. Those keys come from Nuitee, not your own Stripe account. If the field stays empty, use Request Assistance and ask for the publishable key for this environment.";

export type FlightPrebook = {
  prebookId: string;
  price: FlightMoney | null;
  offer: FlightOffer | null;
  payment: FlightCardPayment | null;
};

export type FlightBooking = {
  bookingId: string;
  status: string;
  bookingRef: string;
  currency: string;
  price: number | null;
  email: string;
};

export type FlightPaymentRecord = {
  method: "sandbox_account" | "guest_card";
  label: string;
};

export type FlightConfirmationDetails = {
  title: string;
  bookingId: string;
  confirmationCode: string;
  status: string;
  routeLabel: string;
  dateLabel: string;
  cabin: string;
  baggage: string;
  conditions: string[];
  totalLabel: string;
  passengerName: string;
  email: string;
  payment: FlightPaymentRecord;
  sandbox: boolean;
  departDate: string;
  departTime: string;
};

export type FlightRecovery = "back-to-search" | "retry" | "accept-price";

export type FlightFailure = {
  title: string;
  message: string;
  recovery: FlightRecovery;
};

export type FlightGender = "M" | "F";

export type FlightPassengerInput = {
  firstName: string;
  lastName: string;
  birthday: string;
  gender: FlightGender | "";
  nationality: string;
  documentNumber: string;
  documentExpiry: string;
  email: string;
  phoneCountry: string;
  phoneNumber: string;
};

export type FlightPassenger = {
  type: "ADT" | "CHD";
  passengerType: 0 | 1;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: FlightGender;
  nationality: string;
  documentType: "passport";
  documentNumber: string;
  documentIssueCountry: string;
  documentExpiry: string;
};

export type FlightContact = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
};

export type FlightParty = {
  contact: FlightContact;
  passengers: FlightPassenger[];
};

const FLIGHT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, max = 500): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function cleanFlightPlace(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLACE_MAX);
}

export function cleanFlightDate(raw: string | null | undefined): string {
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

export function cleanFlightTripId(raw: string | null | undefined): string {
  const id = raw?.trim() ?? "";
  return TRIP_ID_RE.test(id) ? id : "";
}

export function cleanFlightBookingId(raw: string | null | undefined): string {
  const id = raw?.trim() ?? "";
  return BOOKING_ID_RE.test(id) ? id : "";
}

export function cleanFlightCabin(raw: string | null | undefined): FlightCabin {
  const value = raw?.trim().toUpperCase().replace(/[\s-]+/g, "_") ?? "";
  if (value === "PREMIUM" || value === "PREMIUM_ECONOMY") return "PREMIUM_ECONOMY";
  if ((FLIGHT_CABINS as readonly string[]).includes(value)) return value as FlightCabin;
  return "ECONOMY";
}

/**
 * Three-letter code when the place is already an airport.
 * Reads “EWR”, “Newark (EWR)”, and a resolved label such as “Miami · MIA”.
 */
export function iataHint(place: string): string {
  const paren = /\(([A-Za-z]{3})\)/.exec(place);
  if (paren?.[1]) return paren[1].toUpperCase();
  const trimmed = place.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  const tail = /(?:^|[\s·|,/–—-])([A-Za-z]{3})$/.exec(trimmed);
  if (tail?.[1]) return tail[1].toUpperCase();
  return "";
}

/** Keep a msgpack offer id verbatim. Query parsers turn `+` into a space. */
export function flightOfferId(value: unknown): string {
  if (typeof value !== "string") return "";
  const restored = value.trim().replace(/ /g, "+");
  return OFFER_ID_RE.test(restored) ? restored : "";
}

/** Label shown in the search fields after a city resolves to an airport. */
export function airportFieldValue(
  typed: string,
  airport: { code: string; label: string },
): string {
  const label = airport.label.trim() || airport.code;
  if (!airport.code) return typed;
  if (iataHint(typed) === airport.code && typed.trim().toUpperCase() !== airport.code) return typed;
  return label;
}

/**
 * City names become the main airport label. A code the reader already typed
 * stays as they typed it, so IATA can override the city default.
 */
export function prefilledAirport(place: string): string {
  const typed = place.trim();
  if (!typed) return "";
  const airport = primaryAirportFor(typed);
  if (!airport) return typed;
  return airportFieldValue(typed, airport);
}

/** Text sent to the airport lookup. City names drop a trailing country. */
export function airportSearchText(place: string): string {
  const hint = iataHint(place);
  const trimmed = place.trim();
  if (hint && trimmed.toUpperCase() === hint) return hint;
  return trimmed
    .replace(/\s*\([A-Za-z]{3}\)\s*/g, " ")
    .replace(/,.*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PLACE_MAX);
}

function firstParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function cleanCount(raw: string, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  if (!/^\d{1,2}$/.test(raw)) return fallback;
  const count = Number(raw);
  if (count < min || count > max) return fallback;
  return count;
}

export function parseFlightsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): FlightsQuery {
  const startDate = cleanFlightDate(
    firstParam(searchParams, "start") || firstParam(searchParams, "startDate"),
  );
  const endDate = cleanFlightDate(
    firstParam(searchParams, "end") ||
      firstParam(searchParams, "endDate") ||
      firstParam(searchParams, "return"),
  );
  const typeRaw = firstParam(searchParams, "type").trim().toLowerCase();
  const tripType: FlightTripType =
    typeRaw === "oneway" || typeRaw === "one-way"
      ? "oneway"
      : typeRaw === "roundtrip" || typeRaw === "round-trip"
        ? "roundtrip"
        : endDate
          ? "roundtrip"
          : "oneway";
  return {
    origin: cleanFlightPlace(firstParam(searchParams, "origin") || firstParam(searchParams, "from")),
    destination: cleanFlightPlace(
      firstParam(searchParams, "dest") || firstParam(searchParams, "destination"),
    ),
    startDate,
    endDate: tripType === "oneway" ? "" : endDate,
    tripType,
    adults: cleanCount(firstParam(searchParams, "adults"), 1, 1, 9),
    children: cleanCount(firstParam(searchParams, "children"), 0, 0, 8),
    cabin: cleanFlightCabin(firstParam(searchParams, "cabin")),
    tripId: cleanFlightTripId(firstParam(searchParams, "trip")),
  };
}

export function flightsQueryString(query: FlightsQuery): string {
  const params = new URLSearchParams();
  if (query.origin) params.set("origin", query.origin);
  if (query.destination) params.set("dest", query.destination);
  if (query.startDate) params.set("start", query.startDate);
  if (query.tripType === "roundtrip" && query.endDate) params.set("end", query.endDate);
  if (query.adults) params.set("adults", String(query.adults));
  if (query.children > 0) params.set("children", String(query.children));
  if (query.cabin !== "ECONOMY") params.set("cabin", query.cabin);
  params.set("type", query.tripType);
  if (query.tripId) params.set("trip", query.tripId);
  return params.toString();
}

export function flightsPath(input: {
  origin?: string | null;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tripType?: string | null;
  adults?: number | string | null;
  children?: number | string | null;
  cabin?: string | null;
  tripId?: string | null;
}): string {
  const query = parseFlightsSearchParams({
    origin: input.origin ?? "",
    dest: input.destination ?? "",
    start: input.startDate ?? "",
    end: input.endDate ?? "",
    type: input.tripType ?? "",
    adults:
      input.adults == null || input.adults === "" ? undefined : String(input.adults),
    children:
      input.children == null || input.children === ""
        ? undefined
        : String(input.children),
    cabin: input.cabin ?? "",
    trip: input.tripId ?? "",
  });
  if (!query.origin && !query.destination) return "/flights";
  return `/flights?${flightsQueryString(query)}`;
}

export function flightsBookPath(offerId: string, query: FlightsQuery): string {
  const id = offerId.trim();
  if (!isFlightOfferId(id)) return flightsPath(query);
  const params = new URLSearchParams(flightsQueryString(query));
  params.set("offer", id);
  return `/flights/book?${params.toString()}`;
}

function sitePathname(href: string): string {
  const path = href.trim().split("?")[0]?.split("#")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

/** Search results, not a stored reservation. */
export function isFlightSearchPath(href: string): boolean {
  return sitePathname(href) === "/flights";
}

/** Confirmation for one paid booking. */
export function isFlightConfirmationPath(href: string): boolean {
  return sitePathname(href) === "/flights/confirmation";
}

/** Label for an on-site flight link. Search URLs are not “View flight”. */
export function flightItemLinkLabel(url: string): string {
  if (isFlightConfirmationPath(url)) return "View flight";
  if (isFlightSearchPath(url)) return "Search flights";
  if (sitePathname(url) === "/flights/book") return "View fare";
  return "";
}

function clockParam(raw: string): string {
  return /^\d{2}:\d{2}$/.test(raw) ? raw : "";
}

/**
 * Deep link to the reservation that was just paid.
 * Search params stay on the URL so “Search more flights” can return to the same route,
 * and the booking facts survive a refresh without sessionStorage.
 */
export function flightConfirmationPath(
  confirmation: Pick<
    FlightConfirmationDetails,
    | "bookingId"
    | "confirmationCode"
    | "title"
    | "routeLabel"
    | "dateLabel"
    | "totalLabel"
    | "cabin"
    | "baggage"
    | "status"
    | "departDate"
    | "departTime"
    | "sandbox"
  >,
  query: FlightsQuery,
): string {
  const bookingId =
    cleanFlightBookingId(confirmation.bookingId) ||
    cleanFlightBookingId(confirmation.confirmationCode);
  if (!bookingId) return "";
  const params = new URLSearchParams(flightsQueryString(query));
  params.set("booking", bookingId);
  const ref = text(confirmation.confirmationCode, 40);
  if (ref) params.set("ref", ref);
  const title = text(confirmation.title, 160);
  if (title) params.set("title", title);
  const route = text(confirmation.routeLabel, 80);
  if (route) params.set("route", route);
  const dates = text(confirmation.dateLabel, 80);
  if (dates) params.set("dates", dates);
  const total = text(confirmation.totalLabel, 40);
  if (total) params.set("total", total);
  const fare = text(confirmation.cabin, 40);
  if (fare) params.set("fare", fare);
  const bags = text(confirmation.baggage, 160);
  if (bags) params.set("bags", bags);
  const status = text(confirmation.status, 40);
  if (status) params.set("status", status);
  const depart = cleanFlightDate(confirmation.departDate);
  if (depart) params.set("depart", depart);
  const time = clockParam(confirmation.departTime);
  if (time) params.set("time", time);
  if (confirmation.sandbox) params.set("sandbox", "1");
  return `/flights/confirmation?${params.toString()}`;
}

/** Rebuild the visible reservation from the confirmation URL. Null when no booking id is present. */
export function flightConfirmationFromParams(
  searchParams: Record<string, string | string[] | undefined>,
): FlightConfirmationDetails | null {
  const bookingId = cleanFlightBookingId(firstParam(searchParams, "booking"));
  if (!bookingId) return null;
  const ref = text(firstParam(searchParams, "ref"), 40);
  const sandbox = firstParam(searchParams, "sandbox") === "1";
  const departTime = clockParam(firstParam(searchParams, "time"));
  return {
    title: text(firstParam(searchParams, "title"), 160) || "Flight",
    bookingId,
    confirmationCode: ref || bookingId,
    status: text(firstParam(searchParams, "status"), 40),
    routeLabel: text(firstParam(searchParams, "route"), 80),
    dateLabel: text(firstParam(searchParams, "dates"), 80),
    cabin: text(firstParam(searchParams, "fare"), 40),
    baggage: text(firstParam(searchParams, "bags"), 160),
    conditions: [],
    totalLabel: text(firstParam(searchParams, "total"), 40),
    passengerName: "",
    email: "",
    payment: {
      method: "guest_card",
      label: "Paid with the card confirmed through Nuitee.",
    },
    sandbox,
    departDate: cleanFlightDate(firstParam(searchParams, "depart")),
    departTime,
  };
}

export function isFlightOfferId(offerId: string): boolean {
  return OFFER_ID_RE.test(offerId);
}

export function isFlightPrebookId(prebookId: string): boolean {
  return PREBOOK_ID_RE.test(prebookId);
}

export function flightsEarliestDeparture(now = new Date()): string {
  return new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Null when the query can be sent to Nuitee. */
export function flightsQueryIssue(query: FlightsQuery, now = new Date()): string | null {
  if (!query.origin) return "Add where you’re flying from.";
  if (!query.destination) return "Add a destination.";
  if (query.origin.trim().toLowerCase() === query.destination.trim().toLowerCase()) {
    return "Origin and destination need to be different.";
  }
  if (!query.startDate) return "Add a departure date.";
  if (query.startDate < flightsEarliestDeparture(now)) return "That departure date has already passed.";
  if (query.tripType === "roundtrip") {
    if (!query.endDate) return "Add a return date.";
    if (query.endDate < query.startDate) return "Return has to be on or after departure.";
  }
  if (query.adults + query.children > 9) return "Search up to 9 passengers at a time.";
  return null;
}

export function formatFlightMoney(money: FlightMoney | null | undefined): string {
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

export function formatFlightDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

export function formatFlightClock(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return "";
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function formatFlightDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return "";
  return `${FLIGHT_MONTHS[month - 1]} ${day}`;
}

export function flightDayOffset(departure: string, arrival: string): number {
  const left = departure.slice(0, 10);
  const right = arrival.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(left) || !/^\d{4}-\d{2}-\d{2}$/.test(right)) return 0;
  const start = Date.parse(`${left}T00:00:00Z`);
  const end = Date.parse(`${right}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function stopsLabel(stops: number): string {
  if (stops <= 0) return "Nonstop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

function personName(value: unknown): string {
  const name = text(value, 40);
  if (!NAME_RE.test(name)) return "";
  return name;
}

function ageOn(birthday: string, on: string): number {
  let age = Number(on.slice(0, 4)) - Number(birthday.slice(0, 4));
  if (on.slice(5) < birthday.slice(5)) age -= 1;
  return age;
}

export function blankPassenger(lead = false): FlightPassengerInput {
  return {
    firstName: "",
    lastName: "",
    birthday: "",
    gender: "",
    nationality: "US",
    documentNumber: "",
    documentExpiry: "",
    email: "",
    phoneCountry: lead ? "1" : "",
    phoneNumber: "",
  };
}

export function flightPassengerFieldErrors(
  passenger: FlightPassengerInput,
  role: "adult" | "child",
  lead: boolean,
  departDate: string,
): Partial<Record<keyof FlightPassengerInput, string>> {
  const errors: Partial<Record<keyof FlightPassengerInput, string>> = {};
  if (!personName(passenger.firstName)) errors.firstName = "Add a first name.";
  if (!personName(passenger.lastName)) errors.lastName = "Add a last name.";
  const birthday = cleanFlightDate(passenger.birthday);
  if (!birthday) errors.birthday = "Add a date of birth.";
  else if (departDate) {
    const age = ageOn(birthday, departDate);
    if (role === "adult" && age < 12) errors.birthday = "Adults need to be 12 or older on departure.";
    if (role === "child" && (age < 2 || age > 11)) {
      errors.birthday = "Children need to be 2–11 on departure.";
    }
  }
  if (passenger.gender !== "M" && passenger.gender !== "F") errors.gender = "Choose a gender.";
  if (!/^[A-Za-z]{2}$/.test(passenger.nationality.trim())) {
    errors.nationality = "Use a two-letter country code.";
  }
  if (!/^[A-Za-z0-9]{5,20}$/.test(passenger.documentNumber.trim())) {
    errors.documentNumber = "Add the passport number.";
  }
  const expiry = cleanFlightDate(passenger.documentExpiry);
  if (!expiry) errors.documentExpiry = "Add the passport expiry.";
  else if (departDate && expiry < departDate) errors.documentExpiry = "That passport expires before departure.";
  if (lead) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passenger.email.trim())) {
      errors.email = "Add an email for the confirmation.";
    }
    if (!/^\d{1,3}$/.test(passenger.phoneCountry.trim())) {
      errors.phoneCountry = "Add a country code.";
    }
    const digits = passenger.phoneNumber.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 14) errors.phoneNumber = "Add a phone number.";
  }
  return errors;
}

export function parseFlightParty(
  value: unknown,
  adults: number,
  children: number,
  departDate: string,
): FlightParty | null {
  if (!Array.isArray(value)) return null;
  const expected = adults + children;
  if (expected < 1 || value.length !== expected) return null;
  const passengers: FlightPassenger[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const record = asRecord(value[index]);
    if (!record) return null;
    const role = index < adults ? "adult" : "child";
    const input: FlightPassengerInput = {
      firstName: text(record.firstName, 40),
      lastName: text(record.lastName, 40),
      birthday: text(record.birthday, 10),
      gender: record.gender === "M" || record.gender === "F" ? record.gender : "",
      nationality: text(record.nationality, 2),
      documentNumber: text(record.documentNumber, 20),
      documentExpiry: text(record.documentExpiry, 10),
      email: text(record.email, 120),
      phoneCountry: text(record.phoneCountry, 3),
      phoneNumber: text(record.phoneNumber, 20),
    };
    if (Object.keys(flightPassengerFieldErrors(input, role, index === 0, departDate)).length > 0) {
      return null;
    }
    const nationality = input.nationality.trim().toUpperCase();
    passengers.push({
      type: role === "adult" ? "ADT" : "CHD",
      passengerType: role === "adult" ? 0 : 1,
      firstName: personName(input.firstName),
      lastName: personName(input.lastName),
      birthday: cleanFlightDate(input.birthday),
      gender: input.gender === "F" ? "F" : "M",
      nationality,
      documentType: "passport",
      documentNumber: input.documentNumber.trim().toUpperCase(),
      documentIssueCountry: nationality,
      documentExpiry: cleanFlightDate(input.documentExpiry),
    });
  }
  const lead = value[0] && typeof value[0] === "object" ? (value[0] as FlightPassengerInput) : null;
  if (!lead) return null;
  return {
    contact: {
      firstName: passengers[0].firstName,
      lastName: passengers[0].lastName,
      email: lead.email.trim(),
      phoneCountryCode: lead.phoneCountry.trim(),
      phoneNumber: lead.phoneNumber.replace(/\D/g, ""),
    },
    passengers,
  };
}

function moneyFrom(display: Record<string, unknown> | null): FlightMoney | null {
  const amount = numberOrNull(display?.total ?? display?.amount);
  if (amount == null) return null;
  const currency = text(display?.currency, 3).toUpperCase() || "USD";
  return { amount, currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD" };
}

function durationMinutes(value: unknown): number {
  const record = asRecord(value);
  const minutes = numberOrNull(record?.minutes);
  if (minutes != null && minutes > 0) return Math.round(minutes);
  const iso = text(record?.iso8601 ?? value, 40);
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function mapSegment(value: unknown): FlightSegmentView | null {
  const record = asRecord(value);
  if (!record) return null;
  const originCode = text(record.originCode, 3).toUpperCase();
  const destinationCode = text(record.destinationCode, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(originCode) || !/^[A-Z]{3}$/.test(destinationCode)) return null;
  const carrier = asRecord(record.carrier);
  const flight = asRecord(record.flight);
  const number = text(flight?.marketingNumber, 8);
  const code = text(carrier?.marketingCode, 3).toUpperCase();
  return {
    originCode,
    originName: text(record.originName, 120),
    destinationCode,
    destinationName: text(record.destinationName, 120),
    departureTime: text(record.departureTime, 40),
    arrivalTime: text(record.arrivalTime, 40),
    direction: text(record.direction, 12).toUpperCase(),
    durationMinutes: durationMinutes(record.duration),
    flightNumber: code && number ? `${code} ${number}` : number || code,
    carrierName: text(carrier?.marketingName, 80),
    carrierCode: code,
  };
}

function stopsFor(segments: FlightSegmentView[], direction: "OUTBOUND" | "INBOUND"): number {
  const count = segments.filter((segment) => segment.direction === direction).length;
  return count > 0 ? count - 1 : 0;
}

function mapOffer(journey: Record<string, unknown>, offer: Record<string, unknown>): FlightOffer | null {
  const offerId = flightOfferId(offer.offerId);
  if (!offerId) return null;
  const segments = asArray(journey.segments)
    .map(mapSegment)
    .filter((segment): segment is FlightSegmentView => Boolean(segment));
  if (segments.length === 0) return null;
  const outbound = segments.filter((segment) => segment.direction !== "INBOUND");
  const inbound = segments.filter((segment) => segment.direction === "INBOUND");
  const first = outbound[0] ?? segments[0];
  const lastOut = outbound[outbound.length - 1] ?? first;
  const fare = asRecord(offer.fare);
  const terms = asRecord(offer.terms);
  const baggage = asRecord(offer.baggage);
  const included = asArray(baggage?.included)
    .map((item) => text(asRecord(item)?.description, 160))
    .filter(Boolean);
  const baggageLabel =
    included[0] ||
    (baggage?.hasCheckedBag === true
      ? "Checked bag included"
      : baggage?.hasCarryOnBag === true
        ? "Carry-on included"
        : "");
  const conditions = asArray(terms?.summary)
    .map((item) => text(asRecord(item)?.message ?? item, 180))
    .filter(Boolean)
    .slice(0, 4);
  const segmentFares = asArray(offer.segmentFares);
  const cabin =
    text(asRecord(segmentFares[0])?.cabin, 40) ||
    text(fare?.family, 40) ||
    "";
  const seats = numberOrNull(fare?.seatsRemaining);
  return {
    offerId,
    journeyKey: text(journey.journeyKey, 80),
    airline: first.carrierName || first.carrierCode || "Airline",
    airlineCode: first.carrierCode,
    originCode: first.originCode,
    destinationCode: lastOut.destinationCode,
    departureTime: first.departureTime,
    arrivalTime: lastOut.arrivalTime,
    returnDepartureTime: inbound[0]?.departureTime ?? "",
    returnArrivalTime: inbound[inbound.length - 1]?.arrivalTime ?? "",
    outboundStops: outbound.length > 0 ? outbound.length - 1 : stopsFor(segments, "OUTBOUND"),
    returnStops: inbound.length > 0 ? inbound.length - 1 : 0,
    durationMinutes: durationMinutes(journey.totalDuration) || first.durationMinutes,
    price: moneyFrom(asRecord(asRecord(offer.pricing)?.display)),
    cabin,
    refundable: typeof terms?.refundable === "boolean" ? terms.refundable : null,
    changeable: typeof terms?.changeable === "boolean" ? terms.changeable : null,
    baggage: baggageLabel,
    conditions,
    seatsRemaining: seats != null && seats >= 0 ? Math.round(seats) : null,
    cheapest: journey.isCheapest === true,
    segments,
  };
}

function journeysFrom(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  if (!root) return [];
  const found: Record<string, unknown>[] = [];
  const consume = (value: unknown) => {
    const record = asRecord(value);
    if (!record) return;
    if (Array.isArray(record.journeys)) {
      for (const journey of record.journeys) {
        const item = asRecord(journey);
        if (item) found.push(item);
      }
      return;
    }
    if (Array.isArray(record.segments) || Array.isArray(record.offers)) found.push(record);
  };
  const data = root.data;
  if (Array.isArray(data)) {
    if (data.length === 0) return found;
    for (const item of data) consume(item);
  } else {
    consume(data);
  }
  if (found.length === 0 && Array.isArray(root.journeys)) {
    for (const journey of root.journeys) {
      const item = asRecord(journey);
      if (item) found.push(item);
    }
  }
  return found;
}

function cheapestOffer(journey: Record<string, unknown>): FlightOffer | null {
  const offers = asArray(journey.offers)
    .map((offer) => {
      const record = asRecord(offer);
      return record ? mapOffer(journey, record) : null;
    })
    .filter((offer): offer is FlightOffer => Boolean(offer));
  if (offers.length === 0) return null;
  offers.sort((a, b) => (a.price?.amount ?? Number.POSITIVE_INFINITY) - (b.price?.amount ?? Number.POSITIVE_INFINITY));
  return offers[0];
}

/** One card per journey, using that journey’s lowest offer. */
export function mapFlightSearch(payload: unknown): FlightOffer[] {
  const offers = journeysFrom(payload)
    .map(cheapestOffer)
    .filter((offer): offer is FlightOffer => Boolean(offer));
  const lowest = offers.reduce((min, offer) => {
    const amount = offer.price?.amount;
    if (amount == null) return min;
    return Math.min(min, amount);
  }, Number.POSITIVE_INFINITY);
  return offers
    .map((offer) => ({
      ...offer,
      cheapest: offer.cheapest || (offer.price != null && offer.price.amount === lowest),
    }))
    .sort((a, b) => (a.price?.amount ?? Number.POSITIVE_INFINITY) - (b.price?.amount ?? Number.POSITIVE_INFINITY))
    .slice(0, 24);
}

function verifiedJourney(payload: unknown): {
  journey: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
} {
  const root = asRecord(payload);
  if (!root) return { journey: null, changes: null };
  const data = root.data;
  const first = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  const nested = asRecord(first?.journey) ?? asRecord(root.journey);
  const journey =
    nested ??
    (first && (Array.isArray(first.segments) || first.pricing || first.journeyKey) ? first : null);
  return { journey, changes: asRecord(first?.changes) ?? asRecord(root.changes) };
}

/**
 * Nuitee’s verify body is a journey, not a search offer.
 * Pricing, fare, baggage, and segments sit on `data[].journey`, and the
 * offer id is omitted — callers must pass the id they sent.
 */
export function mapVerifiedFlight(
  payload: unknown,
  requestedOfferId = "",
): {
  offer: FlightOffer | null;
  changes: FlightPriceChange | null;
} {
  const { journey, changes: changesRecord } = verifiedJourney(payload);
  const requested = flightOfferId(requestedOfferId);
  let offer: FlightOffer | null = null;
  if (journey) {
    const listed = asArray(journey.offers)
      .map((item) => {
        const record = asRecord(item);
        if (!record) return null;
        const id = flightOfferId(record.offerId) || requested;
        return id ? mapOffer(journey, { ...record, offerId: id }) : null;
      })
      .filter((item): item is FlightOffer => Boolean(item));
    if (listed.length > 0) {
      listed.sort(
        (a, b) =>
          (a.price?.amount ?? Number.POSITIVE_INFINITY) -
          (b.price?.amount ?? Number.POSITIVE_INFINITY),
      );
      offer = listed[0];
    } else {
      const id = flightOfferId(journey.offerId) || requested;
      if (id) {
        offer = mapOffer(journey, {
          offerId: id,
          pricing: journey.pricing,
          fare: journey.fare,
          baggage: journey.baggage,
          terms: journey.terms,
          segmentFares: journey.segmentFares,
        });
      }
    }
  }
  if (!changesRecord) return { offer, changes: null };
  const pricing = asRecord(changesRecord.pricing);
  const oldDisplay = asRecord(asRecord(pricing?.old)?.display) ?? asRecord(pricing?.old);
  const newDisplay = asRecord(asRecord(pricing?.new)?.display) ?? asRecord(pricing?.new);
  const messages = asArray(changesRecord.messages)
    .map((item) => text(asRecord(item)?.message ?? item, 180))
    .filter(Boolean);
  const oldTotal = numberOrNull(oldDisplay?.total ?? oldDisplay?.amount);
  const newTotal = numberOrNull(newDisplay?.total ?? newDisplay?.amount);
  if (oldTotal == null && newTotal == null && messages.length === 0) {
    return { offer, changes: null };
  }
  return {
    offer,
    changes: {
      oldTotal,
      newTotal,
      currency: text(newDisplay?.currency ?? oldDisplay?.currency, 3).toUpperCase() || "USD",
      messages,
    },
  };
}

function iataCode(record: Record<string, unknown>): string {
  const code = text(
    record.iata ?? record.iataCode ?? record.code ?? record.airportCode ?? record.id,
    3,
  ).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function airportRows(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const buckets = [
    root?.data,
    asRecord(root?.data)?.airports,
    root?.airports,
    asRecord(root?.data)?.results,
  ];
  const rows: Record<string, unknown>[] = [];
  const push = (value: unknown) => {
    const record = asRecord(value);
    if (!record) return;
    const nested = record.airports;
    if (Array.isArray(nested)) {
      for (const airport of nested) push(airport);
      return;
    }
    rows.push(record);
  };
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) {
      for (const item of bucket) push(item);
    } else {
      push(bucket);
    }
  }
  return rows;
}

/** Commercial airports preferred when a city has several fields. */
const MAJOR_AIRPORTS = new Set([
  "ATL", "LAX", "ORD", "DFW", "DEN", "JFK", "SFO", "SEA", "MIA", "MCO",
  "EWR", "BOS", "LAS", "CLT", "PHX", "IAH", "MSP", "DTW", "PHL", "LGA",
  "BWI", "IAD", "DCA", "SAN", "TPA", "FLL", "SLC", "HNL", "PDX", "AUS",
  "BNA", "RDU", "MDW", "DAL", "HOU", "SJC", "OAK", "LIS", "OPO", "CDG",
  "ORY", "LHR", "LGW", "AMS", "FRA", "MAD", "BCN", "FCO", "MXP", "DUB",
  "YYZ", "YUL", "YVR", "CUN", "SJU", "GRU", "GIG", "EZE", "NRT", "HND",
  "ICN", "DXB", "SIN", "HKG", "SYD", "MEL",
]);

const CITY_AIRPORTS: Record<string, string> = {
  miami: "MIA",
  "new york": "JFK",
  nyc: "JFK",
  "new york city": "JFK",
  newark: "EWR",
  "new jersey": "EWR",
  "jersey city": "EWR",
  lisbon: "LIS",
  london: "LHR",
  paris: "CDG",
  orlando: "MCO",
  "los angeles": "LAX",
  chicago: "ORD",
  boston: "BOS",
  seattle: "SEA",
  "san francisco": "SFO",
  washington: "DCA",
  "washington dc": "DCA",
  atlanta: "ATL",
  dallas: "DFW",
  houston: "IAH",
  denver: "DEN",
  "fort lauderdale": "FLL",
  cancun: "CUN",
};

function cityKey(place: string): string {
  return airportSearchText(place)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Used when the airports endpoint returns nothing for a known city. */
export function primaryAirportFor(place: string): FlightAirport | null {
  const hint = iataHint(place);
  if (hint && place.trim().toUpperCase() === hint) {
    return { code: hint, label: hint };
  }
  const key = cityKey(place);
  const code = CITY_AIRPORTS[key];
  if (!code) return null;
  const city = airportSearchText(place) || place.trim();
  return { code, label: `${city} · ${code}`.slice(0, 120) };
}

export function mapAirportMatch(
  payload: unknown,
  hint: string,
  city = "",
): FlightAirport | null {
  const wanted = hint.trim().toUpperCase();
  const wantedCity = cityKey(city);
  const rows = airportRows(payload)
    .map((record) => {
      const code = iataCode(record);
      if (!code) return null;
      const cityName = text(record.city ?? record.cityName, 80);
      const name = text(record.name ?? record.airportName, 120);
      const label = [cityName, code].filter(Boolean).join(" · ") || name || code;
      return { code, label: label.slice(0, 120), city: cityName, name };
    })
    .filter((row): row is { code: string; label: string; city: string; name: string } => Boolean(row));
  if (rows.length === 0) return null;
  const scored = rows.map((row, index) => {
    const cityName = row.city.toLowerCase();
    let score = rows.length - index;
    if (wanted && row.code === wanted) score += 1000;
    if (wantedCity && cityName === wantedCity) score += 200;
    else if (wantedCity && (cityName.startsWith(wantedCity) || wantedCity.startsWith(cityName))) {
      score += 80;
    }
    if (MAJOR_AIRPORTS.has(row.code) || CITY_AIRPORTS[wantedCity] === row.code) score += 60;
    if (/heliport|seaplane|airpark/i.test(row.name)) score -= 80;
    return { row, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored[0]?.row;
  if (!picked) return null;
  return { code: picked.code, label: picked.label };
}

/** Nuitee error text safe to show. Empty when the payload has no message. */
export function flightUpstreamMessage(payload: unknown): string {
  const root = asRecord(payload);
  const nested = asRecord(root?.error);
  const raw =
    text(nested?.description, 240) ||
    text(nested?.message, 240) ||
    text(root?.message, 240) ||
    text(root?.error, 240);
  if (!raw) return "";
  if (/api[- ]?key|unauthorized|invalid key/i.test(raw)) {
    return "Nuitee rejected the flights key on the server.";
  }
  return raw;
}

export function mapFlightPrebook(
  payload: unknown,
  env: Record<string, string | undefined> = process.env,
): FlightPrebook | null {
  const root = asRecord(payload);
  const data = root?.data;
  const first = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!first) return null;
  const prebookId = text(first.prebookId ?? first.id, 128);
  if (!isFlightPrebookId(prebookId)) return null;
  const verified = mapVerifiedFlight({ data: [first] });
  const price =
    verified.offer?.price ??
    moneyFrom(asRecord(asRecord(first.pricing)?.display)) ??
    moneyFrom(asRecord(first.price));
  return { prebookId, price, offer: verified.offer, payment: mapCardPayment(first, env) };
}

const FLIGHT_TRANSACTION_ID = /^[A-Za-z0-9_-]{8,200}$/;
const FLIGHT_CLIENT_SECRET = /^pi_[A-Za-z0-9_]{10,400}$/;
const FLIGHT_PUBLISHABLE_KEY = /^pk_(?:test|live)_[A-Za-z0-9]{8,200}$/;
/** Env fallback must be a Stripe publishable key, never a secret. */
const FLIGHT_ENV_PUBLISHABLE_KEY = /^pk_(test|live)_/;

/** Method names Nuitee rejects on flight book. Never send these as `payment.method`. */
const UNSUPPORTED_FLIGHT_PAYMENT_METHODS = new Set([
  "ACC_CREDIT_CARD",
  "CREDIT",
  "THIRD_PARTY",
  "TRANSACTION",
  "TRANSACTION_ID",
  "WALLET",
]);

/**
 * Publishable key used when Nuitee prebook omits `publishableKey`.
 * `NUITEE_STRIPE_PUBLISHABLE_KEY` wins over `STRIPE_PUBLISHABLE_KEY`.
 * Values that do not match `pk_test_` / `pk_live_` are ignored.
 */
export function flightEnvPublishableKey(
  env: Record<string, string | undefined> = process.env,
): string {
  const candidates = [env.NUITEE_STRIPE_PUBLISHABLE_KEY, env.STRIPE_PUBLISHABLE_KEY];
  for (const candidate of candidates) {
    const key = typeof candidate === "string" ? candidate.trim() : "";
    if (FLIGHT_ENV_PUBLISHABLE_KEY.test(key) && FLIGHT_PUBLISHABLE_KEY.test(key)) return key;
  }
  return "";
}

export function flightBookingPayment(transactionId: string): FlightBookingPayment | null {
  const transaction = transactionId.trim();
  if (!FLIGHT_TRANSACTION_ID.test(transaction)) return null;
  if (UNSUPPORTED_FLIGHT_PAYMENT_METHODS.has(transaction.toUpperCase())) return null;
  return { method: "TRANSACTION_ID", transactionId: transaction };
}

/**
 * Bookings body after Stripe confirms. Null when the transaction id is missing,
 * so the caller can stop with `FLIGHT_CARD_REQUIRED` instead of sending CREDIT
 * or ACC_CREDIT_CARD.
 */
export function flightBookBody(
  prebookId: string,
  transactionId: string,
): { prebookId: string; payment: FlightBookingPayment } | null {
  if (!isFlightPrebookId(prebookId)) return null;
  const payment = flightBookingPayment(transactionId);
  if (!payment) return null;
  return { prebookId, payment };
}

function stripeFields(
  record: Record<string, unknown>,
  env: Record<string, string | undefined>,
): {
  transactionId: string;
  clientSecret: string;
  publishableKey: string;
} {
  const nested = asRecord(record.payment);
  const stripe = asRecord(nested?.stripe) ?? asRecord(record.stripe);
  return {
    transactionId: text(
      record.transactionId ?? nested?.transactionId ?? stripe?.transactionId,
      200,
    ),
    clientSecret: text(
      record.secretKey ??
        record.clientSecret ??
        nested?.secretKey ??
        nested?.clientSecret ??
        stripe?.secretKey ??
        stripe?.clientSecret,
      500,
    ),
    publishableKey: publishableKeyForPrebook(
      text(
        record.publishableKey ??
          record.publishable_key ??
          nested?.publishableKey ??
          nested?.publishable_key ??
          stripe?.publishableKey ??
          record.stripePublishableKey,
        300,
      ),
      env,
    ),
  };
}

/** Upstream key when Nuitee sent one. Otherwise the env fallback. */
function publishableKeyForPrebook(
  upstream: string,
  env: Record<string, string | undefined>,
): string {
  if (upstream) return upstream;
  return flightEnvPublishableKey(env);
}

function mapCardPayment(
  record: Record<string, unknown>,
  env: Record<string, string | undefined>,
): FlightCardPayment | null {
  const fields = stripeFields(record, env);
  const payment = flightBookingPayment(fields.transactionId);
  if (!payment) return null;
  if (!FLIGHT_CLIENT_SECRET.test(fields.clientSecret)) return null;
  if (!FLIGHT_PUBLISHABLE_KEY.test(fields.publishableKey)) return null;
  return {
    transactionId: payment.transactionId,
    clientSecret: fields.clientSecret,
    publishableKey: fields.publishableKey,
  };
}

/**
 * Why a prebook cannot open Stripe Elements.
 * Null when `secretKey`, `transactionId`, and `publishableKey` are all usable.
 */
export function flightPrebookPaymentIssue(
  payload: unknown,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (mapFlightPrebook(payload, env)?.payment) return null;
  const root = asRecord(payload);
  const data = root?.data;
  const first = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!first) return FLIGHT_CARD_REQUIRED;
  const fields = stripeFields(first, env);
  const hasIntent =
    Boolean(flightBookingPayment(fields.transactionId)) &&
    FLIGHT_CLIENT_SECRET.test(fields.clientSecret);
  if (hasIntent && !FLIGHT_PUBLISHABLE_KEY.test(fields.publishableKey)) {
    return FLIGHT_PUBLISHABLE_KEY_MISSING;
  }
  return FLIGHT_CARD_REQUIRED;
}

/** Nuitee captures an authorized PaymentIntent when the booking is created. */
export function flightStripeConfirmed(status: string | null | undefined): boolean {
  return status === "succeeded" || status === "requires_capture";
}

export function mapFlightBooking(payload: unknown): FlightBooking | null {
  const root = asRecord(payload);
  const data = root?.data;
  const first = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  const booking = asRecord(first?.booking) ?? first;
  if (!booking) return null;
  const bookingId = text(booking.bookingId ?? booking.id ?? first?.bookingId, 80);
  if (!bookingId) return null;
  const order = asRecord(booking.order) ?? asRecord(first?.order);
  const reference = asRecord(order?.reference);
  const airline = asRecord(asArray(reference?.airlineBookings)[0]);
  const bookingRef = text(
    booking.bookingRef ??
      airline?.airlinePnr ??
      airline?.pnr ??
      reference?.orderId ??
      booking.pnr,
    40,
  );
  const price = moneyFrom(asRecord(asRecord(booking.pricing)?.display));
  const contact = asRecord(booking.contact) ?? asRecord(first?.contact);
  return {
    bookingId,
    status: text(booking.status, 40) || "CONFIRMED",
    bookingRef,
    currency: price?.currency || "USD",
    price: price?.amount ?? null,
    email: text(contact?.email, 120),
  };
}

export function flightRouteLabel(offer: Pick<FlightOffer, "originCode" | "destinationCode" | "returnDepartureTime">): string {
  if (offer.returnDepartureTime) return `${offer.originCode} ⇄ ${offer.destinationCode}`;
  return `${offer.originCode} → ${offer.destinationCode}`;
}

export function flightDateLabel(offer: Pick<FlightOffer, "departureTime" | "returnDepartureTime">): string {
  const depart = formatFlightDay(offer.departureTime);
  const ret = formatFlightDay(offer.returnDepartureTime);
  if (depart && ret) return `${depart} – ${ret}`;
  return depart;
}

export function buildFlightConfirmation(input: {
  booking: FlightBooking;
  offer: FlightOffer | null;
  party: FlightParty;
  sandbox: boolean;
  paidBy?: "card" | "credit";
}): FlightConfirmationDetails {
  const offer = input.offer;
  const title = offer
    ? `${offer.airline} ${flightRouteLabel(offer)}`
    : "Flight";
  const total = input.booking.price != null
    ? formatFlightMoney({ amount: input.booking.price, currency: input.booking.currency })
    : offer?.price
      ? formatFlightMoney(offer.price)
      : "";
  return {
    title,
    bookingId: input.booking.bookingId,
    confirmationCode: input.booking.bookingRef || input.booking.bookingId,
    status: input.booking.status,
    routeLabel: offer ? flightRouteLabel(offer) : "",
    dateLabel: offer ? flightDateLabel(offer) : "",
    cabin: offer?.cabin ?? "",
    baggage: offer?.baggage ?? "",
    conditions: offer?.conditions ?? [],
    totalLabel: total,
    passengerName: `${input.party.passengers[0]?.firstName ?? ""} ${input.party.passengers[0]?.lastName ?? ""}`.trim(),
    email: input.party.contact.email,
    payment:
      input.paidBy === "card"
        ? {
            method: "guest_card",
            label: "Paid with the card confirmed through Nuitee.",
          }
        : input.sandbox
          ? {
              method: "sandbox_account",
              label: "Nuitee’s sandbox credit. No guest card was charged.",
            }
          : {
              method: "guest_card",
              label: "Paid with the card confirmed through Nuitee.",
            },
    sandbox: input.sandbox,
    departDate: offer?.departureTime.slice(0, 10) ?? "",
    departTime: clock24(offer?.departureTime ?? ""),
  };
}

function clock24(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? "";
}

export function classifyFlightFailure(input: {
  stage: "search" | "verify" | "prebook" | "book";
  message: string;
  code?: string;
}): FlightFailure {
  const message = input.message.trim() || "Nuitee could not complete that step.";
  const code = input.code ?? "";
  if (code === "live_checkout") {
    return {
      title: "Live card payment isn’t turned on",
      message,
      recovery: "back-to-search",
    };
  }
  if (code === "not_configured") {
    return {
      title: "Flights aren’t configured",
      message,
      recovery: "back-to-search",
    };
  }
  if (/too many|rate limit|wait a moment/i.test(message)) {
    return { title: "Give it a moment", message, recovery: "retry" };
  }
  if (/publishable key/i.test(message)) {
    return {
      title: "Stripe publishable key missing",
      message,
      recovery: "back-to-search",
    };
  }
  if (message === FLIGHT_CARD_REQUIRED || /did not return a card payment|card payment isn/i.test(message)) {
    return {
      title: FLIGHT_CARD_REQUIRED,
      message: "Nuitee did not return a confirmed card payment, so this fare was not booked.",
      recovery: "back-to-search",
    };
  }
  if (/payment method unsupported|not supported payment method/i.test(message)) {
    return {
      title: "Booking didn’t finish",
      message:
        "Nuitee rejected that payment method. Confirm the card in the Stripe form, then book with the transaction id.",
      recovery: "retry",
    };
  }
  if (/card rejected|card was declined|card has been declined/i.test(message)) {
    return {
      title: "The card was declined",
      message,
      recovery: "retry",
    };
  }
  if (/price change|price has changed|fare change/i.test(message)) {
    return {
      title: "The fare changed",
      message,
      recovery: "accept-price",
    };
  }
  if (/sold out|no longer available|not available|unavailable|expired|offer not found|404/i.test(message)) {
    return {
      title: "That fare expired",
      message: "Nuitee no longer has this offer. Search again and pick another flight.",
      recovery: "back-to-search",
    };
  }
  if (input.stage === "book") {
    return {
      title: "Booking didn’t finish",
      message,
      recovery: "retry",
    };
  }
  return {
    title: "Nuitee couldn’t finish that step",
    message,
    recovery: "retry",
  };
}
