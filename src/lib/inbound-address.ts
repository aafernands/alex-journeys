/**
 * Forward-to-inbox addresses. Safe to import from client components.
 * The local part is the mailbox token. The host comes from
 * INBOUND_EMAIL_DOMAIN (default inbound.fernandesjourneys.com).
 */

const DEFAULT_DOMAIN = "inbound.fernandesjourneys.com";

/** 128-bit token. Hex is case-insensitive, which email local-parts require. */
const TOKEN_RE = /^[a-f0-9]{32}$/;

export function isInboundToken(value: string): boolean {
  return TOKEN_RE.test(value);
}

export function createInboundToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
 * Tokens addressed on our inbound host.
 * Accepts `{token}@domain` and `trip+{token}@domain` (plus-addressing).
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
      if (!isInboundToken(candidate) || found.includes(candidate)) continue;
      found.push(candidate);
    }
  }
  return found;
}
