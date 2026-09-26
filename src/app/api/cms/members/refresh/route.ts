import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { MemberRefreshError, refreshMemberFromStripe } from "@/lib/cms/members";

export const runtime = "nodejs";

/** POST /api/cms/members/refresh — re-sync one member from Stripe (CMS admins only). */
export async function POST(request: Request) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let userId = "";
  try {
    const body = (await request.json()) as { userId?: unknown };
    userId = typeof body.userId === "string" ? body.userId : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!userId.trim()) {
    return NextResponse.json({ error: "Missing member." }, { status: 400 });
  }
  try {
    const member = await refreshMemberFromStripe(userId);
    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof MemberRefreshError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[api/cms/members/refresh] failed:", err);
    return NextResponse.json({ error: "Couldn’t refresh from Stripe." }, { status: 500 });
  }
}
