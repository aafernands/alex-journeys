import { createHmac, timingSafeEqual } from "node:crypto";
import { CMS_COOKIE_MAX_AGE } from "@/lib/cms/constants";

function getPasscode(): string | undefined {
  const value = process.env.CMS_PASSCODE;
  if (!value || !value.trim()) return undefined;
  return value;
}

export function isPasscodeConfigured(): boolean {
  return Boolean(getPasscode());
}

export function verifyPasscode(input: unknown): boolean {
  const passcode = getPasscode();
  if (!passcode || typeof input !== "string") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(passcode);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(): string | null {
  const passcode = getPasscode();
  if (!passcode) return null;
  const issued = Math.floor(Date.now() / 1000).toString();
  const payload = `v1.${issued}`;
  const sig = createHmac("sha256", passcode)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  const passcode = getPasscode();
  if (!passcode || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, issuedStr, sig] = parts;
  if (version !== "v1" || !issuedStr || !sig) return false;

  const issued = Number(issuedStr);
  if (!Number.isFinite(issued)) return false;
  if (Math.floor(Date.now() / 1000) - issued > CMS_COOKIE_MAX_AGE) return false;

  const expected = createHmac("sha256", passcode)
    .update(`${version}.${issuedStr}`)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function cookieOptions(maxAge = CMS_COOKIE_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}