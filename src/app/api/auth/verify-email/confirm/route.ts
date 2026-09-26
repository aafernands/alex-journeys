import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  normalizeVerificationCode,
  verificationErrorMessage,
} from "@/lib/email-verification";
import {
  confirmVerificationCode,
  confirmVerificationLink,
} from "@/lib/email-verification-store";
import { UsersUnavailableError } from "@/lib/users";

export const runtime = "nodejs";

/**
 * POST /api/auth/verify-email/confirm
 * - `{ code }` from a signed-in reader, or
 * - `{ uid, token }` from the email link (no sign-in needed).
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`verify-email-confirm:${ip}`, 15, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many tries. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("bad");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (typeof body.token === "string" && typeof body.uid === "string") {
      const result = await confirmVerificationLink(body.uid, body.token);
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              result.reason === "mismatch" || result.reason === "missing"
                ? "This link is no longer valid. Sign in and send yourself a new one."
                : verificationErrorMessage(result.reason),
          },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        purpose: result.purpose,
        message:
          result.purpose === "add-password"
            ? "Your password is set. You can now sign in with your email and password."
            : "Thanks! Your email is confirmed.",
      });
    }

    const session = await auth();
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    const code = normalizeVerificationCode(body.code);
    if (!code) {
      return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
    }
    const result = await confirmVerificationCode(userId, code);
    if (!result.ok) {
      return NextResponse.json({ error: verificationErrorMessage(result.reason) }, { status: 400 });
    }
    return NextResponse.json({ ok: true, purpose: "verify", message: "Thanks! Your email is confirmed." });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json({ error: "Accounts aren’t available right now." }, { status: 503 });
    }
    console.error("[api/auth/verify-email/confirm] failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
