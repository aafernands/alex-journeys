/**
 * Flights search, verify, prebook, and sandbox book.
 * Server-only. Responses are mapped before they leave this module.
 */

import "server-only";

import {
  LITEAPI_SEARCH_BASE,
  LiteApiError,
  liteApiCall,
  liteApiKeyInfo,
} from "@/lib/liteapi";
import {
  airportSearchText,
  flightsQueryIssue,
  iataHint,
  isFlightOfferId,
  isFlightPrebookId,
  mapAirportMatch,
  mapFlightBooking,
  mapFlightPrebook,
  mapFlightSearch,
  mapVerifiedFlight,
  type FlightAirport,
  type FlightBooking,
  type FlightOffer,
  type FlightParty,
  type FlightPrebook,
  type FlightPriceChange,
  type FlightsQuery,
} from "@/lib/flights";

export type FlightSearchResult = {
  sandbox: boolean;
  origin: FlightAirport;
  destination: FlightAirport;
  offers: FlightOffer[];
};

export type FlightVerifyResult = {
  sandbox: boolean;
  offer: FlightOffer;
  changes: FlightPriceChange | null;
};

const flightCall = {
  product: "flights" as const,
};

async function resolveAirport(place: string): Promise<FlightAirport> {
  const hint = iataHint(place);
  const query = airportSearchText(place) || hint;
  if (query.length < 2) {
    throw new LiteApiError(
      `Couldn’t match ${place.trim()} to an airport. Try a city or a three-letter code.`,
      400,
      "bad_request",
    );
  }
  try {
    const payload = await liteApiCall({
      base: LITEAPI_SEARCH_BASE,
      path: "/data/flights/airports",
      query: { q: query },
      timeoutMs: 8_000,
      ...flightCall,
    });
    const match = mapAirportMatch(payload, hint);
    if (match) return match;
  } catch (error) {
    if (error instanceof LiteApiError && error.code === "not_configured") throw error;
    if (hint) return { code: hint, label: hint };
    if (error instanceof LiteApiError) throw error;
  }
  if (hint) return { code: hint, label: place.trim().slice(0, 80) || hint };
  throw new LiteApiError(
    `Couldn’t match ${place.trim()} to an airport. Try a city or a three-letter code.`,
    400,
    "bad_request",
  );
}

function ratesBody(query: FlightsQuery, origin: string, destination: string) {
  const legs = [
    {
      origin,
      destination,
      date: query.startDate,
      direction: "OUTBOUND",
    },
  ];
  if (query.tripType === "roundtrip" && query.endDate) {
    legs.push({
      origin: destination,
      destination: origin,
      date: query.endDate,
      direction: "INBOUND",
    });
  }
  return {
    legs,
    adults: query.adults,
    children: query.children,
    currency: "USD",
    country: "US",
    cabinClass: query.cabin,
  };
}

export async function searchFlights(query: FlightsQuery): Promise<FlightSearchResult> {
  const issue = flightsQueryIssue(query);
  if (issue) throw new LiteApiError(issue, 400, "bad_request");
  const info = liteApiKeyInfo();
  if (!info) throw new LiteApiError("Flights aren’t configured.", 503, "not_configured");

  const [origin, destination] = await Promise.all([
    resolveAirport(query.origin),
    resolveAirport(query.destination),
  ]);
  if (origin.code === destination.code) {
    throw new LiteApiError(
      "Origin and destination resolved to the same airport. Try a different city.",
      400,
      "bad_request",
    );
  }

  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/rates",
    method: "POST",
    body: ratesBody(query, origin.code, destination.code),
    timeoutMs: 22_000,
    ...flightCall,
  });

  return {
    sandbox: info.sandbox,
    origin,
    destination,
    offers: mapFlightSearch(payload),
  };
}

export async function verifyFlight(offerId: string): Promise<FlightVerifyResult> {
  if (!isFlightOfferId(offerId)) {
    throw new LiteApiError("That flight link is not valid.", 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) throw new LiteApiError("Flights aren’t configured.", 503, "not_configured");
  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/verify",
    method: "POST",
    body: { offerId },
    timeoutMs: 20_000,
    ...flightCall,
  });
  const verified = mapVerifiedFlight(payload);
  if (!verified.offer) {
    throw new LiteApiError(
      "That fare expired. Search again and pick another flight.",
      404,
      "upstream",
    );
  }
  return { sandbox: info.sandbox, offer: verified.offer, changes: verified.changes };
}

export async function prebookFlight(offerId: string, party: FlightParty): Promise<FlightPrebook> {
  if (!isFlightOfferId(offerId)) {
    throw new LiteApiError("Choose a flight before continuing.", 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) throw new LiteApiError("Flights aren’t configured.", 503, "not_configured");
  if (!info.sandbox) {
    throw new LiteApiError(
      "Live card checkout isn’t turned on. A sandbox key can complete a test booking.",
      409,
      "live_checkout",
    );
  }
  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/prebooks",
    method: "POST",
    body: {
      offerId,
      usePaymentSdk: false,
      contact: party.contact,
      passengers: party.passengers,
    },
    timeoutMs: 22_000,
    ...flightCall,
  });
  const prebook = mapFlightPrebook(payload);
  if (!prebook) {
    throw new LiteApiError(
      "Nuitee did not hold that fare. Search again and pick another flight.",
      502,
      "upstream",
    );
  }
  return prebook;
}

export async function bookFlight(prebookId: string): Promise<FlightBooking> {
  if (!isFlightPrebookId(prebookId)) {
    throw new LiteApiError("That checkout session expired. Pick the flight again.", 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) throw new LiteApiError("Flights aren’t configured.", 503, "not_configured");
  if (!info.sandbox) {
    throw new LiteApiError(
      "Live card checkout isn’t turned on. A sandbox key can complete a test booking.",
      409,
      "live_checkout",
    );
  }
  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/bookings",
    method: "POST",
    body: {
      prebookId,
      payment: { method: "CREDIT" },
    },
    timeoutMs: 25_000,
    ...flightCall,
  });
  const booking = mapFlightBooking(payload);
  if (!booking) {
    throw new LiteApiError(
      "Nuitee did not return a confirmation. Check the sandbox dashboard before trying again.",
      502,
      "upstream",
    );
  }
  return booking;
}
