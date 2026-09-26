import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { isPremium, isPremiumCheckoutConfigured } from "@/lib/membership";
import {
  getPendingMembership,
  getReaderMembership,
  resolveMembershipTarget,
  readTargetMembership,
} from "@/lib/membership-store";
import { parseJoinDetails, premiumPublishableKey } from "@/lib/premium-join";
import { createPremiumSubscription, emailHasLivePremium } from "@/lib/stripe-premium";

export const runtime = "nodejs";

const UNAVAILABLE = "Checkout isn’t available right now. Please try again.";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * On-site Premium checkout. Creates or reuses a Stripe customer and an
 * incomplete subscription, and returns the client secret for the Payment
 * Element. Works signed in (userId in metadata) or signed out (email in
 * metadata; the webhook links it to the reader account with that email).
 */
export async function POST(request: Request) {
  if (!isPremiumCheckoutConfigured() || !isFirebaseConfigured() || !premiumPublishableKey()) {
    return NextResponse.json(
      { error: "Membership checkout isn’t available here yet.", fallback: true },
      { status: 503 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id?.trim() || null;
  const sessionEmail = session?.user?.email?.trim().toLowerCase() || null;

  const limited = await rateLimit(`premium-subscribe:${userId ?? "anon"}:${clientIp(request)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const plan = record.plan;
  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json({ error: "Choose monthly or yearly." }, { status: 400 });
  }
  // Signed-in readers always subscribe as their account email.
  const details = parseJoinDetails({ ...record, email: sessionEmail ?? record.email });
  if (!details) {
    return NextResponse.json(
      { error: "Check your email and name, then try again." },
      { status: 400 },
    );
  }

  let customerId: string | null = null;
  try {
    if (userId) {
      const membership = await getReaderMembership(userId, sessionEmail);
      if (isPremium({ membership })) {
        return NextResponse.json({ alreadyMember: true, signedIn: true }, { status: 409 });
      }
      customerId = membership?.stripeCustomerId ?? null;
    } else {
      const target = await resolveMembershipTarget({
        userId: null,
        customerId: null,
        email: details.email,
      });
      const existing = target ? await readTargetMembership(target) : null;
      const pending = await getPendingMembership(details.email);
      if (
        isPremium({ membership: existing }) ||
        isPremium({ membership: pending }) ||
        (await emailHasLivePremium(details.email))
      ) {
        return NextResponse.json({ alreadyMember: true, signedIn: false }, { status: 409 });
      }
    }
  } catch (err) {
    console.error("[premium] subscribe membership check failed:", err);
    return NextResponse.json({ error: "Membership isn’t available right now." }, { status: 503 });
  }

  try {
    const result = await createPremiumSubscription({ userId, details, plan, customerId });
    if (result.kind === "already_member") {
      return NextResponse.json({ alreadyMember: true, signedIn: Boolean(userId) }, { status: 409 });
    }
    if (result.kind === "complete") {
      return NextResponse.json({ subscriptionId: result.subscriptionId, complete: true });
    }
    return NextResponse.json({
      subscriptionId: result.subscriptionId,
      clientSecret: result.clientSecret,
      intentType: result.intentType,
    });
  } catch (err) {
    console.error("[premium] subscribe failed:", err);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 502 });
  }
}
