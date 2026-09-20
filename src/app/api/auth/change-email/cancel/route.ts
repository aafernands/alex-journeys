import { NextResponse } from "next/server";
import { auth, isReaderAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  cancelPendingEmailChange,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isReaderAuthConfigured()) {
    return NextResponse.json(
      { error: "Account email change is unavailable." },
      { status: 503 },
    );
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
  const limited = rateLimit(`change-email-cancel:${userId}:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  try {
    await cancelPendingEmailChange(userId);
    return NextResponse.json({
      ok: true,
      message: "Pending email change cancelled.",
    });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Email change is temporarily unavailable." },
        { status: 503 },
      );
    }
    console.error("[api/auth/change-email/cancel] failed:", err);
    return NextResponse.json(
      { error: "Could not cancel email change." },
      { status: 500 },
    );
  }
}
