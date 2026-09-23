import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/cms/rate-limit";
import { LiteApiError } from "@/lib/liteapi";
import { prebookStay } from "@/lib/stays-service";
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
  console.error("[api/stays/prebook]", error);
  return NextResponse.json({ error: "Could not confirm that room." }, { status: 500 });
}

/** POST /api/stays/prebook { offerId } */
export async function POST(request: Request) {
  const limit = await rateLimit(staysCallerKey(request, "stays-prebook"), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many room checks. Wait a moment and try again." },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const offerId =
    body && typeof body === "object" && "offerId" in body && typeof body.offerId === "string"
      ? body.offerId.trim()
      : "";
  try {
    const prebook = await prebookStay(offerId);
    return NextResponse.json({ prebook });
  } catch (error) {
    return fail(error);
  }
}
