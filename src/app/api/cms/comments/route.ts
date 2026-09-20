import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  CommentsUnavailableError,
  countPendingComments,
  listCommentsForCms,
  type CommentStatus,
} from "@/lib/comments";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function parseStatus(
  raw: string | null,
): CommentStatus | "all" | null {
  if (!raw || raw === "all") return raw === "all" ? "all" : "pending";
  if (raw === "pending" || raw === "approved" || raw === "rejected") {
    return raw;
  }
  return null;
}

/** GET /api/cms/comments?status=&slug=&pendingCount=1 — CMS list / badge. */
export async function GET(request: Request) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const wantCount = searchParams.get("pendingCount") === "1";
  const status = parseStatus(searchParams.get("status"));
  if (status === null) {
    return NextResponse.json(
      { error: "Invalid status. Use pending, approved, rejected, or all." },
      { status: 400 },
    );
  }
  const slug = searchParams.get("slug")?.trim() || undefined;

  try {
    if (wantCount) {
      const pendingCount = await countPendingComments();
      return NextResponse.json({ pendingCount });
    }

    const comments = await listCommentsForCms({ status, slug });
    const pendingCount = await countPendingComments();
    return NextResponse.json({ comments, pendingCount });
  } catch (err) {
    if (err instanceof CommentsUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : "List failed.";
    if (message === "Invalid slug.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/cms/comments] GET failed:", err);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 500 },
    );
  }
}
