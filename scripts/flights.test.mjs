import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  airportFieldValue,
  airportSearchText,
  buildFlightConfirmation,
  classifyFlightFailure,
  flightBookingPayment,
  flightOfferId,
  flightUpstreamMessage,
  flightsBookPath,
  flightsPath,
  flightsQueryIssue,
  iataHint,
  isFlightOfferId,
  mapAirportMatch,
  mapFlightBooking,
  mapFlightPrebook,
  mapFlightSearch,
  mapVerifiedFlight,
  parseFlightParty,
  parseFlightsSearchParams,
  primaryAirportFor,
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
          secretKey: "pi_3Nabc_secret_shouldnotleak",
          transactionId: "pi_3Nabc",
          publishableKey: "pk_test_1234567890abcdef",
          journey: RATES.data[0].journeys[0],
        },
      ],
    });
    assert.equal(prebook.prebookId, "019d0674-834d-7db7-9c8b-93fe8e46e7b8");
    assert.equal(prebook.payment.clientSecret, "pi_3Nabc_secret_shouldnotleak");
    assert.equal(prebook.payment.publishableKey, "pk_test_1234567890abcdef");
    assert.equal(prebook.payment.transactionId, "pi_3Nabc");
    assert.equal(JSON.stringify(prebook.offer).includes("secretKey"), false);
    assert.equal(
      mapFlightPrebook({
        data: [{ prebookId: "019d0674-834d-7db7-9c8b-93fe8e46e7b8", secretKey: "pi_3Nabc_secret_shouldnotleak" }],
      }).payment,
      null,
    );

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
    assert.equal(
      classifyFlightFailure({
        stage: "book",
        message: "invalid format: payment method unsupported",
      }).title,
      "Booking didn’t finish",
    );
    assert.match(
      classifyFlightFailure({
        stage: "book",
        message: "invalid format: payment method unsupported",
      }).message,
      /Stripe form/,
    );
  });
});

describe("flight payment payload", () => {
  it("books with the Stripe transaction id and never a hotel or credit method", () => {
    const payment = flightBookingPayment("tr_cts_WaTMwICRB0h_dOfyvLvvN");
    assert.deepEqual(payment, {
      method: "TRANSACTION_ID",
      transactionId: "tr_cts_WaTMwICRB0h_dOfyvLvvN",
    });
    assert.equal(JSON.stringify(payment).includes("ACC_CREDIT_CARD"), false);
    assert.equal(JSON.stringify(payment).includes("CREDIT"), false);
    assert.equal(flightBookingPayment(""), null);
    assert.equal(flightBookingPayment("CREDIT"), null);
    assert.equal(flightBookingPayment("ACC_CREDIT_CARD"), null);
    assert.equal(flightBookingPayment("WALLET"), null);

    const prebook = mapFlightPrebook({
      data: [
        {
          prebookId: "019d0674-834d-7db7-9c8b-93fe8e46e7b8",
          transactionId: "tr_cts_WaTMwICRB0h_dOfyvLvvN",
          secretKey: "pi_3TChNEA4FXPoRk9Y1hbH6uVq_secret_CRhCAan4jSlXcwLs8N3r1qN6D",
          publishableKey: "pk_test_51Hh1234567890abcdef",
          paymentTypes: ["TRANSACTION_ID"],
        },
      ],
    });
    assert.equal(prebook.payment.transactionId, "tr_cts_WaTMwICRB0h_dOfyvLvvN");
    assert.equal(
      prebook.payment.clientSecret,
      "pi_3TChNEA4FXPoRk9Y1hbH6uVq_secret_CRhCAan4jSlXcwLs8N3r1qN6D",
    );
    assert.equal(
      mapFlightPrebook({
        data: [
          {
            prebookId: "019d0674-834d-7db7-9c8b-93fe8e46e7b8",
            transactionId: "tr_cts_WaTMwICRB0h_dOfyvLvvN",
            secretKey: "pi_3TChNEA4FXPoRk9Y1hbH6uVq_secret_CRhCAan4jSlXcwLs8N3r1qN6D",
          },
        ],
      }).payment,
      null,
    );
    assert.equal(
      mapFlightPrebook({
        data: [
          {
            prebookId: "019d0674-834d-7db7-9c8b-93fe8e46e7b8",
            transactionId: "tr_cts_WaTMwICRB0h_dOfyvLvvN",
            secretKey: "pi_3TChNEA4FXPoRk9Y1hbH6uVq_secret_CRhCAan4jSlXcwLs8N3r1qN6D",
            publishableKey: "pk_test_51Hh1234567890abcdef",
            paymentTypes: ["CREDIT", "ACC_CREDIT_CARD"],
          },
        ],
      }).payment,
      null,
    );
  });
});

const VERIFY_OFFER =
  "h6NwaWTZJDAxOWQwNjIwLWQzMDItNzBiYS04OGUxLTdlMTdkMzYyZDQ0MKJ0cMtAkdkUeuFHrqJtdcs+AAAAAAAAKNjdXKjVVNEo3VpZM0CeaJkZKoyMDI2LTA3LTAxonJkqjIwMjYtMDgtMDI=";

const VERIFY = {
  data: [
    {
      journey: {
        journeyKey: "26b2fa3085dc22b2",
        pricing: { display: { total: 1423.42, currency: "USD" } },
        baggage: { hasCarryOnBag: true, included: [{ description: "Cabin bag" }] },
        fare: { family: "Economy", seatsRemaining: 9 },
        terms: { refundable: false, changeable: false, summary: [{ message: "Non-refundable fare" }] },
        segments: [
          {
            originCode: "EWR",
            destinationCode: "MIA",
            departureTime: "2026-10-12T08:00:00",
            arrivalTime: "2026-10-12T11:10:00",
            direction: "OUTBOUND",
            duration: { minutes: 190 },
            flight: { marketingNumber: "1234" },
            carrier: { marketingCode: "AA", marketingName: "American Airlines" },
          },
          {
            originCode: "MIA",
            destinationCode: "EWR",
            departureTime: "2026-10-19T18:40:00",
            arrivalTime: "2026-10-19T21:45:00",
            direction: "INBOUND",
            duration: { minutes: 185 },
            flight: { marketingNumber: "1235" },
            carrier: { marketingCode: "AA", marketingName: "American Airlines" },
          },
        ],
        segmentFares: [{ cabin: "Economy" }],
      },
    },
  ],
};

describe("verify payload", () => {
  it("keeps the search offer id when Nuitee omits it from the journey", () => {
    assert.equal(isFlightOfferId(VERIFY_OFFER), true);
    assert.equal(flightOfferId(VERIFY_OFFER.replace(/\+/g, " ")), VERIFY_OFFER);
    const verified = mapVerifiedFlight(VERIFY, VERIFY_OFFER);
    assert.equal(verified.offer.offerId, VERIFY_OFFER);
    assert.equal(verified.offer.airline, "American Airlines");
    assert.equal(verified.offer.originCode, "EWR");
    assert.equal(verified.offer.destinationCode, "MIA");
    assert.equal(verified.offer.price.amount, 1423.42);
    assert.equal(verified.offer.returnDepartureTime, "2026-10-19T18:40:00");
    assert.equal(mapVerifiedFlight(VERIFY).offer, null);
    assert.equal(
      flightUpstreamMessage({
        error: { description: "The offer has expired or is invalid", message: "not found" },
      }),
      "The offer has expired or is invalid",
    );
    const query = parseFlightsSearchParams({
      origin: "EWR",
      dest: "MIA",
      start: "2026-10-12",
      end: "2026-10-19",
      type: "roundtrip",
    });
    const path = flightsBookPath(VERIFY_OFFER, query);
    const params = new URLSearchParams(path.slice(path.indexOf("?") + 1));
    assert.equal(params.get("offer"), VERIFY_OFFER);
  });
});

describe("city airports", () => {
  it("reads nested Nuitee airport results and prefers the main airport", () => {
    assert.equal(iataHint("Miami · MIA"), "MIA");
    assert.deepEqual(primaryAirportFor("Miami, United States"), {
      code: "MIA",
      label: "Miami · MIA",
    });
    assert.deepEqual(primaryAirportFor("New York"), {
      code: "JFK",
      label: "New York · JFK",
    });
    assert.deepEqual(primaryAirportFor("Newark"), {
      code: "EWR",
      label: "Newark · EWR",
    });
    assert.deepEqual(
      mapAirportMatch(
        {
          data: [
            {
              airports: [
                { iata: "OPF", city: "Miami", name: "Opa-locka Executive Airport" },
                { iata: "MIA", city: "Miami", name: "Miami International Airport" },
              ],
              count: 2,
            },
          ],
        },
        "",
        "Miami",
      ),
      { code: "MIA", label: "Miami · MIA" },
    );
    assert.equal(
      airportFieldValue("Miami, United States", { code: "MIA", label: "Miami · MIA" }),
      "Miami · MIA",
    );
  });
});
