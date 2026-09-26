import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import { getMembership } from "@/lib/membership-store";
import { createPremiumPortal, getPremiumStripe } from "@/lib/stripe-premium";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!getPremiumStripe()) {
    return NextResponse.json(
      { error: "Managing membership isn’t available yet." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`premium-portal:${userId}:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let membership = null;
  try {
    membership = await getMembership(userId);
  } catch (err) {
    console.error("[premium] portal membership read failed:", err);
    return NextResponse.json(
      { error: "Membership isn’t available right now." },
      { status: 503 },
    );
  }
  const customerId = membership?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { error: "There’s no membership to manage yet." },
      { status: 404 },
    );
  }

  try {
    const url = await createPremiumPortal(customerId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[premium] portal create failed:", err);
    return NextResponse.json(
      { error: "The membership page isn’t available right now." },
      { status: 502 },
    );
  }
}
