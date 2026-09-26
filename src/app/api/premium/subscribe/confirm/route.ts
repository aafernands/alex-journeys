import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/cms/rate-limit";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { isPremium, toMembershipPublic } from "@/lib/membership";
import { applySubscriptionSync } from "@/lib/membership-store";
import { isStripeSubscriptionId } from "@/lib/premium-join";
import { confirmPremiumSubscription } from "@/lib/stripe-premium";

export const runtime = "nodejs";

/**
 * Called after the Payment Element confirms (and after a 3DS or wallet
 * redirect). Reads the subscription from Stripe and syncs membership now,
 * so the reader doesn't wait on the webhook. Returns only public status.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "Accounts aren’t available." }, { status: 503 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`premium-confirm:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const subscriptionId =
    body && typeof body === "object" ? (body as { subscriptionId?: unknown }).subscriptionId : null;
  if (!isStripeSubscriptionId(subscriptionId)) {
    return NextResponse.json({ error: "Unknown subscription." }, { status: 400 });
  }

  try {
    const confirmed = await confirmPremiumSubscription(subscriptionId);
    if (!confirmed) {
      return NextResponse.json({ error: "Unknown subscription." }, { status: 404 });
    }
    const { sync } = confirmed;
    const member = isPremium({ membership: sync.membership });
    if (member) {
      await applySubscriptionSync(sync, Math.floor(Date.now() / 1000));
    }
    const publicMembership = toMembershipPublic(sync.membership);
    return NextResponse.json({
      isPremium: member,
      status: publicMembership.status,
      plan: publicMembership.plan,
      trialEnd: publicMembership.trialEnd,
    });
  } catch (err) {
    console.error("[premium] subscribe confirm failed:", err);
    return NextResponse.json({ error: "Could not confirm yet." }, { status: 502 });
  }
}
