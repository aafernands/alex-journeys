/**
 * Shared responses for the forward-address APIs. Server-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { InboundUnavailableError } from "@/lib/inbound-store";

export async function requireReaderId(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return { userId };
}

export function inboundFailure(err: unknown, fallback: string): NextResponse {
  if (err instanceof InboundUnavailableError) {
    return NextResponse.json(
      { error: "Forwarding isn’t available right now." },
      { status: 503 },
    );
  }
  const message = err instanceof Error ? err.message : "";
  if (
    message === "Invalid trip id." ||
    message === "Invalid user id." ||
    message === "Invalid forward address."
  ) {
    return NextResponse.json({ error: "That request wasn’t valid." }, { status: 400 });
  }
  console.error("[inbound]", err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function parseMailboxPatch(
  body: unknown,
): { enabled?: boolean; rotate?: boolean } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const patch: { enabled?: boolean; rotate?: boolean } = {};
  if (typeof record.enabled === "boolean") patch.enabled = record.enabled;
  if (record.rotate === true) patch.rotate = true;
  if (patch.enabled == null && !patch.rotate) return null;
  return patch;
}

export function parseSuggestionAction(body: unknown): "added" | "dismissed" | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const action = (body as { action?: unknown }).action;
  if (action === "add") return "added";
  if (action === "dismiss") return "dismissed";
  return null;
}
