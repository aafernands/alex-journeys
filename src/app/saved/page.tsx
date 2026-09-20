import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { auth, isGoogleAuthConfigured, isOauthConfigured } from "@/auth";
import { ReaderAuthButtons } from "@/components/ReaderAuthButtons";
import { formatPostDate } from "@/lib/dates";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  listSavedPosts,
  SavedPostsUnavailableError,
  type SavedPost,
} from "@/lib/saved-posts";

export const metadata: Metadata = {
  title: "Saved posts",
  description: "Your saved travel stories from Fernandes Journeys.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/saved" },
};

export const dynamic = "force-dynamic";

export default async function SavedPostsPage() {
  const session = await auth();
  const googleConfigured =
    isOauthConfigured() && isGoogleAuthConfigured();
  const userId = session?.user?.id?.trim();
  const signedIn = Boolean(session?.user && userId);

  let posts: SavedPost[] = [];
  let loadError: string | null = null;
  let firebaseOk = isFirebaseConfigured();

  if (signedIn && userId) {
    if (!firebaseOk) {
      loadError =
        "Saved posts are not configured yet. Ask the site owner to enable Firestore.";
    } else {
      try {
        posts = await listSavedPosts(userId);
      } catch (err) {
        if (err instanceof SavedPostsUnavailableError) {
          firebaseOk = false;
          loadError =
            "Saved posts are temporarily unavailable. Try again later.";
        } else {
          console.error("[saved] list failed:", err);
          loadError = "Could not load your saved posts.";
        }
      }
    }
  }

  return (
    <main className="bg-bg">
      <header className="border-b border-border bg-white">
        <div className="section-shell py-10 md:py-14">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Your library</p>
            <h1 className="font-display text-display mt-2 text-heading">
              Saved posts
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
              Stories you bookmark while reading — sign in with Google to keep
              them across devices.
            </p>
          </div>
        </div>
      </header>

      <div className="section-shell py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          {!signedIn ? (
            <div className="panel p-6 md:p-8">
              <div className="flex items-start gap-3">
                <Bookmark
                  className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-xl font-bold text-heading">
                    Sign in to see saved stories
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text">
                    Use the same Google account you use on the site. Signing in
                    here does not grant CMS access.
                  </p>
                  {googleConfigured ? (
                    <div className="mt-5">
                      <ReaderAuthButtons
                        variant="header"
                        googleConfigured={googleConfigured}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">
                      Google sign-in is not configured on this deployment.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : loadError ? (
            <div className="panel p-6 md:p-8">
              <p className="text-sm text-text" role="status">
                {loadError}
              </p>
              <Link href="/blog" className="btn btn-secondary mt-6">
                Browse stories
              </Link>
            </div>
          ) : posts.length === 0 ? (
            <div className="panel p-6 md:p-8">
              <h2 className="font-display text-xl font-bold text-heading">
                Nothing saved yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text">
                Open any story and tap <strong>Save</strong> to add it here.
              </p>
              <Link href="/blog" className="btn btn-primary mt-6">
                Browse stories
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-white">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={post.href}
                    className="flex flex-col gap-1 px-5 py-4 transition hover:bg-surface-soft sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <span className="font-semibold text-heading">
                      {post.title}
                    </span>
                    <time
                      dateTime={post.savedAt}
                      className="shrink-0 text-sm text-muted"
                    >
                      Saved {formatPostDate(post.savedAt)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
