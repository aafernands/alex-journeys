import { NextResponse } from "next/server";
import { currentSupportReader, readerTicket } from "@/lib/support-reader";
import { SupportUnavailableError } from "@/lib/support-store";
import { isTicketNumber, toReaderMessage, toReaderTicket } from "@/lib/support-tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ticketNumber: string }> };

/** GET /api/support/my-requests/{number} — one of the reader's requests with its conversation. */
export async function GET(_request: Request, { params }: Ctx) {
  const reader = await currentSupportReader();
  if (!reader) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { ticketNumber } = await params;
  const number = decodeURIComponent(ticketNumber).toUpperCase();
  if (!isTicketNumber(number)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const found = await readerTicket(reader, number);
    if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(
      { request: toReaderTicket(found.ticket), messages: found.messages.map(toReaderMessage) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    if (!(err instanceof SupportUnavailableError)) console.error("[api/support/my-requests/:id] failed:", err);
    return NextResponse.json({ error: "This request isn’t available right now." }, { status: 503 });
  }
}
