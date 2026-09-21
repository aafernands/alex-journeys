import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { inboundFailure } from "@/lib/inbound-http";
import { ingestInboundEmail } from "@/lib/inbound-store";
import { parseSampleEmail, sampleSecretsMatch } from "@/lib/inbound-webhook";

export const runtime = "nodejs";

/**
 * POST /api/inbound/email/sample
 * Dev harness: same parser and storage as the webhook, without DNS.
 * Closed unless INBOUND_SAMPLE_SECRET is set. Send it as
 * `x-inbound-sample-secret`. See docs/TRIPS-INBOUND.md.
 */
export async function POST(request: Request) {
  const expected = process.env.INBOUND_SAMPLE_SECRET?.trim() ?? "";
  if (!expected) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const provided = request.headers.get("x-inbound-sample-secret") ?? "";
  if (!sampleSecretsMatch(provided, expected)) {
    return NextResponse.json({ error: "Sample secret required." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Forwarding isn’t available right now." },
      { status: 503 },
    );
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 200_000) {
    return NextResponse.json({ error: "That sample is too long." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSampleEmail(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await ingestInboundEmail(parsed.email);
    return NextResponse.json({
      ok: true,
      stored: result.stored,
      ...(result.ignored ? { ignored: result.ignored } : {}),
    });
  } catch (err) {
    return inboundFailure(err, "Could not store that sample.");
  }
}
