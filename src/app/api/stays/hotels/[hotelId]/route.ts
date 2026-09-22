import { NextResponse } from "next/server";
import { LiteApiError } from "@/lib/liteapi";
import { isStayHotelId, parseStaysSearchParams } from "@/lib/stays";
import { loadStayHotel } from "@/lib/stays-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ hotelId: string }> };

function fail(error: unknown) {
  if (error instanceof LiteApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[api/stays/hotels]", error);
  return NextResponse.json({ error: "Could not load this hotel." }, { status: 500 });
}

/** GET /api/stays/hotels/:hotelId?dest=&start=&end=&adults= */
export async function GET(request: Request, context: RouteContext) {
  const { hotelId } = await context.params;
  if (!isStayHotelId(hotelId)) {
    return NextResponse.json({ error: "That hotel link is not valid." }, { status: 400 });
  }
  const url = new URL(request.url);
  const query = parseStaysSearchParams(Object.fromEntries(url.searchParams.entries()));
  try {
    const result = await loadStayHotel(hotelId, query);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
