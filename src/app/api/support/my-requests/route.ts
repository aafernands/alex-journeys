import { NextResponse } from "next/server";
import { currentSupportReader, readerTickets } from "@/lib/support-reader";
import { SupportUnavailableError } from "@/lib/support-store";
import { toReaderTicket } from "@/lib/support-tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/support/my-requests — the signed-in reader's own help requests. */
export async function GET() {
  const reader = await currentSupportReader();
  if (!reader) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const rows = await readerTickets(reader);
    return NextResponse.json(
      { requests: rows.map(toReaderTicket) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    if (!(err instanceof SupportUnavailableError)) console.error("[api/support/my-requests] failed:", err);
    return NextResponse.json({ error: "Your requests aren’t available right now." }, { status: 503 });
  }
}
