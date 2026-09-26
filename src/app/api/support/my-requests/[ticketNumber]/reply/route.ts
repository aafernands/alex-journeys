import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/cms/rate-limit";
import { notifyStaff } from "@/lib/support-notify";
import { currentSupportReader, readerTicket } from "@/lib/support-reader";
import { addCustomerSiteReply, SupportUnavailableError } from "@/lib/support-store";
import {
  isTicketNumber,
  toReaderMessage,
  toReaderTicket,
  validateReaderReply,
} from "@/lib/support-tickets";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ ticketNumber: string }> };

/**
 * POST /api/support/my-requests/{number}/reply — the reader answers from
 * My Journey → Help. Same effect as an emailed reply: the request reopens
 * and the support inbox gets an alert.
 */
export async function POST(request: Request, { params }: Ctx) {
  const reader = await currentSupportReader();
  if (!reader) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { ticketNumber } = await params;
  const number = decodeURIComponent(ticketNumber).toUpperCase();
  if (!isTicketNumber(number)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const limited = await rateLimit(`support-reply:${reader.userId}`, 5, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "You’ve sent a few messages already. Please wait a little and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let raw: unknown;
  try {
    raw = ((await request.json()) as { message?: unknown } | null)?.message;
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }
  const valid = validateReaderReply(raw);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

  try {
    const found = await readerTicket(reader, number);
    if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const saved = await addCustomerSiteReply(number, {
      body: valid.body,
      authorName: reader.name || found.ticket.name || null,
    });
    if (!saved) return NextResponse.json({ error: "Not found." }, { status: 404 });
    await notifyStaff(saved.ticket, "reply", valid.body);
    return NextResponse.json({
      ok: true,
      request: toReaderTicket(saved.ticket),
      message: toReaderMessage(saved.message),
    });
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return NextResponse.json({ error: "Replies aren’t available right now. You can answer by email instead." }, { status: 503 });
    }
    console.error("[api/support/my-requests/:id/reply] failed:", err);
    return NextResponse.json({ error: "We couldn’t send your reply. Please try again." }, { status: 500 });
  }
}
