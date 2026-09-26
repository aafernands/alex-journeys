import { NextResponse } from "next/server";
import { isCredentialsAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import { startEmailVerification } from "@/lib/email-verification-store";
import {
  getUserById,
  registerCredentialsUser,
  UsersUnavailableError,
} from "@/lib/users";
import {
  clientIpFromRequest,
  verifyTurnstileToken,
} from "@/lib/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isCredentialsAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email sign-up isn’t available right now. Please try again later.",
      },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`register:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const record = body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    turnstileToken?: unknown;
  };
  const name = typeof record.name === "string" ? record.name : "";
  const email = typeof record.email === "string" ? record.email : "";
  const password = typeof record.password === "string" ? record.password : "";
  const turnstileToken =
    typeof record.turnstileToken === "string" ? record.turnstileToken : undefined;

  const turnstile = await verifyTurnstileToken(
    turnstileToken,
    clientIpFromRequest(request),
  );
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: turnstile.error || "Security check failed." },
      { status: 400 },
    );
  }

  try {
    const { user, pendingPassword } = await registerCredentialsUser({ name, email, password });
    // Send the confirm email. Never fail sign-up because mail is down.
    let verification: string = "skipped";
    try {
      const profile = await getUserById(user.id);
      if (profile) {
        const started = await startEmailVerification(
          profile,
          pendingPassword ? "add-password" : "verify",
        );
        verification = started.status;
      }
    } catch (err) {
      console.error("[api/auth/register] verification email failed:", err);
    }
    if (pendingPassword) {
      // The email already has an account (e.g. Google). The password only
      // switches on after the owner taps the link we just emailed.
      return NextResponse.json({
        ok: true,
        pendingPassword: true,
        verification,
        message:
          "This email already has an account. We sent a link to that inbox. Tap it to finish adding your password, or continue with Google.",
      });
    }
    return NextResponse.json({ ok: true, user, verification });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Sign-up is temporarily unavailable." },
        { status: 503 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Could not create account.";
    const status =
      message.includes("already exists") ||
      message.includes("required") ||
      message.includes("valid email") ||
      message.includes("at least 8")
        ? 400
        : 500;
    if (status === 500) {
      console.error("[api/auth/register] failed:", err);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
