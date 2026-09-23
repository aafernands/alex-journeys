import { NextResponse } from "next/server";
import { isReaderAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  confirmEmailChange,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

async function handleConfirm(token: string, request: Request) {
  if (!isReaderAuthConfigured()) {
    return NextResponse.json(
      { error: "Account email change is unavailable." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = await rateLimit(`change-email-confirm:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const raw = token.trim();
  if (!raw) {
    return NextResponse.json(
      { error: "Confirmation token is required." },
      { status: 400 },
    );
  }

  try {
    const user = await confirmEmailChange(raw);
    return NextResponse.json({
      ok: true,
      message: "Email updated.",
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Email change is temporarily unavailable." },
        { status: 503 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Could not confirm email change.";
    const clientError =
      message.includes("invalid or has expired") ||
      message.includes("already in use");
    if (!clientError) {
      console.error("[api/auth/change-email/confirm] failed:", err);
    }
    return NextResponse.json(
      { error: clientError ? message : "Could not confirm email change." },
      { status: clientError ? 400 : 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const token =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token
      : "";
  return handleConfirm(token, request);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  return handleConfirm(token, request);
}
