import { NextResponse } from "next/server";
import { LiteApiError } from "@/lib/liteapi";
import { parseStaysSearchParams } from "@/lib/stays";
import { searchStays } from "@/lib/stays-service";

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
  console.error("[api/stays/search]", error);
  return NextResponse.json({ error: "Could not search stays." }, { status: 500 });
}

/** GET /api/stays/search?dest=&start=&end=&adults= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseStaysSearchParams(Object.fromEntries(url.searchParams.entries()));
  try {
    const result = await searchStays(query);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
