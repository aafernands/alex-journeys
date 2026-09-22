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
  flightOfferId,
  flightUpstreamMessage,
  flightsQueryIssue,
  iataHint,
  isFlightOfferId,
  isFlightPrebookId,
  flightBookingPayment,
  mapAirportMatch,
  mapFlightBooking,
  mapFlightPrebook,
  mapFlightSearch,
  mapVerifiedFlight,
  primaryAirportFor,
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

function airportMiss(place: string): LiteApiError {
  const name = place.trim() || "that place";
  return new LiteApiError(
    `Couldn’t match ${name} to an airport. Try a city or a three-letter code.`,
    400,
    "bad_request",
  );
}

function localAirport(place: string, hint: string): FlightAirport | null {
  if (hint) return { code: hint, label: place.trim().slice(0, 80) || hint };
  return primaryAirportFor(place);
}

async function resolveAirport(place: string): Promise<FlightAirport> {
  const hint = iataHint(place);
  const query = airportSearchText(place) || hint;
  if (query.length < 2) throw airportMiss(place);
  try {
    const payload = await liteApiCall({
      base: LITEAPI_SEARCH_BASE,
      path: "/data/flights/airports",
      query: { q: query },
      timeoutMs: 8_000,
      ...flightCall,
    });
    const match = mapAirportMatch(payload, hint, query);
    if (match) return match;
  } catch (error) {
    if (error instanceof LiteApiError && error.code === "not_configured") throw error;
    if (
      error instanceof LiteApiError &&
      /not enabled|flights access|do not have access|forbidden/i.test(error.message)
    ) {
      throw error;
    }
    const local = localAirport(place, hint);
    if (local) return local;
    if (error instanceof LiteApiError) throw error;
  }
  const local = localAirport(place, hint);
  if (local) return local;
  throw airportMiss(place);
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
  const id = flightOfferId(offerId);
  if (!id) {
    throw new LiteApiError("That flight link is not valid.", 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) throw new LiteApiError("Flights aren’t configured.", 503, "not_configured");
  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/verify",
    method: "POST",
    body: { offerId: id },
    timeoutMs: 20_000,
    ...flightCall,
  });
  const verified = mapVerifiedFlight(payload, id);
  if (!verified.offer) {
    const upstream = flightUpstreamMessage(payload);
    throw new LiteApiError(
      upstream || "That fare expired. Search again and pick another flight.",
      upstream ? 502 : 404,
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
  const phone = `+${party.contact.phoneCountryCode}${party.contact.phoneNumber}`;
  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/prebooks",
    method: "POST",
    body: {
      offerId,
      usePaymentSdk: true,
      contact: { ...party.contact, phone },
      passengers: party.passengers,
    },
    timeoutMs: 22_000,
    ...flightCall,
  });
  const prebook = mapFlightPrebook(payload);
  if (!prebook) {
    const upstream = flightUpstreamMessage(payload);
    throw new LiteApiError(
      upstream || "Nuitee did not hold that fare. Search again and pick another flight.",
      502,
      "upstream",
    );
  }
  if (!prebook.payment) {
    throw new LiteApiError(
      "Nuitee held the fare but did not return a card payment. Search again and pick the flight once more.",
      502,
      "upstream",
    );
  }
  return prebook;
}

export async function bookFlight(prebookId: string, transactionId = ""): Promise<FlightBooking> {
  if (!isFlightPrebookId(prebookId)) {
    throw new LiteApiError("That checkout session expired. Pick the flight again.", 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) throw new LiteApiError("Flights aren’t configured.", 503, "not_configured");
  const payment = flightBookingPayment(transactionId);
  if (!payment) {
    throw new LiteApiError(
      "Confirm the card payment before booking this flight.",
      409,
      "bad_request",
    );
  }
  const payload = await liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/flights/bookings",
    method: "POST",
    body: { prebookId, payment },
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
