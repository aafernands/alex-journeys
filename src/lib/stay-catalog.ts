/**
 * LiteAPI facility and property-type catalog.
 * Server-only. Names are matched in stay-catalog-match.ts.
 */

import "server-only";

import { LITEAPI_SEARCH_BASE, liteApiCall } from "@/lib/liteapi";
import {
  catalogFromPayloads,
  EMPTY_STAY_CATALOG,
  type StayCatalog,
} from "@/lib/stay-catalog-match";

export { facilityIdsFor, EMPTY_STAY_CATALOG, type StayCatalog } from "@/lib/stay-catalog-match";

const TTL_MS = 6 * 60 * 60 * 1000;

let cached: { expires: number; value: StayCatalog } | null = null;

export async function loadStayCatalog(): Promise<StayCatalog> {
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const [facilitiesPayload, typesPayload] = await Promise.all([
      liteApiCall({
        base: LITEAPI_SEARCH_BASE,
        path: "/data/facilities",
        timeoutMs: 8_000,
      }),
      liteApiCall({
        base: LITEAPI_SEARCH_BASE,
        path: "/data/hotelTypes",
        timeoutMs: 8_000,
      }),
    ]);
    const value = catalogFromPayloads(facilitiesPayload, typesPayload);
    cached = { expires: Date.now() + TTL_MS, value };
    return value;
  } catch {
    return cached?.value ?? EMPTY_STAY_CATALOG;
  }
}
