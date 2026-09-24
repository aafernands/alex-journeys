/**
 * Forward-to-inbox addresses. Safe to import from client components.
 *
 * New mailboxes use `{slug}-{NN}@domain`: the reader's first name, slugified
 * to lowercase ASCII letters, digits, and hyphens, plus an unused two-digit
 * suffix. A signed-in reader with no usable first name gets the stem `trip`
 * (guests still have to sign in; they do not receive an address). After every
 * `00`–`99` suffix for that slug is already stored, allocation uses a
 * three-digit suffix, then four. It does not fall back to a 32-hex token.
 *
 * Addresses already saved — including legacy 32-hex local-parts — stay as they
 * are. The webhook matches both shapes. The host comes from
 * INBOUND_EMAIL_DOMAIN (default inbound.alexjourneys.com).
 */

const DEFAULT_DOMAIN = "inbound.alexjourneys.com";

/** Stem when the display name has no letters or digits to keep. */
export const INBOUND_NAME_FALLBACK = "trip";

const SLUG_MAX = 40;

/** 128-bit legacy token. Hex is case-insensitive, which email local-parts require. */
const LEGACY_TOKEN_RE = /^[a-f0-9]{32}$/;

/**
 * Friendly local-part. The common case ends in two digits (`alex-24`).
 * Three or four digits appear only after shorter suffixes for that slug are taken.
 */
const FRIENDLY_LOCAL_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?-\d{2,4}$/;

const THREE_DIGIT_SAMPLES = 24;
const FOUR_DIGIT_SAMPLES = 16;

/** True for a legacy 32-hex mailbox token. */
export function isInboundToken(value: string): boolean {
  return LEGACY_TOKEN_RE.test(value);
}

/** True for `firstname-NN` (or a longer numeric suffix). */
export function isFriendlyInboundLocalPart(value: string): boolean {
  return FRIENDLY_LOCAL_RE.test(value);
}

/** Legacy hex token or a friendly local-part. Lookup accepts both. */
export function isInboundLocalPart(value: string): boolean {
  return isInboundToken(value) || isFriendlyInboundLocalPart(value);
}

/**
 * First word of a display name, folded to a mailbox slug.
 * Blank names and names with no Latin letters or digits become `trip`.
 */
export function slugifyInboundName(displayName: string | null | undefined): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0] ?? "";
  // NFKD does not split ø, æ, ł, and a few other Latin letters.
  const folded = first
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/ŋ/g, "ng")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  let slug = folded
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > SLUG_MAX) slug = slug.slice(0, SLUG_MAX).replace(/-+$/g, "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return INBOUND_NAME_FALLBACK;
  return slug;
}

/** 128-bit token kept for legacy mailboxes. New addresses use friendly local-parts. */
export function createInboundToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomInt(exclusiveMax: number): number {
  if (exclusiveMax <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / exclusiveMax) * exclusiveMax;
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0] ?? 0;
  } while (value >= limit);
  return value % exclusiveMax;
}

function shuffleSuffixes(
  count: number,
  width: number,
  nextInt: (exclusiveMax: number) => number,
): string[] {
  const values = Array.from({ length: count }, (_, index) => String(index).padStart(width, "0"));
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = nextInt(i + 1);
    const swap = values[i];
    values[i] = values[j] ?? swap;
    values[j] = swap;
  }
  return values;
}

/**
 * Local-parts to try, in order. Every two-digit suffix is listed before any
 * longer one, shuffled so the first choice is not always `-00`.
 * Pass a display name (`Alex Fernandes`) or an existing slug (`alex`).
 */
export function inboundLocalPartAttempts(
  displayName: string | null | undefined,
  nextInt: (exclusiveMax: number) => number = randomInt,
): string[] {
  const slug = slugifyInboundName(displayName);
  const attempts: string[] = [];
  const seen = new Set<string>();
  const push = (suffix: string) => {
    const local = `${slug}-${suffix}`;
    if (!isFriendlyInboundLocalPart(local) || seen.has(local)) return;
    seen.add(local);
    attempts.push(local);
  };
  for (const suffix of shuffleSuffixes(100, 2, nextInt)) push(suffix);
  for (let i = 0; i < THREE_DIGIT_SAMPLES; i += 1) {
    push(String(nextInt(1000)).padStart(3, "0"));
  }
  for (let i = 0; i < FOUR_DIGIT_SAMPLES; i += 1) {
    push(String(nextInt(10_000)).padStart(4, "0"));
  }
  return attempts;
}

/** First attempt that is not already assigned. Null when every attempt is taken. */
export function firstAvailableLocalPart(
  attempts: readonly string[],
  taken: ReadonlySet<string>,
): string | null {
  for (const local of attempts) {
    if (!taken.has(local)) return local;
  }
  return null;
}

export function inboundEmailDomain(): string {
  const raw = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase().replace(/^@/, "") ?? "";
  const host = raw.replace(/\.$/, "");
  if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) {
    return host;
  }
  return DEFAULT_DOMAIN;
}

export function formatInboundAddress(token: string, domain = inboundEmailDomain()): string {
  return `${token}@${domain}`;
}

function bareEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const angle = trimmed.match(/<([^<>\s]+)>/);
  return (angle?.[1] ?? trimmed).replace(/^mailto:/, "");
}

/**
 * Local-parts addressed on our inbound host.
 * Accepts `{local}@domain` and `trip+{local}@domain` (plus-addressing),
 * for both friendly local-parts and legacy 32-hex tokens.
 */
export function tokensFromRecipients(
  addresses: readonly string[],
  domain = inboundEmailDomain(),
): string[] {
  const host = domain.trim().toLowerCase();
  const found: string[] = [];
  for (const raw of addresses) {
    if (typeof raw !== "string") continue;
    const email = bareEmail(raw);
    const at = email.lastIndexOf("@");
    if (at <= 0 || at === email.length - 1) continue;
    if (email.slice(at + 1) !== host) continue;
    const local = email.slice(0, at);
    const candidates = local.split("+").map((part) => part.trim());
    if (!candidates.includes(local)) candidates.push(local);
    for (const candidate of candidates) {
      if (!isInboundLocalPart(candidate) || found.includes(candidate)) continue;
      found.push(candidate);
    }
  }
  return found;
}
