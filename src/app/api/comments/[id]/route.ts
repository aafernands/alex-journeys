import { NextResponse } from "next/server";
import { auth, isAdminEmail } from "@/auth";
import {
  CommentsUnavailableError,
  deleteComment,
  getCommentById,
} from "@/lib/comments";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function firebaseUnavailable() {
  return NextResponse.json(
    {
      error:
        "Comments are unavailable. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    },
    { status: 503 },
  );
}

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/comments/[id] — author or admin only. */
export async function DELETE(_request: Request, context: RouteContext) {
  if (!isFirebaseConfigured()) return firebaseUnavailable();

  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing comment id." }, { status: 400 });
  }

  try {
    const comment = await getCommentById(id);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const isAuthor = comment.authorId === userId;
    const isAdmin =
      session.user.isAdmin === true || isAdminEmail(session.user.email);
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommentsUnavailableError) return firebaseUnavailable();
    const message = err instanceof Error ? err.message : "Delete failed.";
    if (message === "Invalid comment id.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/comments/[id]] DELETE failed:", err);
    return NextResponse.json(
      { error: "Could not delete comment." },
      { status: 500 },
    );
  }
}
