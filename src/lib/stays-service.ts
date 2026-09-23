/**
 * Stays search, hotel detail, prebook, and sandbox book.
 * Server-only. Responses are mapped before they leave this module.
 */

import "server-only";

import {
  LITEAPI_BOOK_BASE,
  LITEAPI_SEARCH_BASE,
  LiteApiError,
  liteApiCall,
  liteApiKeyInfo,
} from "@/lib/liteapi";
import {
  isStayHotelId,
  isStayOfferId,
  isStayPrebookId,
  mapBooking,
  mapHotelContent,
  mapPrebook,
  mapRoomOffers,
  mapStayReviews,
  mapStaySearch,
  stayOccupancies,
  staysQueryIssue,
  type StayBooking,
  type StayGuest,
  type StayHotelContent,
  type StayListItem,
  type StayPrebook,
  type StayReviewSummary,
  type StayRoomOffer,
  type StaysQuery,
} from "@/lib/stays";

export type StaySearchResult = {
  sandbox: boolean;
  placeName: string;
  stays: StayListItem[];
};

export type StayHotelResult = {
  sandbox: boolean;
  hotel: StayHotelContent | null;
  reviews: StayReviewSummary;
  rooms: StayRoomOffer[];
};

export type StaySuggestion = {
  id: string;
  name: string;
  photo: string;
  rating: number | null;
  reviewCount: number;
  stars: number | null;
  neighborhood: string;
  city: string;
  facilities: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hotelSuggestionRows(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.hotels)) return root.hotels;
  const data = asRecord(root.data);
  if (data && Array.isArray(data.hotels)) return data.hotels;
  return [];
}

function mapHotelSuggestions(payload: unknown): StaySuggestion[] {
  const suggestions: StaySuggestion[] = [];
  for (const row of hotelSuggestionRows(payload)) {
    const record = asRecord(row);
    if (!record) continue;
    const rawId = record.id ?? record.hotelId;
    const fallbackId =
      typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "";
    if (!fallbackId) continue;
    const hotel = mapHotelContent({ data: record }, fallbackId);
    if (!hotel) continue;
    suggestions.push({
      id: hotel.id,
      name: hotel.name,
      photo: hotel.photos[0]?.url ?? "",
      rating: hotel.rating,
      reviewCount: hotel.reviewCount,
      stars: hotel.stars,
      neighborhood: hotel.neighborhood,
      city: hotel.city,
      facilities: hotel.facilities.slice(0, 4),
    });
  }
  return suggestions;
}

function suggestionScore(hotel: StaySuggestion): number {
  const rating = hotel.rating ?? 0;
  const reviews = Math.min(5000, Math.max(0, hotel.reviewCount));
  const stars = hotel.stars ?? 0;
  return (hotel.photo ? 50 : 0) + rating * 20 + Math.log10(reviews + 1) * 15 + stars * 3;
}

/**
 * Date-free hotel discovery for editorial cards.
 * Uses Nuitee hotel metadata only; live room rates still require travel dates.
 */
export async function suggestStay(destination: string): Promise<StaySuggestion | null> {
  const clean = destination.trim().slice(0, 80);
  if (!clean) return null;
  const info = liteApiKeyInfo();
  if (!info) return null;

  try {
    const place = await placeIdFor(clean);
    const query: Record<string, string | undefined> = {
      language: "en",
      limit: "20",
      minRating: "8",
      minReviewsCount: "25",
      ...(place?.placeId ? { placeId: place.placeId } : { aiSearch: `well reviewed hotels in ${clean}` }),
    };
    let payload = await liteApiCall({
      base: LITEAPI_SEARCH_BASE,
      path: "/data/hotels",
      query,
      timeoutMs: 10_000,
    });
    let hotels = mapHotelSuggestions(payload);

    // Some smaller destinations will not have enough highly reviewed properties.
    if (hotels.length === 0) {
      payload = await liteApiCall({
        base: LITEAPI_SEARCH_BASE,
        path: "/data/hotels",
        query: {
          language: "en",
          limit: "20",
          ...(place?.placeId ? { placeId: place.placeId } : { aiSearch: `hotels in ${clean}` }),
        },
        timeoutMs: 10_000,
      });
      hotels = mapHotelSuggestions(payload);
    }

    hotels.sort((a, b) => suggestionScore(b) - suggestionScore(a));
    return hotels[0] ?? null;
  } catch {
    // Editorial cards should never break an article when Nuitee is unavailable.
    return null;
  }
}

function ratesBody(query: StaysQuery, extra: Record<string, unknown>) {
  return {
    checkin: query.startDate,
    checkout: query.endDate,
    currency: "USD",
    guestNationality: "US",
    occupancies: stayOccupancies(query),
    timeout: 6,
    limit: 24,
    sessionId: query.sessionId || undefined,
    sort: [{ field: "price", direction: "ascending" }],
    ...extra,
  };
}

async function placeIdFor(destination: string): Promise<{ placeId: string; label: string } | null> {
  try {
    const payload = await liteApiCall({
      base: LITEAPI_SEARCH_BASE,
      path: "/data/places",
      query: { textQuery: destination, type: "locality", language: "en" },
      timeoutMs: 8_000,
    });
    const root = payload && typeof payload === "object" ? (payload as { data?: unknown }) : null;
    const list = Array.isArray(root?.data) ? root.data : [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const record = item as { placeId?: unknown; displayName?: unknown; formattedAddress?: unknown };
      const placeId = typeof record.placeId === "string" ? record.placeId.trim() : "";
      if (!placeId || placeId.length > 256) continue;
      const label =
        (typeof record.formattedAddress === "string" && record.formattedAddress.trim()) ||
        (typeof record.displayName === "string" && record.displayName.trim()) ||
        destination;
      return { placeId, label: label.slice(0, 120) };
    }
  } catch (error) {
    if (error instanceof LiteApiError && error.code === "not_configured") throw error;
  }
  return null;
}

async function postRates(query: StaysQuery, extra: Record<string, unknown>): Promise<unknown> {
  return liteApiCall({
    base: LITEAPI_SEARCH_BASE,
    path: "/hotels/rates",
    method: "POST",
    body: ratesBody(query, extra),
    timeoutMs: 12_000,
  });
}

export async function searchStays(query: StaysQuery): Promise<StaySearchResult> {
  const issue = staysQueryIssue(query);
  const previewWithoutDates = issue === "Add check-in and check-out.";
  if (issue && !previewWithoutDates) {
    throw new LiteApiError(issue, 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) {
    throw new LiteApiError("Stays aren’t configured.", 503, "not_configured");
  }

  const place = await placeIdFor(query.destination);
  let payload: unknown = null;
  if (place) {
    payload = await postRates(query, {
      placeId: place.placeId,
      maxRatesPerHotel: 1,
    });
  }
  let stays = mapStaySearch(payload);
  if (stays.length === 0) {
    payload = await postRates(query, {
      aiSearch: `hotels in ${query.destination}`,
      maxRatesPerHotel: 1,
    });
    stays = mapStaySearch(payload);
  }

  return {
    sandbox: info.sandbox,
    placeName: place?.label || query.destination,
    stays,
  };
}

export async function loadStayHotel(
  hotelId: string,
  query: StaysQuery,
): Promise<StayHotelResult> {
  if (!isStayHotelId(hotelId)) {
    throw new LiteApiError("That hotel link is not valid.", 400, "bad_request");
  }
  const issue = staysQueryIssue(query);
  if (issue) throw new LiteApiError(issue, 400, "bad_request");
  const info = liteApiKeyInfo();
  if (!info) {
    throw new LiteApiError("Stays aren’t configured.", 503, "not_configured");
  }

  const [contentResult, ratesResult, reviewsResult] = await Promise.allSettled([
    liteApiCall({
      base: LITEAPI_SEARCH_BASE,
      path: "/data/hotel",
      query: { hotelId, language: "en" },
      timeoutMs: 12_000,
    }),
    previewWithoutDates
      ? Promise.resolve(null)
      : postRates(query, {
          hotelIds: [hotelId],
          includeHotelData: true,
          maxRatesPerHotel: 8,
          roomMapping: true,
          limit: 1,
        }),
    liteApiCall({
      base: LITEAPI_SEARCH_BASE,
      path: "/data/reviews",
      query: { hotelId, limit: "100", getSentiment: "true" },
      timeoutMs: 12_000,
    }),
  ]);

  if (
    contentResult.status === "rejected" &&
    !previewWithoutDates &&
    ratesResult.status === "rejected"
  ) {
    const error = ratesResult.reason;
    if (error instanceof LiteApiError) throw error;
    throw new LiteApiError("Nuitee could not load this hotel.", 502, "upstream");
  }

  const contentPayload = contentResult.status === "fulfilled" ? contentResult.value : null;
  const ratesPayload = ratesResult.status === "fulfilled" ? ratesResult.value : null;
  const reviewsPayload = reviewsResult.status === "fulfilled" ? reviewsResult.value : null;
  const hotel = contentPayload ? mapHotelContent(contentPayload, hotelId) : null;
  const reviews = reviewsPayload
    ? mapStayReviews(reviewsPayload)
    : { count: 0, average: null, categories: [], pros: [], cons: [], reviews: [] };
  const rooms = ratesPayload ? mapRoomOffers(ratesPayload, contentPayload) : [];

  if (!hotel && rooms.length === 0) {
    const error =
      ratesResult.status === "rejected"
        ? ratesResult.reason
        : contentResult.status === "rejected"
          ? contentResult.reason
          : null;
    if (error instanceof LiteApiError) throw error;
    throw new LiteApiError("Nuitee could not load this hotel.", 502, "upstream");
  }

  return { sandbox: info.sandbox, hotel, reviews, rooms };
}

export async function prebookStay(offerId: string): Promise<StayPrebook> {
  if (!isStayOfferId(offerId)) {
    throw new LiteApiError("Choose a room before continuing.", 400, "bad_request");
  }
  const payload = await liteApiCall({
    base: LITEAPI_BOOK_BASE,
    path: "/rates/prebook",
    method: "POST",
    body: { offerId, usePaymentSdk: false },
    timeoutMs: 20_000,
  });
  const prebook = mapPrebook(payload);
  if (!prebook) {
    throw new LiteApiError(
      "Nuitee did not confirm that room. Pick another rate.",
      502,
      "upstream",
    );
  }
  return prebook;
}

export async function bookStay(input: {
  prebookId: string;
  clientReference: string;
  guest: StayGuest;
  rooms: number;
}): Promise<StayBooking> {
  if (!isStayPrebookId(input.prebookId)) {
    throw new LiteApiError("That checkout session expired. Pick the room again.", 400, "bad_request");
  }
  const info = liteApiKeyInfo();
  if (!info) {
    throw new LiteApiError("Stays aren’t configured.", 503, "not_configured");
  }
  if (!info.sandbox) {
    throw new LiteApiError(
      "Live card checkout isn’t turned on. A sandbox key can complete a test booking.",
      409,
      "live_checkout",
    );
  }

  const roomCount = Math.min(8, Math.max(1, Math.trunc(input.rooms) || 1));
  const guests = Array.from({ length: roomCount }, (_, index) => ({
    occupancyNumber: index + 1,
    firstName: input.guest.firstName,
    lastName: input.guest.lastName,
    email: input.guest.email,
  }));

  const payload = await liteApiCall({
    base: LITEAPI_BOOK_BASE,
    path: "/rates/book",
    method: "POST",
    body: {
      prebookId: input.prebookId,
      clientReference: input.clientReference,
      holder: input.guest,
      guests,
      payment: { method: "ACC_CREDIT_CARD" },
    },
    timeoutMs: 25_000,
  });
  const booking = mapBooking(payload);
  if (!booking) {
    throw new LiteApiError(
      "Nuitee did not return a confirmation. Check the sandbox dashboard before trying again.",
      502,
      "upstream",
    );
  }
  return booking;
}
