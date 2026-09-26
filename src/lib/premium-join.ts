/**
 * On-site Premium checkout (/premium/join). Pure helpers, safe on client and
 * server: form validation, plan parsing, and the Premium publishable key.
 *
 * The Premium Stripe account is not the Nuitee account used for flights, so
 * this never reads STRIPE_PUBLISHABLE_KEY or NUITEE_STRIPE_PUBLISHABLE_KEY.
 */
import { cleanPremiumEmail, type PremiumPlan } from "@/lib/membership";

export const PREMIUM_JOIN_PATH = "/premium/join";

export const PREMIUM_PUBLISHABLE_KEY_PATTERN = /^pk_(test|live)_[A-Za-z0-9]{8,200}$/;

const NAME_MAX = 60;
const PHONE_PATTERN = /^\+?[0-9 ()\-.]{6,24}$/;

export function premiumJoinHref(plan: PremiumPlan): string {
  return `${PREMIUM_JOIN_PATH}?plan=${plan}`;
}

export function parsePremiumPlan(value: unknown, fallback: PremiumPlan = "yearly"): PremiumPlan {
  if (value === "monthly" || value === "yearly") return value;
  return fallback;
}

function secretMode(env: NodeJS.ProcessEnv): "test" | "live" | null {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  return null;
}

/**
 * Publishable key for the Premium Stripe account, or null. Must be the same
 * mode (test/live) as STRIPE_SECRET_KEY, otherwise the Payment Element could
 * never confirm and the site falls back to hosted Checkout.
 */
export function premiumPublishableKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [
    env.NEXT_PUBLIC_STRIPE_PREMIUM_PUBLISHABLE_KEY,
    env.STRIPE_PREMIUM_PUBLISHABLE_KEY,
  ];
  const mode = secretMode(env);
  for (const raw of candidates) {
    const key = raw?.trim() ?? "";
    const match = PREMIUM_PUBLISHABLE_KEY_PATTERN.exec(key);
    if (!match) continue;
    if (mode && match[1] !== mode) continue;
    return key;
  }
  return null;
}

export type JoinDetails = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

export type JoinFieldErrors = Partial<Record<"email" | "confirmEmail" | "firstName" | "lastName" | "phone", string>>;

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  // Collapse whitespace and drop control characters.
  return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
}

export function validateJoinEmail(email: string, confirm: string): JoinFieldErrors {
  const errors: JoinFieldErrors = {};
  const clean = cleanPremiumEmail(email);
  if (!email.trim()) errors.email = "Enter your email.";
  else if (!clean) errors.email = "Enter a valid email, like you@example.com.";
  if (!confirm.trim()) errors.confirmEmail = "Confirm your email.";
  else if (clean && confirm.trim().toLowerCase() !== clean) {
    errors.confirmEmail = "The emails don’t match.";
  }
  return errors;
}

export function validateJoinName(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): JoinFieldErrors {
  const errors: JoinFieldErrors = {};
  const first = cleanName(input.firstName);
  const last = cleanName(input.lastName);
  if (!first) errors.firstName = "Enter your first name.";
  else if (first.length > NAME_MAX) errors.firstName = "That name is too long.";
  if (!last) errors.lastName = "Enter your last name.";
  else if (last.length > NAME_MAX) errors.lastName = "That name is too long.";
  const phone = input.phone.trim();
  if (phone && !PHONE_PATTERN.test(phone)) errors.phone = "Enter a phone number, or leave it blank.";
  return errors;
}

/** Server-side parse of the join request body. Returns null when invalid. */
export function parseJoinDetails(body: unknown): JoinDetails | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const email = cleanPremiumEmail(data.email);
  const firstName = cleanName(data.firstName);
  const lastName = cleanName(data.lastName);
  const phoneRaw = typeof data.phone === "string" ? data.phone.trim() : "";
  if (!email || !firstName || !lastName) return null;
  if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) return null;
  if (phoneRaw && !PHONE_PATTERN.test(phoneRaw)) return null;
  return { email, firstName, lastName, phone: phoneRaw || null };
}

export function isStripeSubscriptionId(value: unknown): value is string {
  return typeof value === "string" && /^sub_[A-Za-z0-9]{8,120}$/.test(value);
}
