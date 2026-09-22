import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/cms/rate-limit";
import { parseFlightParty } from "@/lib/flights";
import { prebookFlight } from "@/lib/flights-service";
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
  console.error("[api/flights/prebook]", error);
  return NextResponse.json({ error: "Could not hold that fare." }, { status: 500 });
}

/** POST /api/flights/prebook { offerId, passengers, adults, children, departDate } */
export async function POST(request: Request) {
  const limit = rateLimit(staysCallerKey(request, "flights-prebook"), 12, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many fare checks. Wait a moment and try again." },
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
  const offerId = typeof record.offerId === "string" ? record.offerId.trim() : "";
  const adults = typeof record.adults === "number" ? record.adults : Number(record.adults);
  const children = typeof record.children === "number" ? record.children : Number(record.children);
  const departDate = typeof record.departDate === "string" ? record.departDate : "";
  const party = parseFlightParty(
    record.passengers,
    Number.isFinite(adults) ? adults : 0,
    Number.isFinite(children) ? children : 0,
    departDate,
  );
  if (!party) {
    return NextResponse.json(
      { error: "Add each passenger’s name, birthday, and passport before booking." },
      { status: 400 },
    );
  }
  try {
    const prebook = await prebookFlight(offerId, party);
    return NextResponse.json({ prebook });
  } catch (error) {
    return fail(error);
  }
}
