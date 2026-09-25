/**
 * Match LiteAPI facility and hotel-type names to the filters we can show.
 * Safe to import from tests and client code. The network fetch stays server-side.
 */

import {
  amenityLabelForFacility,
  classifyStayPropertyType,
  scoreStayAmenity,
  STAY_AMENITY_KEYS,
  type StayAmenityKey,
  type StayAmenityOption,
} from "@/lib/stay-filters";

export type StayCatalog = {
  amenities: StayAmenityOption[];
  hotelTypeIds: number[];
  homeTypeIds: number[];
  /** Both sides resolved, so Any / Hotels / Homes can be shown. */
  propertyTypes: boolean;
};

export const EMPTY_STAY_CATALOG: StayCatalog = {
  amenities: [],
  hotelTypeIds: [],
  homeTypeIds: [],
  propertyTypes: false,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rows(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  return [];
}

function positiveId(value: unknown): number | null {
  const id = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000) return null;
  return id;
}

export function catalogFromPayloads(facilitiesPayload: unknown, typesPayload: unknown): StayCatalog {
  const best = new Map<StayAmenityKey, StayAmenityOption & { score: number }>();
  for (const row of rows(facilitiesPayload)) {
    const record = asRecord(row);
    if (!record) continue;
    const facilityId = positiveId(record.facility_id ?? record.facilityId ?? record.id);
    const facilityName =
      typeof record.facility === "string"
        ? record.facility
        : typeof record.name === "string"
          ? record.name
          : "";
    if (!facilityId || !facilityName.trim()) continue;
    for (const key of STAY_AMENITY_KEYS) {
      const score = scoreStayAmenity(key, facilityName);
      if (score <= 0) continue;
      const current = best.get(key);
      const shorter =
        current != null &&
        score === current.score &&
        facilityName.trim().length < current.facilityName.length;
      if (!current || score > current.score || shorter) {
        best.set(key, {
          key,
          label: amenityLabelForFacility(key, facilityName),
          facilityId,
          facilityName: facilityName.trim().slice(0, 80),
          score,
        });
      }
    }
  }

  const hotelTypeIds: number[] = [];
  const homeTypeIds: number[] = [];
  for (const row of rows(typesPayload)) {
    const record = asRecord(row);
    if (!record) continue;
    const id = positiveId(record.id);
    const name = typeof record.name === "string" ? record.name : "";
    if (!id || !name.trim()) continue;
    const kind = classifyStayPropertyType(name);
    if (kind === "hotel" && !hotelTypeIds.includes(id)) hotelTypeIds.push(id);
    if (kind === "home" && !homeTypeIds.includes(id)) homeTypeIds.push(id);
  }

  return {
    amenities: STAY_AMENITY_KEYS.flatMap((key) => {
      const option = best.get(key);
      if (!option) return [];
      return [
        {
          key: option.key,
          label: option.label,
          facilityId: option.facilityId,
          facilityName: option.facilityName,
        },
      ];
    }),
    hotelTypeIds,
    homeTypeIds,
    propertyTypes: hotelTypeIds.length > 0 && homeTypeIds.length > 0,
  };
}

/** Facility ids the catalog can actually filter, in amenity order. */
export function facilityIdsFor(catalog: StayCatalog, keys: readonly StayAmenityKey[]): number[] {
  const ids: number[] = [];
  for (const key of keys) {
    const option = catalog.amenities.find((amenity) => amenity.key === key);
    if (option && !ids.includes(option.facilityId)) ids.push(option.facilityId);
  }
  return ids;
}
