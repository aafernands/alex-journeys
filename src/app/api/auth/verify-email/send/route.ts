import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import { isEmailConfigured } from "@/lib/email";
import { startEmailVerification } from "@/lib/email-verification-store";
import { getUserById, UsersUnavailableError } from "@/lib/users";

export const runtime = "nodejs";

/** POST /api/auth/verify-email/send — email the signed-in reader a new code. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "We can’t send emails right now. Please try again later." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`verify-email-send:${ip}`, 10, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const user = await getUserById(userId);
    if (!user || user.disabled) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    const result = await startEmailVerification(user, "verify");
    switch (result.status) {
      case "already_verified":
        return NextResponse.json({ ok: true, verified: true, message: "Your email is already confirmed." });
      case "rate_limited":
        return NextResponse.json(
          {
            error: `Please wait ${result.retryAfterSec >= 120 ? `${Math.ceil(result.retryAfterSec / 60)} minutes` : `${result.retryAfterSec} seconds`} before asking for another code.`,
            retryAfterSec: result.retryAfterSec,
          },
          { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
        );
      case "failed":
        return NextResponse.json(
          { error: "We couldn’t send the email. Please try again in a moment." },
          { status: 502 },
        );
      default:
        return NextResponse.json({ ok: true, message: `We sent a new code to ${user.email}.` });
    }
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json({ error: "Accounts aren’t available right now." }, { status: 503 });
    }
    console.error("[api/auth/verify-email/send] failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
