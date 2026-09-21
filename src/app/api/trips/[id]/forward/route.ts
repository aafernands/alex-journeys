import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { inboundFailure, parseMailboxPatch, requireReaderId } from "@/lib/inbound-http";
import { readOrCreateMailbox, updateMailbox } from "@/lib/inbound-store";

export const runtime = "nodejs";

const UNAVAILABLE = "Forwarding isn’t available right now.";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/trips/[id]/forward — this trip’s forward address and suggestions. */
export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
  const { id } = await context.params;
  try {
    const mailbox = await readOrCreateMailbox(gate.userId, { kind: "trip", tripId: id });
    if (!mailbox) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    return NextResponse.json({ mailbox });
  } catch (err) {
    return inboundFailure(err, "Could not load this trip’s forward address.");
  }
}

/** PATCH /api/trips/[id]/forward — turn this trip’s address on or off, or replace it. */
export async function PATCH(request: Request, context: RouteContext) {
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
  if (!patch) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const { id } = await context.params;
  try {
    const mailbox = await updateMailbox(gate.userId, { kind: "trip", tripId: id }, patch);
    if (!mailbox) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    return NextResponse.json({ ok: true, mailbox });
  } catch (err) {
    return inboundFailure(err, "Could not update this trip’s forward address.");
  }
}
