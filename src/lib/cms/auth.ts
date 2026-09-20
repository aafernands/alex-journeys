/**
 * CMS auth: Auth.js admin session OR optional passcode cookie.
 * Swap / extend here without touching CMS pages/API.
 *
 * Public readers may have an Auth.js Google session (see src/auth.ts) —
 * that alone never unlocks the CMS; isAdmin / passcode still required.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth, isAdminEmail } from "@/auth";
import {
  CMS_COOKIE_MAX_AGE,
  CMS_COOKIE_NAME,
} from "@/lib/cms/constants";

export { CMS_COOKIE_MAX_AGE, CMS_COOKIE_NAME };

function getPasscode(): string | undefined {
  const value = process.env.CMS_PASSCODE;
  if (!value || !value.trim()) return undefined;
  return value;
}

/** True when CMS_PASSCODE is set (never returns or logs the value). */
export function isPasscodeConfigured(): boolean {
  return Boolean(getPasscode());
}

/**
 * Timing-safe passcode comparison. Returns false if unset or mismatch.
 * Never logs the passcode.
 */
export function verifyPasscode(input: unknown): boolean {
  const passcode = getPasscode();
  if (!passcode || typeof input !== "string") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(passcode);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** HMAC-signed session token using CMS_PASSCODE as the key. */
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

  const payload = `${version}.${issuedStr}`;
  const expected = createHmac("sha256", passcode)
    .update(payload)
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

/** True when the passcode httpOnly cookie is valid. */
export async function hasPasscodeSession(): Promise<boolean> {
  if (!isPasscodeConfigured()) return false;
  const jar = await cookies();
  return verifySessionToken(jar.get(CMS_COOKIE_NAME)?.value);
}

/**
 * Auth.js session for the current request, if any.
 * Useful when UI needs email / isAdmin beyond a boolean gate.
 */
export async function getCmsSession() {
  return auth();
}

/** True when Auth.js session belongs to an allowlisted CMS admin. */
export async function hasOauthAdminSession(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.isAdmin === true) return true;
  return isAdminEmail(session.user.email);
}

/**
 * Server-side CMS gate: Auth.js allowlisted admin OR valid passcode cookie.
 */
export async function isCmsAuthenticated(): Promise<boolean> {
  if (await hasOauthAdminSession()) return true;
  if (await hasPasscodeSession()) return true;
  return false;
}
