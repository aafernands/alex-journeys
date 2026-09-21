import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  InboundUnavailableError,
  ingestInboundEmail,
} from "@/lib/inbound-store";
import {
  fetchReceivedEmail,
  parseReceivedEvent,
  verifyResendWebhook,
} from "@/lib/inbound-webhook";

export const runtime = "nodejs";

const UNAVAILABLE = "Forwarding isn’t available right now.";

/**
 * POST /api/inbound/email — Resend `email.received` webhook.
 * The raw body is verified with RESEND_WEBHOOK_SECRET (Svix) before any write.
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

  const payload = await request.text();
  if (payload.length > 1_000_000) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const valid = verifyResendWebhook({
    payload,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    secret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const event = parseReceivedEvent(json);
  if (!event) return NextResponse.json({ ok: true, ignored: "event" });
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

  const content = await fetchReceivedEmail(event.emailId);
  try {
    const result = await ingestInboundEmail({
      recipients: event.recipients,
      messageId: event.emailId,
      subject: content?.subject || event.subject,
      text: content?.text ?? "",
      html: content?.html ?? "",
    });
    return NextResponse.json({
      ok: true,
      stored: result.stored,
      ...(result.ignored ? { ignored: result.ignored } : {}),
    });
  } catch (err) {
    if (err instanceof InboundUnavailableError) {
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    console.error("[inbound] webhook failed:", err);
    return NextResponse.json({ error: "Could not store that email." }, { status: 500 });
  }
}
