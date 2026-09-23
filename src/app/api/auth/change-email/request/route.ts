import { NextResponse } from "next/server";
import { auth, isReaderAuthConfigured } from "@/auth";
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
  requestEmailChange,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  if (!isReaderAuthConfigured()) {
    return NextResponse.json(
      { error: "Account email change is unavailable." },
      { status: 503 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Changing your email isn’t available right now. Please try again later.",
      },
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
  const limited = await rateLimit(`change-email-request:${userId}:${ip}`, 5, 60_000);
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
    newEmail?: unknown;
    currentPassword?: unknown;
  };
  const newEmail =
    typeof record.newEmail === "string" ? record.newEmail : "";
  const currentPassword =
    typeof record.currentPassword === "string"
      ? record.currentPassword
      : undefined;

  try {
    const result = await requestEmailChange({
      userId,
      newEmail,
      currentPassword,
    });

    const confirmUrl = `${publicSiteOrigin()}/account/confirm-email?token=${encodeURIComponent(result.rawToken)}`;

    const verifyHtml = `
      <p>Hi${result.user.name ? ` ${escapeHtml(result.user.name)}` : ""},</p>
      <p>Confirm your new email address for Fernandes Journeys.</p>
      <p><a href="${confirmUrl}">Confirm email change</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      <p style="color:#888;font-size:12px;">Or paste this URL:<br/>${escapeHtml(confirmUrl)}</p>
    `;
    const verifyText = [
      "Confirm your new email address for Fernandes Journeys:",
      confirmUrl,
      "",
      "This link expires in 1 hour. If you did not request this, ignore this email.",
    ].join("\n");

    await sendEmail({
      to: result.newEmail,
      subject: "Confirm your new Fernandes Journeys email",
      html: verifyHtml,
      text: verifyText,
    });

    // Best-effort notify old address (do not fail the request if this fails).
    if (result.oldEmail && result.oldEmail !== result.newEmail) {
      try {
        const notifyHtml = `
          <p>Hi${result.user.name ? ` ${escapeHtml(result.user.name)}` : ""},</p>
          <p>A request was made to change your Fernandes Journeys account email to <strong>${escapeHtml(result.newEmail)}</strong>.</p>
          <p>If this was you, check the new inbox and click the confirmation link. If you did not request this change, you can ignore this email — your current address stays active until the new one is confirmed.</p>
        `;
        const notifyText = [
          `A request was made to change your Fernandes Journeys account email to ${result.newEmail}.`,
          "",
          "If this was you, check the new inbox and confirm. If not, ignore this email — nothing changes until confirmation.",
        ].join("\n");
        await sendEmail({
          to: result.oldEmail,
          subject: "Email change requested on Fernandes Journeys",
          html: notifyHtml,
          text: notifyText,
        });
      } catch (notifyErr) {
        console.warn(
          "[api/auth/change-email/request] old-email notify failed:",
          notifyErr,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Check your new inbox to confirm the email change.",
      pendingNewEmail: result.newEmail,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Changing your email isn’t available right now. Please try again later.",
        },
        { status: 503 },
      );
    }
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Email change is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (err instanceof EmailSendError) {
      console.error("[api/auth/change-email/request] send failed:", err);
      return NextResponse.json(
        {
          error: clientSafeEmailErrorMessage(
            err.message?.trim() ||
              "Could not send confirmation email. Try again later.",
          ),
        },
        { status: 502 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Could not request email change.";
    const clientError =
      message.includes("valid email") ||
      message.includes("already your current") ||
      message.includes("already in use") ||
      message.includes("incorrect") ||
      message.includes("required to change") ||
      message.includes("not found") ||
      message.includes("disabled");
    if (!clientError) {
      console.error("[api/auth/change-email/request] failed:", err);
    }
    return NextResponse.json(
      { error: clientError ? message : "Could not request email change." },
      { status: clientError ? 400 : 500 },
    );
  }
}
