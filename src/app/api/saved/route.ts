import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  addSavedPost,
  listSavedPosts,
  removeSavedPost,
  SavedPostsUnavailableError,
} from "@/lib/saved-posts";

export const runtime = "nodejs";

function firebaseUnavailable() {
  return NextResponse.json(
    {
      error:
        "Saved posts are unavailable. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    },
    { status: 503 },
  );
}

async function requireReaderId(): Promise<
  { userId: string } | NextResponse
> {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!session?.user || !userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return { userId };
}

function parseSlug(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const slug = (body as { slug?: unknown }).slug;
  if (typeof slug !== "string" || !slug.trim()) return null;
  return slug.trim();
}

/** GET /api/saved — list saved posts for the current reader. */
export async function GET() {
  if (!isFirebaseConfigured()) return firebaseUnavailable();

  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;

  try {
    const posts = await listSavedPosts(gate.userId);
    return NextResponse.json({ posts });
  } catch (err) {
    if (err instanceof SavedPostsUnavailableError) return firebaseUnavailable();
    console.error("[api/saved] GET failed:", err);
    return NextResponse.json(
      { error: "Could not load saved posts." },
      { status: 500 },
    );
  }
}

/** POST /api/saved — body `{ slug }` — save a post. */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) return firebaseUnavailable();

  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const slug = parseSlug(body);
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  try {
    const post = await addSavedPost(gate.userId, slug);
    return NextResponse.json({ ok: true, post });
  } catch (err) {
    if (err instanceof SavedPostsUnavailableError) return firebaseUnavailable();
    const message = err instanceof Error ? err.message : "Save failed.";
    if (message === "Post not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Invalid slug." || message === "Invalid user id.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/saved] POST failed:", err);
    return NextResponse.json({ error: "Could not save post." }, { status: 500 });
  }
}

/** DELETE /api/saved — body `{ slug }` — unsave a post. */
export async function DELETE(request: Request) {
  if (!isFirebaseConfigured()) return firebaseUnavailable();

  const gate = await requireReaderId();
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const slug = parseSlug(body);
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  try {
    await removeSavedPost(gate.userId, slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SavedPostsUnavailableError) return firebaseUnavailable();
    const message = err instanceof Error ? err.message : "Unsave failed.";
    if (message === "Invalid slug." || message === "Invalid user id.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/saved] DELETE failed:", err);
    return NextResponse.json(
      { error: "Could not unsave post." },
      { status: 500 },
    );
  }
}
