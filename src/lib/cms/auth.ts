/**
 * CMS auth: Auth.js admin session OR optional passcode cookie.
 * Swap / extend here without touching CMS pages/API.
 *
 * Public readers may have an Auth.js Google session (see src/auth.ts) —
 * that alone never unlocks the CMS; isAdmin / passcode still required.
 */
import { cookies } from "next/headers";
import { auth, isAdminEmail } from "@/auth";
import {
  CMS_COOKIE_MAX_AGE,
  CMS_COOKIE_NAME,
} from "@/lib/cms/constants";
import {
  createSessionToken,
  cookieOptions,
  isPasscodeConfigured,
  verifyPasscode,
  verifySessionToken,
} from "@/lib/cms/passcode";

export {
  CMS_COOKIE_MAX_AGE,
  CMS_COOKIE_NAME,
  createSessionToken,
  cookieOptions,
  isPasscodeConfigured,
  verifyPasscode,
  verifySessionToken,
};

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
