import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  airportSearchText,
  buildFlightConfirmation,
  classifyFlightFailure,
  flightsBookPath,
  flightsPath,
  flightsQueryIssue,
  iataHint,
  mapAirportMatch,
  mapFlightBooking,
  mapFlightPrebook,
  mapFlightSearch,
  mapVerifiedFlight,
  parseFlightParty,
  parseFlightsSearchParams,
} from "../src/lib/flights.ts";

const OFFER = "h6NwaWTZJDAxOWQwNjFlLWRlMjYtNzI1NC1hZDNmLTA0ZDkwZmMxMDNhZaJ0cA";

const RATES = {
  secretKey: "pi_secret_should_not_leak",
  data: [
    {
      journeys: [
        {
          journeyKey: "a3bbe883",
          isCheapest: true,
          totalDuration: { minutes: 465 },
          segments: [
            {
              originCode: "EWR",
              originName: "Newark Liberty",
              destinationCode: "LIS",
              destinationName: "Lisbon",
              departureTime: "2027-04-12T18:30:00",
              arrivalTime: "2027-04-13T06:45:00",
              direction: "OUTBOUND",
              duration: { minutes: 435 },
              flight: { marketingNumber: "64" },
              carrier: { marketingCode: "TP", marketingName: "TAP Air Portugal" },
            },
            {
              originCode: "LIS",
              destinationCode: "EWR",
              departureTime: "2027-04-19T11:05:00",
              arrivalTime: "2027-04-19T14:10:00",
              direction: "INBOUND",
              duration: { minutes: 485 },
              flight: { marketingNumber: "209" },
              carrier: { marketingCode: "TP", marketingName: "TAP Air Portugal" },
            },
          ],
          offers: [
            {
              offerId: OFFER,
              pricing: { display: { total: 640.5, currency: "USD" } },
              fare: { family: "Economy", seatsRemaining: 4 },
              baggage: {
                hasCarryOnBag: true,
                included: [{ description: "1 carry-on bag" }],
              },
              terms: {
                refundable: false,
                changeable: false,
                summary: [{ message: "Non-refundable fare" }],
              },
              segmentFares: [{ cabin: "Economy" }],
            },
            {
              offerId: `${OFFER}BUSINESS`,
              pricing: { display: { total: 2100, currency: "USD" } },
              fare: { family: "Business" },
            },
          ],
        },
      ],
    },
  ],
};

const lead = {
  firstName: "Ada",
  lastName: "Lovelace",
  birthday: "1990-12-10",
  gender: "F",
  nationality: "US",
  documentNumber: "X1234567",
  documentExpiry: "2030-01-01",
  email: "ada@example.com",
  phoneCountry: "1",
  phoneNumber: "2125550100",
};

describe("flights query", () => {
  it("builds a trip-context path and parses it back", () => {
    const path = flightsPath({
      origin: "Newark (EWR)",
      destination: "Lisbon, Portugal",
      startDate: "2027-04-12",
      endDate: "2027-04-19",
      tripType: "roundtrip",
      adults: 2,
      children: 1,
      cabin: "BUSINESS",
      tripId: "trip_abc",
    });
    assert.match(path, /^\/flights\?/);
    const params = Object.fromEntries(new URLSearchParams(path.slice(path.indexOf("?") + 1)));
    const query = parseFlightsSearchParams(params);
    assert.equal(query.origin, "Newark (EWR)");
    assert.equal(query.destination, "Lisbon, Portugal");
    assert.equal(query.startDate, "2027-04-12");
    assert.equal(query.endDate, "2027-04-19");
    assert.equal(query.tripType, "roundtrip");
    assert.equal(query.adults, 2);
    assert.equal(query.children, 1);
    assert.equal(query.cabin, "BUSINESS");
    assert.equal(query.tripId, "trip_abc");
    assert.equal(flightsPath({}), "/flights");
    assert.equal(
      flightsBookPath(OFFER, query).includes(`offer=${encodeURIComponent(OFFER)}`),
      true,
    );
  });

  it("reads an airport code out of a city label", () => {
    assert.equal(iataHint("Newark (EWR)"), "EWR");
    assert.equal(iataHint("ewr"), "EWR");
    assert.equal(iataHint("Lisbon, Portugal"), "");
    assert.equal(airportSearchText("Lisbon, Portugal"), "Lisbon");
    assert.equal(airportSearchText("Newark (EWR)"), "Newark");
  });

  it("rejects a route that is missing or already gone", () => {
    const query = parseFlightsSearchParams({
      origin: "EWR",
      dest: "LIS",
      start: "2020-01-01",
      end: "2020-01-08",
      type: "roundtrip",
    });
    assert.equal(
      flightsQueryIssue(query, new Date("2026-09-22T00:00:00Z")),
      "That departure date has already passed.",
    );
    assert.equal(
      flightsQueryIssue(
        parseFlightsSearchParams({ origin: "EWR", dest: "EWR", start: "2027-04-12", type: "oneway" }),
        new Date("2026-09-22T00:00:00Z"),
      ),
      "Origin and destination need to be different.",
    );
  });
});

describe("flights mapping", () => {
  it("keeps the cheapest offer per journey and drops payment secrets", () => {
    const [offer] = mapFlightSearch(RATES);
    assert.equal(offer.offerId, OFFER);
    assert.equal(offer.airline, "TAP Air Portugal");
    assert.equal(offer.originCode, "EWR");
    assert.equal(offer.destinationCode, "LIS");
    assert.equal(offer.price.amount, 640.5);
    assert.equal(offer.outboundStops, 0);
    assert.equal(offer.returnDepartureTime, "2027-04-19T11:05:00");
    assert.equal(offer.baggage, "1 carry-on bag");
    assert.equal(offer.cheapest, true);
    assert.equal(JSON.stringify(offer).includes("secret"), false);
    assert.equal(mapFlightSearch({ data: [{ journeys: [] }] }).length, 0);
  });

  it("maps a verified fare, a price change, an airport, a prebook, and a booking", () => {
    const verified = mapVerifiedFlight({
      data: [
        {
          journey: RATES.data[0].journeys[0],
          changes: {
            pricing: {
              old: { display: { total: 640.5, currency: "USD" } },
              new: { display: { total: 655, currency: "USD" } },
            },
            messages: ["Fare increased"],
          },
        },
      ],
    });
    assert.equal(verified.offer.price.amount, 640.5);
    assert.equal(verified.changes.newTotal, 655);
    assert.deepEqual(verified.changes.messages, ["Fare increased"]);

    assert.deepEqual(
      mapAirportMatch(
        { data: [{ iata: "LIS", city: "Lisbon", name: "Humberto Delgado" }] },
        "LIS",
      ),
      { code: "LIS", label: "Lisbon · LIS" },
    );

    const prebook = mapFlightPrebook({
      data: [
        {
          prebookId: "019d0674-834d-7db7-9c8b-93fe8e46e7b8",
          secretKey: "pi_secret_should_not_leak",
          transactionId: "txn_should_not_leak",
          journey: RATES.data[0].journeys[0],
        },
      ],
    });
    assert.equal(prebook.prebookId, "019d0674-834d-7db7-9c8b-93fe8e46e7b8");
    assert.equal(JSON.stringify(prebook).includes("secret"), false);
    assert.equal(JSON.stringify(prebook).includes("txn_"), false);

    const booking = mapFlightBooking({
      data: [
        {
          bookingId: "book_123",
          status: "CONFIRMED",
          bookingRef: "ABC123",
          pricing: { display: { total: 655, currency: "USD" } },
          contact: { email: "ada@example.com" },
        },
      ],
    });
    assert.equal(booking.bookingRef, "ABC123");
    assert.equal(booking.price, 655);
  });
});

describe("flights passengers", () => {
  it("accepts a passport party and refuses a thin one", () => {
    const party = parseFlightParty([lead], 1, 0, "2027-04-12");
    assert.ok(party);
    assert.equal(party.passengers[0].type, "ADT");
    assert.equal(party.contact.phoneCountryCode, "1");
    assert.equal(party.contact.phoneNumber, "2125550100");
    assert.equal(parseFlightParty([{ ...lead, documentNumber: "12" }], 1, 0, "2027-04-12"), null);
    const confirmation = buildFlightConfirmation({
      booking: {
        bookingId: "book_123",
        status: "CONFIRMED",
        bookingRef: "ABC123",
        currency: "USD",
        price: 655,
        email: "ada@example.com",
      },
      offer: mapFlightSearch(RATES)[0],
      party,
      sandbox: true,
    });
    assert.equal(confirmation.confirmationCode, "ABC123");
    assert.equal(confirmation.payment.method, "sandbox_account");
    assert.equal(confirmation.departTime, "18:30");
    assert.match(confirmation.title, /TAP Air Portugal/);
  });

  it("names a missing key and an expired fare", () => {
    assert.equal(classifyFlightFailure({
      stage: "search",
      message: "Flights aren’t configured.",
      code: "not_configured",
    }).title, "Flights aren’t configured");
    assert.equal(
      classifyFlightFailure({ stage: "verify", message: "Offer expired" }).recovery,
      "back-to-search",
    );
  });
});
