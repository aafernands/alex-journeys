import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { inboundFailure, parseMailboxPatch, requireReaderId } from "@/lib/inbound-http";
import { readOrCreateMailbox, updateMailbox } from "@/lib/inbound-store";

export const runtime = "nodejs";

const UNAVAILABLE = "Forwarding isn’t available right now.";

/** GET /api/trips/forward — account forward address and pending suggestions. */
export async function GET() {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
  try {
    const mailbox = await readOrCreateMailbox(gate.userId, { kind: "account" });
    return NextResponse.json({ mailbox });
  } catch (err) {
    return inboundFailure(err, "Could not load your forward address.");
  }
}

/** PATCH /api/trips/forward — turn the account address on or off, or replace it. */
export async function PATCH(request: Request) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const patch = parseMailboxPatch(body);
  if (!patch) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }
  try {
    const mailbox = await updateMailbox(gate.userId, { kind: "account" }, patch);
    return NextResponse.json({ ok: true, mailbox });
  } catch (err) {
    return inboundFailure(err, "Could not update your forward address.");
  }
}
