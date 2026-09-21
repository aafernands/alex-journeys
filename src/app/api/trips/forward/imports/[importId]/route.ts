import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  inboundFailure,
  parseSuggestionAction,
  requireReaderId,
} from "@/lib/inbound-http";
import { setSuggestionStatus } from "@/lib/inbound-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ importId: string }> };

/** POST /api/trips/forward/imports/[importId] — add or dismiss an account suggestion. */
export async function POST(request: Request, context: RouteContext) {
  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Forwarding isn’t available right now." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const status = parseSuggestionAction(body);
  if (!status) {
    return NextResponse.json({ error: "Choose add or dismiss." }, { status: 400 });
  }

  const { importId } = await context.params;
  try {
    const result = await setSuggestionStatus(
      gate.userId,
      { kind: "account" },
      importId,
      status,
    );
    if (result === "missing") {
      return NextResponse.json({ error: "That suggestion is gone." }, { status: 404 });
    }
    if (result === "closed") {
      return NextResponse.json({ error: "That suggestion is already closed." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return inboundFailure(err, "Could not update that suggestion.");
  }
}
