import { NextResponse } from "next/server";
import { auth, isCredentialsAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  changePasswordForUser,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isCredentialsAuthConfigured()) {
    return NextResponse.json(
      { error: "Password change is unavailable." },
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
  const limited = await rateLimit(`change-password:${userId}:${ip}`, 8, 60_000);
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
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const currentPassword =
    typeof record.currentPassword === "string" ? record.currentPassword : "";
  const newPassword =
    typeof record.newPassword === "string" ? record.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 },
    );
  }

  try {
    await changePasswordForUser(userId, currentPassword, newPassword);
    return NextResponse.json({
      ok: true,
      message: "Password updated.",
    });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Password change is temporarily unavailable." },
        { status: 503 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Could not change password.";
    const clientError =
      message.includes("incorrect") ||
      message.includes("at least 8") ||
      message.includes("no password") ||
      message.includes("disabled") ||
      message.includes("Google");
    if (!clientError) {
      console.error("[api/auth/change-password] failed:", err);
    }
    return NextResponse.json(
      { error: clientError ? message : "Could not change password." },
      { status: clientError ? 400 : 500 },
    );
  }
}
