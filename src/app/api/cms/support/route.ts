import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { listTickets, SupportUnavailableError } from "@/lib/support-store";
import { isTicketStatus } from "@/lib/support-tickets";

export const runtime = "nodejs";

/** GET /api/cms/support?status=active|all|open|in_progress|waiting|closed&q= */
export async function GET(request: Request) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const raw = url.searchParams.get("status") ?? "active";
  const status = raw === "all" || raw === "active" || isTicketStatus(raw) ? raw : "active";
  try {
    const tickets = await listTickets({ status, query: url.searchParams.get("q") ?? "" });
    return NextResponse.json({ tickets });
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return NextResponse.json({ error: "Firestore is not configured." }, { status: 503 });
    }
    console.error("[api/cms/support] list failed:", err);
    return NextResponse.json({ error: "Could not load tickets." }, { status: 500 });
  }
}
