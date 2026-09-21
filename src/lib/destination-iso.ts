/**
 * Map journal destinations to ISO 3166-1 alpha-2 codes for the Places world map.
 *
 * Codes below were verified against vendored Natural Earth 110m properties
 * (`src/content/geo/world-countries.geojson`: name, iso_a2, iso_a3):
 *   Iceland → IS / ISL
 *   Canada → CA / CAN
 *   United States → US / USA  (GeoJSON name "United States")
 *   Mexico → MX / MEX
 *   Brazil → BR / BRA
 *
 * Do not add a slug mapping unless the code exists on a feature in that file.
 * Unmapped destinations still show trip pins; their country is not highlighted.
 */

export type DestinationIsoInput = {
  slug: string;
  name: string;
};

export type CountryFeatureProperties = {
  name?: string;
  admin?: string;
  iso_a2?: string;
  iso_a3?: string;
  ISO_A2?: string;
  ISO_A3?: string;
  [key: string]: unknown;
};

/** Verified slug → ISO 3166-1 alpha-2. */
export const DESTINATION_ISO_A2_BY_SLUG: Readonly<Record<string, string>> = {
  iceland: "IS",
  canada: "CA",
  "united-states": "US",
  mexico: "MX",
  brazil: "BR",
};

const ISO_A2_RE = /^[A-Z]{2}$/;

export function isoA2ForDestination(
  dest: DestinationIsoInput,
): string | undefined {
  const mapped = DESTINATION_ISO_A2_BY_SLUG[dest.slug];
  return mapped;
}

export function featureIsoA2(
  props: CountryFeatureProperties | null | undefined,
): string | undefined {
  if (!props) return undefined;
  const raw = props.iso_a2 ?? props.ISO_A2;
  if (raw == null) return undefined;
  const code = String(raw).trim().toUpperCase();
  return ISO_A2_RE.test(code) ? code : undefined;
}

function normalizeName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Match a destination to a country feature.
 * 1) Verified slug → iso_a2
 * 2) Else exact name vs feature `name` or `admin` (no fuzzy / guessed codes)
 */
export function destinationMatchesCountryFeature(
  dest: DestinationIsoInput,
  props: CountryFeatureProperties | null | undefined,
): boolean {
  const featureCode = featureIsoA2(props);
  const mapped = isoA2ForDestination(dest);
  if (mapped) return featureCode === mapped;
  if (!props) return false;
  const destName = normalizeName(dest.name);
  if (!destName) return false;
  return (
    destName === normalizeName(props.name) ||
    destName === normalizeName(props.admin)
  );
}

export function findMatchingDestination<T extends DestinationIsoInput>(
  destinations: T[],
  props: CountryFeatureProperties | null | undefined,
): T | undefined {
  return destinations.find((d) => destinationMatchesCountryFeature(d, props));
}
