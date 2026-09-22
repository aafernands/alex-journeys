import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readLiteApiKey } from "../src/lib/stays-config.ts";
import {
  formatStayMoney,
  mapBooking,
  mapHotelContent,
  mapPrebook,
  mapRoomOffers,
  mapStaySearch,
  parseStayGuest,
  parseStaysSearchParams,
  plainStayText,
  stayOccupancies,
  staysPath,
  staysQueryIssue,
  upstreamStayMessage,
} from "../src/lib/stays.ts";

const RATES = {
  data: [
    {
      hotelId: "lp1897",
      roomTypes: [
        {
          offerId: "OFFERTOKEN12345678",
          offerRetailRate: [{ amount: 210, currency: "USD" }],
          rates: [
            {
              name: "Standard King Room",
              boardName: "Room Only",
              remarks: "Resort fee<br/>due at the hotel",
              retailRate: { total: [{ amount: 210, currency: "USD" }] },
              cancellationPolicies: { refundableTag: "NRFN" },
            },
          ],
        },
        {
          offerId: "CHEAPEROFFER123456",
          offerRetailRate: [{ amount: 163.66, currency: "USD" }],
          rates: [
            {
              name: "Queen Room",
              boardName: "Breakfast",
              cancellationPolicies: { refundableTag: "RFN" },
            },
          ],
        },
      ],
    },
  ],
  hotels: [
    {
      id: "lp1897",
      name: "Hotel du Test",
      main_photo: "https://cdn.example.com/hotel.jpg",
      address: "12 Rue de Rivoli, Paris",
      city_name: "Paris",
      rating: 8.6,
      stars: 4,
      location_type: "city center",
    },
  ],
  secretKey: "pi_secret_should_not_leak",
};

describe("stays query", () => {
  it("builds a trip-context path and parses it back", () => {
    const path = staysPath({
      destination: "Paris",
      startDate: "2027-06-02",
      endDate: "2027-06-09",
      adults: 2,
      children: 1,
      rooms: 1,
    });
    assert.equal(
      path,
      "/stays?dest=Paris&start=2027-06-02&end=2027-06-09&adults=2&children=1",
    );
    const parsed = parseStaysSearchParams({
      dest: "Paris",
      start: "2027-06-02",
      end: "2027-06-09",
      adults: "2",
      children: "1",
    });
    assert.equal(parsed.destination, "Paris");
    assert.equal(parsed.rooms, 1);
    assert.equal(parsed.children, 1);
    assert.equal(staysQueryIssue(parsed, new Date("2026-01-01T00:00:00Z")), null);
  });

  it("rejects a stay that already passed and rooms without adults", () => {
    const parsed = parseStaysSearchParams({
      dest: "Paris",
      start: "2020-01-01",
      end: "2020-01-03",
      adults: "1",
      rooms: "2",
    });
    assert.match(
      staysQueryIssue(parsed, new Date("2026-09-22T00:00:00Z")) ?? "",
      /already passed/,
    );
    const crowded = parseStaysSearchParams({
      dest: "Paris",
      start: "2027-06-02",
      end: "2027-06-04",
      adults: "1",
      rooms: "2",
    });
    assert.match(staysQueryIssue(crowded, new Date("2026-01-01T00:00:00Z")) ?? "", /adult/);
  });

  it("splits adults across rooms and prices children as age 10", () => {
    assert.deepEqual(stayOccupancies({ adults: 3, rooms: 2, children: 1 }), [
      { adults: 2, children: [10] },
      { adults: 1 },
    ]);
  });
});

describe("stays mapping", () => {
  it("maps list cards with neighborhood, rating, and the cheapest rate", () => {
    const [card] = mapStaySearch(RATES);
    assert.ok(card);
    assert.equal(card.id, "lp1897");
    assert.equal(card.name, "Hotel du Test");
    assert.equal(card.photo, "https://cdn.example.com/hotel.jpg");
    assert.equal(card.neighborhood, "city center");
    assert.equal(card.rating, 8.6);
    assert.deepEqual(card.fromPrice, { amount: 163.66, currency: "USD" });
    assert.equal(formatStayMoney(card.fromPrice), "$163.66");
    assert.equal(JSON.stringify(card).includes("secret"), false);
  });

  it("maps rooms and strips markup from remarks", () => {
    const rooms = mapRoomOffers(RATES);
    assert.equal(rooms.length, 2);
    assert.equal(rooms[0].name, "Queen Room");
    assert.equal(rooms[0].refundable, "refundable");
    assert.equal(rooms[1].refundable, "non-refundable");
    assert.equal(plainStayText("Resort fee<br/>due"), "Resort fee\ndue");
    assert.match(rooms[1].remarks, /Resort fee/);
    assert.equal(rooms[1].remarks.includes("<br"), false);
  });

  it("maps hotel content, prebook, and booking without payment secrets", () => {
    const hotel = mapHotelContent(
      {
        data: {
          id: "lp1897",
          name: "Hotel du Test",
          hotelDescription: "<p>A quiet room.</p>",
          address: "12 Rue de Rivoli, Paris",
          city: "Paris",
          starRating: 4,
          hotelImages: [{ url: "https://cdn.example.com/room.jpg", caption: "Room" }],
          facilities: [{ name: "Wifi" }, { name: "Wifi" }],
          checkinCheckoutTimes: { checkin: "15:00", checkout: "11:00" },
        },
      },
      "lp1897",
    );
    assert.ok(hotel);
    assert.equal(hotel.description, "A quiet room.");
    assert.deepEqual(hotel.facilities, ["Wifi"]);
    assert.equal(hotel.checkIn, "15:00");

    const prebook = mapPrebook({
      data: {
        prebookId: "zzWkJcdgk",
        hotelId: "lp1897",
        currency: "USD",
        price: 213.66,
        priceDifferencePercent: 0,
        cancellationChanged: false,
        boardChanged: false,
        checkin: "2027-06-02",
        checkout: "2027-06-09",
        secretKey: "pi_secret",
        transactionId: "tr_secret",
        roomTypes: [
          {
            rates: [
              {
                name: "Queen Room",
                boardName: "Breakfast",
                cancellationPolicies: { refundableTag: "RFN" },
              },
            ],
          },
        ],
      },
    });
    assert.ok(prebook);
    assert.equal(prebook.price, 213.66);
    assert.equal(JSON.stringify(prebook).includes("pi_secret"), false);
    assert.equal(JSON.stringify(prebook).includes("tr_secret"), false);

    const booking = mapBooking({
      data: {
        bookingId: "book_123",
        status: "CONFIRMED",
        hotelConfirmationCode: "ABC123",
        hotel: { name: "Hotel du Test" },
        price: 213.66,
        currency: "USD",
        checkin: "2027-06-02",
        checkout: "2027-06-09",
      },
    });
    assert.deepEqual(booking, {
      bookingId: "book_123",
      status: "CONFIRMED",
      hotelConfirmationCode: "ABC123",
      hotelName: "Hotel du Test",
      checkin: "2027-06-02",
      checkout: "2027-06-09",
      currency: "USD",
      price: 213.66,
    });
  });

  it("hides key failures and validates a guest", () => {
    assert.equal(
      upstreamStayMessage({ error: { message: "Invalid API key" } }, "fallback"),
      "Nuitee rejected the stays key on the server.",
    );
    assert.equal(
      parseStayGuest({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+1 (212) 555-0100",
      })?.phone,
      "+12125550100",
    );
    assert.equal(parseStayGuest({ firstName: "A", lastName: "", email: "nope", phone: "1" }), null);
  });
});

describe("liteapi key", () => {
  it("prefers LITEAPI_API_KEY and treats sand_ as sandbox", () => {
    const both = readLiteApiKey({
      LITEAPI_API_KEY: "sand_primary",
      NUITEE_API_KEY: "prod_alias",
    });
    assert.equal(both?.source, "LITEAPI_API_KEY");
    assert.equal(both?.sandbox, true);
    const alias = readLiteApiKey({ NUITEE_API_KEY: "sandbox_alias" });
    assert.equal(alias?.source, "NUITEE_API_KEY");
    assert.equal(alias?.sandbox, true);
    assert.equal(readLiteApiKey({})?.key, undefined);
    assert.equal(readLiteApiKey({ LITEAPI_API_KEY: "prod_live" })?.sandbox, false);
  });
});
