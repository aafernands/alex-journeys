import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CommentsUnavailableError, listCommentsByAuthor } from "@/lib/comments";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * GET /api/comments/mine[?slug=] — the signed-in reader's own comments, any
 * status (so they can see what's still waiting for moderation).
 */
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "Comments are unavailable." }, { status: 503 });
  }
  const slug = new URL(request.url).searchParams.get("slug")?.trim() || null;
  try {
    const all = await listCommentsByAuthor(userId);
    const comments = slug ? all.filter((c) => c.slug === slug) : all;
    return NextResponse.json({ comments });
  } catch (err) {
    if (err instanceof CommentsUnavailableError) {
      return NextResponse.json({ error: "Comments are unavailable." }, { status: 503 });
    }
    console.error("[api/comments/mine] GET failed:", err);
    return NextResponse.json({ error: "Could not load your comments." }, { status: 500 });
  }
}
