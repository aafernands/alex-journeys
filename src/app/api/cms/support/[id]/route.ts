import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { notifyTicketClosed } from "@/lib/support-notify";
import {
  getTicket,
  markTicketRead,
  setTicketStatus,
  SupportUnavailableError,
} from "@/lib/support-store";
import { isTicketNumber, isTicketStatus } from "@/lib/support-tickets";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/cms/support/:ticketNumber — ticket + thread (marks it read). */
export async function GET(_request: Request, ctx: Ctx) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isTicketNumber(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const found = await getTicket(id);
    if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (found.ticket.unreadForStaff) await markTicketRead(id);
    return NextResponse.json(found);
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return NextResponse.json({ error: "Firestore is not configured." }, { status: 503 });
    }
    console.error("[api/cms/support/:id] get failed:", err);
    return NextResponse.json({ error: "Could not load ticket." }, { status: 500 });
  }
}

/**
 * PATCH /api/cms/support/:ticketNumber `{ status, notify? }`.
 * Closing with `notify: true` emails the reader "Your request is resolved".
 */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isTicketNumber(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: { status?: unknown; notify?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!isTicketStatus(body.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }
  try {
    const ticket = await setTicketStatus(id, body.status);
    if (!ticket) return NextResponse.json({ error: "Not found." }, { status: 404 });
    let emailStatus: string | null = null;
    if (body.status === "closed" && body.notify === true) {
      emailStatus = (await notifyTicketClosed(ticket)).status;
    }
    return NextResponse.json({ ok: true, ticket, emailStatus });
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return NextResponse.json({ error: "Firestore is not configured." }, { status: 503 });
    }
    console.error("[api/cms/support/:id] patch failed:", err);
    return NextResponse.json({ error: "Could not update ticket." }, { status: 500 });
  }
}
