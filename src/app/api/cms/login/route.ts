import { NextResponse } from "next/server";
import {
  CMS_COOKIE_NAME,
  cookieOptions,
  createSessionToken,
  isPasscodeConfigured,
  verifyPasscode,
} from "@/lib/cms/auth";
import { rateLimit } from "@/lib/cms/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isPasscodeConfigured()) {
    return NextResponse.json(
      { error: "CMS is not configured. Set CMS_PASSCODE in the environment." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`cms-login:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again shortly." },
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

  const passcode =
    typeof body === "object" &&
    body !== null &&
    "passcode" in body &&
    typeof (body as { passcode: unknown }).passcode === "string"
      ? (body as { passcode: string }).passcode
      : "";

  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const token = createSessionToken();
  if (!token) {
    return NextResponse.json({ error: "CMS is not configured." }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CMS_COOKIE_NAME, token, cookieOptions());
  return res;
}
