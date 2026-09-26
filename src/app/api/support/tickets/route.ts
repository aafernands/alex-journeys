import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import { notifyTicketCreated } from "@/lib/support-notify";
import { createTicket, SupportUnavailableError } from "@/lib/support-store";
import { validateNewTicket } from "@/lib/support-tickets";
import { clientIpFromRequest, verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";

/**
 * POST /api/support/tickets — Help & Contact form (guests and signed-in
 * readers). Creates a ticket, emails the reader a confirmation with the
 * reference number, and alerts the support inbox.
 */
export async function POST(request: Request) {
  const ip = clientIpFromRequest(request) || "unknown";
  const limited = await rateLimit(`support-ticket:${ip}`, 5, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "You’ve sent a few messages already. Please wait a little and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("bad");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, ticketNumber: null });
  }

  const turnstile = await verifyTurnstileToken(
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
    clientIpFromRequest(request),
  );
  if (!turnstile.ok) {
    return NextResponse.json({ error: turnstile.error || "Please complete the security check." }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id?.trim() || null;
  const sessionEmail = session?.user?.email?.trim().toLowerCase() || null;

  const valid = validateNewTicket({
    ...body,
    // Signed-in readers write from their account email.
    ...(sessionEmail ? { email: sessionEmail } : {}),
  });
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

  const perEmail = await rateLimit(`support-ticket-email:${valid.value.email}`, 5, 60 * 60_000);
  if (!perEmail.ok) {
    return NextResponse.json(
      { error: "You’ve sent a few messages already. We’ll get back to you soon." },
      { status: 429, headers: { "Retry-After": String(perEmail.retryAfterSec) } },
    );
  }

  try {
    const { ticket } = await createTicket({ ...valid.value, userId });
    const sent = await notifyTicketCreated(ticket, valid.value.message);
    return NextResponse.json({
      ok: true,
      ticketNumber: ticket.ticketNumber,
      emailed: sent.customer.status === "sent",
    });
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return NextResponse.json({ error: "unavailable", fallback: "email" }, { status: 503 });
    }
    console.error("[api/support/tickets] failed:", err);
    return NextResponse.json({ error: "We couldn’t send your message. Please try again." }, { status: 500 });
  }
}
