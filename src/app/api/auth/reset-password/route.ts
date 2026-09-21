import { NextResponse } from "next/server";
import { isCredentialsAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  resetPasswordWithToken,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isCredentialsAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Password reset isn’t available right now. Please try again later.",
      },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`reset-password:${ip}`, 8, 60_000);
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

  const record = body as { token?: unknown; password?: unknown };
  const token = typeof record.token === "string" ? record.token : "";
  const password = typeof record.password === "string" ? record.password : "";

  if (!token.trim()) {
    return NextResponse.json(
      { error: "Reset token is required." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    await resetPasswordWithToken(token, password);
    return NextResponse.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable." },
        { status: 503 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Could not reset password.";
    const clientError =
      message.includes("invalid or has expired") ||
      message.includes("at least 8") ||
      message.includes("disabled") ||
      message.includes("not found");
    if (!clientError) {
      console.error("[api/auth/reset-password] failed:", err);
    }
    return NextResponse.json(
      { error: clientError ? message : "Could not reset password." },
      { status: clientError ? 400 : 500 },
    );
  }
}
