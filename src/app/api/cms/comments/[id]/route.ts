import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  CommentsUnavailableError,
  deleteComment,
  setCommentStatus,
  type CommentStatus,
} from "@/lib/comments";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseStatus(raw: unknown): CommentStatus | null {
  if (raw === "pending" || raw === "approved" || raw === "rejected") {
    return raw;
  }
  return null;
}

/**
 * PATCH /api/cms/comments/[id] — body `{ status: "approved" | "rejected" | "pending" }`.
 * DELETE /api/cms/comments/[id] — hard delete (and replies).
 */
export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing comment id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status =
    typeof body === "object" && body !== null
      ? parseStatus((body as { status?: unknown }).status)
      : null;
  if (!status) {
    return NextResponse.json(
      { error: "status must be pending, approved, or rejected." },
      { status: 400 },
    );
  }

  try {
    const comment = await setCommentStatus(id, status);
    return NextResponse.json({ ok: true, comment });
  } catch (err) {
    if (err instanceof CommentsUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : "Update failed.";
    if (message === "Comment not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Invalid comment id.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/cms/comments/[id]] PATCH failed:", err);
    return NextResponse.json(
      { error: "Could not update comment." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing comment id." }, { status: 400 });
  }

  try {
    await deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommentsUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : "Delete failed.";
    if (message === "Invalid comment id.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/cms/comments/[id]] DELETE failed:", err);
    return NextResponse.json(
      { error: "Could not delete comment." },
      { status: 500 },
    );
  }
}
