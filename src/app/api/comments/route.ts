import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cms/rate-limit";
import {
  COMMENT_MAX_BODY,
  CommentsUnavailableError,
  createComment,
  listApprovedComments,
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

/** GET /api/comments?slug= — public list of approved comments. */
export async function GET(request: Request) {
  if (!isFirebaseConfigured()) return firebaseUnavailable();

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  try {
    const comments = await listApprovedComments(slug);
    return NextResponse.json({ comments });
  } catch (err) {
    if (err instanceof CommentsUnavailableError) return firebaseUnavailable();
    const message = err instanceof Error ? err.message : "List failed.";
    if (message === "Invalid slug.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/comments] GET failed:", err);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 500 },
    );
  }
}

/** POST /api/comments — auth required; body `{ slug, body, parentId? }`. */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseUnavailable();

  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const rl = await rateLimit(`comments:post:${userId}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many comments. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as {
    slug?: unknown;
    body?: unknown;
    parentId?: unknown;
  };

  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  const text = typeof payload.body === "string" ? payload.body : "";
  const parentId =
    typeof payload.parentId === "string" && payload.parentId.trim()
      ? payload.parentId.trim()
      : null;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json(
      { error: "Comment cannot be empty." },
      { status: 400 },
    );
  }
  if (text.trim().length > COMMENT_MAX_BODY) {
    return NextResponse.json(
      { error: `Comment must be ${COMMENT_MAX_BODY} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    const comment = await createComment({
      slug,
      body: text,
      authorId: userId,
      authorName: session.user.name?.trim() || "Reader",
      authorImage: session.user.image ?? null,
      parentId,
    });
    return NextResponse.json(
      {
        ok: true,
        comment,
        message: "Thanks — your comment is awaiting moderation.",
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof CommentsUnavailableError) return firebaseUnavailable();
    const message = err instanceof Error ? err.message : "Post failed.";
    if (
      message === "Post not found." ||
      message === "Parent comment not found."
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message === "Invalid slug." ||
      message === "Invalid user id." ||
      message === "Comment cannot be empty." ||
      message.startsWith("Comment must be") ||
      message === "Parent comment is on a different post." ||
      message === "Replies cannot be nested deeper than one level." ||
      message === "Invalid comment id."
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/comments] POST failed:", err);
    return NextResponse.json(
      { error: "Could not post comment." },
      { status: 500 },
    );
  }
}
