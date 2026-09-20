import { redirect } from "next/navigation";
import { CommentsModerationList } from "@/components/cms/CommentsModerationList";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  CommentsUnavailableError,
  countPendingComments,
  listCommentsForCms,
  type CommentStatus,
} from "@/lib/comments";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

function parseFilter(raw: string | undefined): CommentStatus | "all" {
  if (raw === "approved" || raw === "rejected" || raw === "all") return raw;
  return "pending";
}

export default async function CmsCommentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const authed = await isCmsAuthenticated();
  if (!authed) {
    redirect("/cms");
  }

  const params = await searchParams;
  const filter = parseFilter(params.status);

  let comments: Awaited<ReturnType<typeof listCommentsForCms>> = [];
  let pendingCount = 0;
  let loadError: string | null = null;

  if (!isFirebaseConfigured()) {
    loadError =
      "Firestore is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.";
  } else {
    try {
      comments = await listCommentsForCms({ status: filter });
      pendingCount = await countPendingComments();
    } catch (err) {
      if (err instanceof CommentsUnavailableError) {
        loadError = "Firestore is temporarily unavailable.";
      } else {
        console.error("[cms/comments] list failed:", err);
        loadError = "Could not load comments.";
      }
    }
  }

  const titleBySlug: Record<string, string> = {};
  for (const post of getAllPosts()) {
    titleBySlug[post.slug] = post.title;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Moderation</p>
        <h1 className="font-display mt-2 text-display text-heading">
          Comments
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          New comments and replies stay{" "}
          <strong className="text-heading">pending</strong> until you approve
          them. Only approved comments appear on the public post page.
        </p>
      </div>

      {loadError ? (
        <div className="panel p-6">
          <p className="text-sm text-text" role="status">
            {loadError}
          </p>
        </div>
      ) : (
        <CommentsModerationList
          initialComments={comments}
          initialFilter={filter}
          pendingCount={pendingCount}
          titleBySlug={titleBySlug}
        />
      )}
    </div>
  );
}
