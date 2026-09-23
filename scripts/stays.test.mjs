import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readLiteApiKey } from "../src/lib/stays-config.ts";
import {
  formatStayMoney,
  buildStayConfirmation,
  classifyStayFailure,
  formatStayRange,
  mapBooking,
  mapHotelContent,
  mapPrebook,
  mapRoomOffers,
  mapStaySearch,
  parseStayGuest,
  parseStaysSearchParams,
  plainStayText,
  stayGuestFieldErrors,
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
    assert.equal(parsed.tripId, "");
    assert.equal(staysQueryIssue(parsed, new Date("2026-01-01T00:00:00Z")), null);

    const withTrip = staysPath({
      destination: "Paris",
      startDate: "2027-06-02",
      endDate: "2027-06-09",
      adults: 2,
      tripId: "trip_abc",
    });
    assert.equal(
      withTrip,
      "/stays?dest=Paris&start=2027-06-02&end=2027-06-09&adults=2&trip=trip_abc",
    );
    assert.equal(
      parseStaysSearchParams({
        dest: "Paris",
        start: "2027-06-02",
        end: "2027-06-09",
        adults: "2",
        trip: "trip_abc",
      }).tripId,
      "trip_abc",
    );
    assert.equal(
      parseStaysSearchParams({ dest: "Paris", trip: "not a trip" }).tripId,
      "",
    );
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
    assert.deepEqual(rooms[0].photos, []);
    assert.deepEqual(rooms[1].photos, []);
  });

  it("joins room photos from hotel content by mapped room id", () => {
    const hotel = {
      data: {
        id: "lp1897",
        name: "Hotel du Test",
        rooms: [
          {
            id: 5787126,
            roomName: "Studio King",
            photos: [
              {
                url: "http://insecure.example/skip.jpg",
                mainPhoto: true,
              },
              {
                url: "https://snaphotelapi.com/rooms-large-pictures/322367511.jpg",
                imageDescription: "Second",
                mainPhoto: false,
                score: 1,
              },
              {
                url: "https://snaphotelapi.com/rooms-large-pictures/322367522.jpg",
                imageDescription: "Main room",
                failoverPhoto:
                  "https://q-xx.bstatic.com/xdata/images/hotel/max1200/322367522.jpg?k=abc&o=",
                mainPhoto: true,
                score: 4,
              },
            ],
          },
          {
            id: "99",
            roomName: "Queen Room",
            photos: [{ url: "https://cdn.example.com/queen.jpg", imageDescription: "Queen" }],
          },
        ],
      },
    };
    const rooms = mapRoomOffers(
      {
        data: [
          {
            hotelId: "lp1897",
            roomTypes: [
              {
                offerId: "MAPPEDOFFER12345678",
                offerRetailRate: [{ amount: 180, currency: "USD" }],
                photos: [{ url: "https://cdn.example.com/decoy.jpg" }],
                rates: [
                  {
                    name: "Studio King – Non Refundable",
                    mappedRoomId: 5787126,
                    boardName: "Room Only",
                    cancellationPolicies: { refundableTag: "NRFN" },
                  },
                ],
              },
              {
                offerId: "NAMEONLYOFFER123456",
                offerRetailRate: [{ amount: 140, currency: "USD" }],
                rates: [
                  {
                    name: "Queen Room with city view",
                    boardName: "Breakfast",
                    cancellationPolicies: { refundableTag: "RFN" },
                  },
                ],
              },
              {
                offerId: "NOPHOTOOFFER1234567",
                offerRetailRate: [{ amount: 100, currency: "USD" }],
                rates: [{ name: "Bunk", boardName: "Room Only" }],
              },
            ],
          },
        ],
      },
      hotel,
    );
    const studio = rooms.find((room) => room.offerId === "MAPPEDOFFER12345678");
    const queen = rooms.find((room) => room.offerId === "NAMEONLYOFFER123456");
    const bunk = rooms.find((room) => room.offerId === "NOPHOTOOFFER1234567");
    assert.ok(studio && queen && bunk);
    assert.equal(studio.photos[0].url, "https://snaphotelapi.com/rooms-large-pictures/322367522.jpg");
    assert.equal(studio.photos[0].caption, "Main room");
    assert.match(studio.photos[0].fallbackUrl, /bstatic\.com/);
    assert.equal(studio.photos[1].url, "https://snaphotelapi.com/rooms-large-pictures/322367511.jpg");
    assert.equal(studio.photos.some((photo) => photo.url.startsWith("http://")), false);
    assert.equal(queen.photos[0].url, "https://cdn.example.com/queen.jpg");
    assert.deepEqual(bunk.photos, []);
  });

  it("uses photos embedded on a rate when the room is not mapped", () => {
    const [room] = mapRoomOffers({
      data: [
        {
          hotelId: "lp1897",
          roomTypes: [
            {
              offerId: "EMBEDDEDPHOTOS12345",
              offerRetailRate: [{ amount: 90, currency: "USD" }],
              photos: [
                { failoverPhoto: "https://cdn.example.com/backup.jpg", imageDescription: "Bath" },
              ],
              rates: [{ name: "Bath", boardName: "Room Only" }],
            },
          ],
        },
      ],
    });
    assert.equal(room.photos[0].url, "https://cdn.example.com/backup.jpg");
    assert.equal(room.photos[0].caption, "Bath");
    assert.equal(room.photos[0].fallbackUrl, undefined);
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
      guestEmail: "",
      roomName: "",
      boardName: "",
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

  it("reads cancellation windows and hotel remarks from a rate", () => {
    const [room] = mapRoomOffers({
      data: [
        {
          hotelId: "lp1897",
          roomTypes: [
            {
              offerId: "CANCELPOLICY123456",
              offerRetailRate: [{ amount: 200, currency: "USD" }],
              rates: [
                {
                  name: "Deluxe",
                  boardName: "Breakfast",
                  cancellationPolicies: {
                    refundableTag: "RFN",
                    hotelRemarks: ["City tax due at the property"],
                    cancelPolicyInfos: [
                      {
                        cancelTime: "2027-05-20 00:00:00",
                        amount: 0,
                        currency: "USD",
                        type: "amount",
                      },
                      {
                        cancelTime: "2027-06-01 00:00:00",
                        amount: 50,
                        currency: "USD",
                        type: "percentage",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(room.cancellation[0], "Free cancellation until May 20, 2027.");
    assert.equal(room.cancellation[1], "A 50% fee applies if you cancel after Jun 1, 2027.");
    assert.deepEqual(room.conditions, ["City tax due at the property"]);
  });
});

describe("stay confirmation and recovery", () => {
  const guest = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+12125550100",
  };
  const prebook = mapPrebook({
    data: {
      prebookId: "zzWkJcdgk",
      hotelId: "lp1897",
      currency: "USD",
      price: 240,
      termsAndConditions: "<p>Government ID required.</p>",
      checkin: "2027-06-02",
      checkout: "2027-06-06",
      secretKey: "pi_secret",
      roomTypes: [
        {
          rates: [
            {
              name: "Queen Room",
              boardName: "Breakfast",
              cancellationPolicies: {
                refundableTag: "NRFN",
                cancelPolicyInfos: [
                  { cancelTime: "2027-06-02", amount: 240, currency: "USD", type: "amount" },
                ],
              },
            },
          ],
        },
      ],
    },
  });

  it("builds a confirmation the Payment SDK can extend later", () => {
    assert.equal(formatStayRange("2027-06-02", "2027-06-06"), "Jun 2, 2027 – Jun 6, 2027");
    const booking = mapBooking({
      data: {
        bookingId: "book_123",
        status: "CONFIRMED",
        hotelConfirmationCode: "ABC123",
        hotel: { name: "Hotel du Test" },
        price: 240,
        currency: "USD",
        checkin: "2027-06-02",
        checkout: "2027-06-06",
        holder: { email: "ada@example.com" },
        bookedRooms: [{ roomType: { name: "Queen Room" }, boardName: "Breakfast" }],
      },
    });
    const confirmation = buildStayConfirmation({
      booking,
      hotelName: "Fallback Hotel",
      guest,
      prebook,
      query: { startDate: "2027-06-02", endDate: "2027-06-06" },
      sandbox: true,
    });
    assert.equal(confirmation.hotelName, "Hotel du Test");
    assert.equal(confirmation.confirmationCode, "ABC123");
    assert.equal(confirmation.bookingId, "book_123");
    assert.equal(confirmation.dateLabel, "Jun 2, 2027 – Jun 6, 2027");
    assert.equal(confirmation.roomName, "Queen Room");
    assert.equal(confirmation.rateLabel, "Breakfast · Non-refundable");
    assert.equal(confirmation.totalLabel, "$240");
    assert.equal(confirmation.guestEmail, "ada@example.com");
    assert.equal(confirmation.guestName, "Ada Lovelace");
    assert.equal(confirmation.terms, "Government ID required.");
    assert.match(confirmation.cancellation[0], /\$240/);
    assert.equal(confirmation.payment.method, "sandbox_account");
    assert.equal(JSON.stringify(confirmation).includes("pi_secret"), false);
    assert.equal(
      buildStayConfirmation({
        booking,
        hotelName: "Hotel du Test",
        guest,
        prebook,
        query: { startDate: "2027-06-02", endDate: "2027-06-06" },
        sandbox: false,
      }).payment.method,
      "guest_card",
    );
  });

  it("points sold-out and expired rates back to the room list", () => {
    assert.equal(
      classifyStayFailure({
        stage: "prebook",
        message: "This room is sold out",
      }).recovery,
      "refresh-rooms",
    );
    assert.equal(
      classifyStayFailure({
        stage: "book",
        message: "Offer expired",
      }).title,
      "That rate expired",
    );
    const held = classifyStayFailure({
      stage: "prebook",
      message: "Nuitee did not confirm that room. Pick another rate.",
    });
    assert.equal(held.recovery, "refresh-rooms");
    assert.equal(held.title, "That room couldn’t be held");
    const missed = classifyStayFailure({
      stage: "book",
      message: "Nuitee did not return a confirmation. Check the sandbox dashboard before trying again.",
    });
    assert.equal(missed.recovery, "retry-book");
    assert.match(missed.message, /dashboard/);
    assert.equal(
      classifyStayFailure({
        stage: "book",
        message: "Live card checkout isn’t turned on.",
        code: "live_checkout",
      }).recovery,
      "back-to-search",
    );
    assert.equal(
      classifyStayFailure({
        stage: "book",
        message: "Too many booking attempts. Wait a moment and try again.",
      }).recovery,
      "retry",
    );
  });

  it("rejects an incomplete guest before a booking request", () => {
    const errors = stayGuestFieldErrors({
      firstName: "",
      lastName: "Lovelace",
      email: "not-an-email",
      phone: "12",
    });
    assert.equal(errors.firstName, "Enter a first name.");
    assert.equal(errors.email, "Enter an email address.");
    assert.equal(errors.phone, "Enter a phone number with 7 to 15 digits.");
    assert.equal(Object.keys(stayGuestFieldErrors(guest)).length, 0);
    assert.ok(parseStayGuest(guest));
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
