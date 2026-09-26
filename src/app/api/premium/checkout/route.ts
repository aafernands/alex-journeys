import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  isPremium,
  isPremiumCheckoutConfigured,
  type PremiumPlan,
} from "@/lib/membership";
import { getMembership } from "@/lib/membership-store";
import { createPremiumCheckout } from "@/lib/stripe-premium";

export const runtime = "nodejs";

const COMING_SOON = "Membership is coming soon.";

export async function POST(request: Request) {
  if (!isPremiumCheckoutConfigured() || !isFirebaseConfigured()) {
    return NextResponse.json({ error: COMING_SOON, comingSoon: true }, { status: 503 });
  }

  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`premium-checkout:${userId}:${ip}`, 8, 60_000);
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
    body = {};
  }
  const plan =
    body && typeof body === "object" && "plan" in body
      ? (body as { plan?: unknown }).plan
      : null;
  if (plan !== "monthly" && plan !== "yearly") {
    return NextResponse.json({ error: "Choose monthly or yearly." }, { status: 400 });
  }

  let membership = null;
  try {
    membership = await getMembership(userId);
  } catch (err) {
    console.error("[premium] checkout membership read failed:", err);
    return NextResponse.json(
      { error: "Membership isn’t available right now." },
      { status: 503 },
    );
  }
  if (isPremium({ membership })) {
    return NextResponse.json(
      { error: "You already have Premium.", alreadyMember: true },
      { status: 409 },
    );
  }

  const email = session?.user?.email?.trim() || null;
  try {
    const url = await createPremiumCheckout({
      userId,
      email,
      plan: plan as PremiumPlan,
      customerId: membership?.stripeCustomerId ?? null,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[premium] checkout create failed:", err);
    return NextResponse.json(
      { error: "Checkout isn’t available right now. Please try again." },
      { status: 502 },
    );
  }
}
