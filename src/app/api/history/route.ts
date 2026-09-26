import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/data/destinations";
import { getGuideHub } from "@/data/guides";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { getPostBySlug } from "@/lib/posts";
import { publicDestinationPath, publicPostPath } from "@/lib/public-paths";
import {
  clearHistory,
  HistoryUnavailableError,
  isHistoryKind,
  listHistory,
  recordHistory,
  removeHistoryEntry,
  type HistoryEntry,
  type HistoryKind,
} from "@/lib/reading-history";
import { PLAN_A_TRIP_SLUG } from "@/lib/trip-planner-model";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json({ error: "History isn’t available right now." }, { status: 503 });
}

async function readerId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id?.trim();
  return session?.user && id ? id : null;
}

function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  if (!slug || slug.length > 200 || !/^[\w-]+$/.test(slug)) return null;
  return slug;
}

/** Title and link come from our own content, never from the request. */
function resolvePage(kind: HistoryKind, slug: string): Omit<HistoryEntry, "viewedAt"> | null {
  if (kind === "story") {
    const post = getPostBySlug(slug);
    return post ? { kind, slug, title: post.title, href: publicPostPath(slug) } : null;
  }
  if (kind === "guide") {
    if (slug === PLAN_A_TRIP_SLUG) return null;
    const hub = getGuideHub(slug);
    return hub ? { kind, slug, title: hub.title, href: `/guides/${slug}` } : null;
  }
  const dest = getDestinationBySlug(slug);
  return dest ? { kind, slug, title: dest.name, href: publicDestinationPath(slug) } : null;
}

/** GET /api/history — recently viewed pages for the signed-in reader. */
export async function GET() {
  const userId = await readerId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isFirebaseConfigured()) return unavailable();
  try {
    return NextResponse.json({ items: await listHistory(userId) });
  } catch (err) {
    if (err instanceof HistoryUnavailableError) return unavailable();
    console.error("[api/history] GET failed:", err);
    return NextResponse.json({ error: "Could not load history." }, { status: 500 });
  }
}

/** POST /api/history { kind, slug } — record a view. */
export async function POST(request: Request) {
  const userId = await readerId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isFirebaseConfigured()) return unavailable();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { kind, slug: rawSlug } = (body ?? {}) as { kind?: unknown; slug?: unknown };
  const slug = cleanSlug(rawSlug);
  if (!isHistoryKind(kind) || !slug) {
    return NextResponse.json({ error: "Unknown page." }, { status: 400 });
  }
  const page = resolvePage(kind, slug);
  if (!page) return NextResponse.json({ error: "Unknown page." }, { status: 404 });
  try {
    await recordHistory(userId, page);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HistoryUnavailableError) return unavailable();
    console.error("[api/history] POST failed:", err);
    return NextResponse.json({ error: "Could not record history." }, { status: 500 });
  }
}

/** DELETE /api/history?kind=story&slug=x removes one page; no params clears it all. */
export async function DELETE(request: Request) {
  const userId = await readerId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isFirebaseConfigured()) return unavailable();
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const slug = cleanSlug(params.get("slug"));
  try {
    if (kind || params.has("slug")) {
      if (!isHistoryKind(kind) || !slug) {
        return NextResponse.json({ error: "Unknown page." }, { status: 400 });
      }
      await removeHistoryEntry(userId, kind, slug);
    } else {
      await clearHistory(userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HistoryUnavailableError) return unavailable();
    console.error("[api/history] DELETE failed:", err);
    return NextResponse.json({ error: "Could not update history." }, { status: 500 });
  }
}
