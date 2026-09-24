import { NextResponse } from "next/server";
import { isCredentialsAuthConfigured } from "@/auth";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
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
  getUserById,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * POST /api/cms/users/[id]/send-reset — CMS admin sends the same 1-hour
 * password-reset email as self-serve forgot-password. Google-only users
 * (no passwordHash) may receive a link that *sets* a password. Never returns
 * the raw token.
 */
export async function POST(_request: Request, ctx: Ctx) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }
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

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  try {
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (user.disabled) {
      return NextResponse.json(
        { error: "This account is disabled. Enable it before sending a reset link." },
        { status: 400 },
      );
    }
    if (!user.email?.trim()) {
      return NextResponse.json(
        { error: "This user has no email address." },
        { status: 400 },
      );
    }

    const { rawToken } = await createPasswordResetToken(user, {
      allowWithoutPassword: true,
    });
    const resetUrl = `${publicSiteOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const html = `
      <p>Hi${user.name ? ` ${escapeHtml(user.name)}` : ""},</p>
      <p>We received a request to reset your Alex Journeys password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      <p style="color:#888;font-size:12px;">Or paste this URL:<br/>${escapeHtml(resetUrl)}</p>
    `;
    const text = [
      `Reset your Alex Journeys password:`,
      resetUrl,
      "",
      "This link expires in 1 hour. If you did not request a reset, ignore this email.",
    ].join("\n");

    await sendEmail({
      to: user.email,
      subject: "Reset your Alex Journeys password",
      html,
      text,
    });

    return NextResponse.json({
      ok: true,
      email: user.email,
      message: `Reset email sent to ${user.email}.`,
    });
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    if (err instanceof EmailSendError) {
      console.error("[api/cms/users/send-reset] send failed:", err);
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
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("no email") ||
      message.includes("disabled") ||
      message.includes("has no password") ||
      message.includes("Google sign-in")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/cms/users/send-reset] failed:", err);
    return NextResponse.json(
      { error: "Could not send reset email." },
      { status: 500 },
    );
  }
}
