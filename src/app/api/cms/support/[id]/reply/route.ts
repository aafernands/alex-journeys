import { NextResponse } from "next/server";
import { getCmsSession, isCmsAuthenticated } from "@/lib/cms/auth";
import { notifyStaffReply } from "@/lib/support-notify";
import {
  addStaffReply,
  setMessageEmailStatus,
  SupportUnavailableError,
} from "@/lib/support-store";
import { isTicketNumber, LIMITS } from "@/lib/support-tickets";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function firstName(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? first.slice(0, 40) : null;
}

/** POST /api/cms/support/:ticketNumber/reply `{ body, close? }` — saves and emails the reader. */
export async function POST(request: Request, ctx: Ctx) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isTicketNumber(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: { body?: unknown; close?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.replace(/\u0000/g, "").trim() : "";
  if (!text) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  if (text.length > LIMITS.reply) {
    return NextResponse.json({ error: "That reply is too long." }, { status: 400 });
  }
  const session = await getCmsSession().catch(() => null);
  const authorName =
    process.env.SUPPORT_REPLY_NAME?.trim() || firstName(session?.user?.name) || "Alex";
  try {
    const saved = await addStaffReply(id, { body: text, authorName, close: body.close === true });
    if (!saved) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const sent = await notifyStaffReply(saved.ticket, text, authorName);
    await setMessageEmailStatus(id, saved.messageId, sent.status);
    return NextResponse.json({ ok: true, ticket: saved.ticket, emailStatus: sent.status });
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return NextResponse.json({ error: "Firestore is not configured." }, { status: 503 });
    }
    console.error("[api/cms/support/:id/reply] failed:", err);
    return NextResponse.json({ error: "Could not send reply." }, { status: 500 });
  }
}
