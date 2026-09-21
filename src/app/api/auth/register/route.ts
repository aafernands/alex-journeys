import { NextResponse } from "next/server";
import { isCredentialsAuthConfigured } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
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
  const limited = rateLimit(`register:${ip}`, 8, 60_000);
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
    const user = await registerCredentialsUser({ name, email, password });
    return NextResponse.json({ ok: true, user });
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
