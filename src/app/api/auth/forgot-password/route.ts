import { NextResponse } from "next/server";
import { isCredentialsAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  EmailNotConfiguredError,
  EmailSendError,
  clientSafeEmailErrorMessage,
  isEmailConfigured,
  publicSiteOrigin,
  sendEmail,
} from "@/lib/email";
import {
  createPasswordResetToken,
  getUserByEmail,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

const GENERIC_OK =
  "If an account with that email exists and can reset a password, you will receive a reset link shortly.";

export async function POST(request: Request) {
  if (!isCredentialsAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Password reset is unavailable. Set AUTH_SECRET and Firebase env vars.",
      },
      { status: 503 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured. Set RESEND_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`forgot-password:${ip}`, 5, 60_000);
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

  const emailRaw =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    const user = await getUserByEmail(email);

    // Unknown email → generic success (no enumeration).
    if (!user || user.disabled) {
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }

    // Google-only (or OAuth-only) — no passwordHash. Clear message; do not
    // pretend an email was sent.
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This account uses Google sign-in and has no password. Use Continue with Google on the sign-in page.",
          code: "google_only",
        },
        { status: 400 },
      );
    }

    const { rawToken } = await createPasswordResetToken(user);
    const resetUrl = `${publicSiteOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const html = `
      <p>Hi${user.name ? ` ${escapeHtml(user.name)}` : ""},</p>
      <p>We received a request to reset your Fernandes Journeys password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      <p style="color:#888;font-size:12px;">Or paste this URL:<br/>${escapeHtml(resetUrl)}</p>
    `;
    const text = [
      `Reset your Fernandes Journeys password:`,
      resetUrl,
      "",
      "This link expires in 1 hour. If you did not request a reset, ignore this email.",
    ].join("\n");

    await sendEmail({
      to: user.email,
      subject: "Reset your Fernandes Journeys password",
      html,
      text,
    });

    return NextResponse.json({ ok: true, message: GENERIC_OK });
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (err instanceof EmailSendError) {
      console.error("[api/auth/forgot-password] send failed:", err);
      // Forward Resend's message (already sanitized in EmailSendError) so the
      // UI can show e.g. testing-recipient restrictions instead of a vague 502.
      return NextResponse.json(
        {
          error: clientSafeEmailErrorMessage(
            err.message?.trim() ||
              "Could not send reset email. Try again later.",
          ),
        },
        { status: 502 },
      );
    }
    console.error("[api/auth/forgot-password] failed:", err);
    return NextResponse.json(
      { error: "Could not process password reset." },
      { status: 500 },
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
