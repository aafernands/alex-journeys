import { NextResponse } from "next/server";
import { parseFlightsSearchParams } from "@/lib/flights";
import { searchFlights } from "@/lib/flights-service";
import { LiteApiError } from "@/lib/liteapi";

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
  console.error("[api/flights/search]", error);
  return NextResponse.json({ error: "Could not search flights." }, { status: 500 });
}

/** GET /api/flights/search?origin=&dest=&start=&end=&adults= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseFlightsSearchParams(Object.fromEntries(url.searchParams.entries()));
  try {
    const result = await searchFlights(query);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
