import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/cms/rate-limit";
import { LiteApiError } from "@/lib/liteapi";
import { isStayClientReference, parseStayGuest } from "@/lib/stays";
import { staysCallerKey } from "@/lib/stays-http";
import { bookStay } from "@/lib/stays-service";

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
  console.error("[api/stays/book]", error);
  return NextResponse.json({ error: "Could not complete the booking." }, { status: 500 });
}

/**
 * POST /api/stays/book
 * Sandbox keys complete the reservation with Nuitee’s simulated account card.
 */
export async function POST(request: Request) {
  const limit = rateLimit(staysCallerKey(request, "stays-book"), 8, 60_000);
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
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const prebookId = typeof record.prebookId === "string" ? record.prebookId.trim() : "";
  const clientReference =
    typeof record.clientReference === "string" ? record.clientReference.trim() : "";
  const rooms = typeof record.rooms === "number" ? record.rooms : Number(record.rooms);
  const guest = parseStayGuest(record.guest);
  if (!guest || !isStayClientReference(clientReference)) {
    return NextResponse.json(
      { error: "Add the guest’s name, email, and phone before booking." },
      { status: 400 },
    );
  }
  try {
    const booking = await bookStay({
      prebookId,
      clientReference,
      guest,
      rooms: Number.isFinite(rooms) ? rooms : 1,
    });
    return NextResponse.json({ booking });
  } catch (error) {
    return fail(error);
  }
}
