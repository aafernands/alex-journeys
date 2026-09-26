import {
  emailChangeConfirmEmail,
  emailChangeNoticeEmail,
} from "@/lib/emails/templates";
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

    await sendEmail({
      to: result.newEmail,
      ...emailChangeConfirmEmail({
        name: result.user.name,
        newEmail: result.newEmail,
        confirmUrl,
      }),
    });

    // Best-effort notify old address (do not fail the request if this fails).
    if (result.oldEmail && result.oldEmail !== result.newEmail) {
      try {
        await sendEmail({
          to: result.oldEmail,
          ...emailChangeNoticeEmail({
            name: result.user.name,
            newEmail: result.newEmail,
          }),
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
