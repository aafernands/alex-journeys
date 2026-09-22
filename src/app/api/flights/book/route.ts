import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/cms/rate-limit";
import { bookFlight } from "@/lib/flights-service";
import { LiteApiError } from "@/lib/liteapi";
import { staysCallerKey } from "@/lib/stays-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function fail(error: unknown) {
  if (error instanceof LiteApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[api/flights/book]", error);
  return NextResponse.json({ error: "Could not complete the booking." }, { status: 500 });
}

/**
 * POST /api/flights/book
 * Sandbox keys complete the reservation on Nuitee credit. No card data is collected.
 */
export async function POST(request: Request) {
  const limit = rateLimit(staysCallerKey(request, "flights-book"), 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many booking attempts. Wait a moment and try again." },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const prebookId =
    body && typeof body === "object" && "prebookId" in body && typeof body.prebookId === "string"
      ? body.prebookId.trim()
      : "";
  try {
    const booking = await bookFlight(prebookId);
    return NextResponse.json({ booking });
  } catch (error) {
    return fail(error);
  }
}
