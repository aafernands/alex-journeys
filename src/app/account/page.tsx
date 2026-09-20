import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { auth, isGoogleAuthConfigured, isOauthConfigured } from "@/auth";
import { AccountAuthActions } from "@/components/AccountAuthActions";
import { formatPostDate } from "@/lib/dates";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  listSavedPosts,
  SavedPostsUnavailableError,
  type SavedPost,
} from "@/lib/saved-posts";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Fernandes Journeys account — profile and saved stories.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account" },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const googleConfigured = isOauthConfigured() && isGoogleAuthConfigured();
  const userId = session?.user?.id?.trim();
  const signedIn = Boolean(session?.user && userId);
  const user = session?.user;

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
          console.error("[account] list saved failed:", err);
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
            <p className="eyebrow">Your account</p>
            <h1 className="font-display text-display mt-2 text-heading">
              Account
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
              Profile and saved stories. Sign in with Google — CMS stays at{" "}
              <Link href="/cms" className="text-accent hover:underline">
                /cms
              </Link>
              .
            </p>
          </div>
        </div>
      </header>

      <div className="section-shell py-10 md:py-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {!signedIn ? (
            <div className="panel p-6 md:p-8">
              <div className="flex items-start gap-3">
                <User
                  className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-xl font-bold text-heading">
                    Sign in with Google
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text">
                    Save stories across devices and see them here. Signing in
                    does not grant CMS access.
                  </p>
                  <div className="mt-5">
                    <AccountAuthActions
                      mode="sign-in"
                      googleConfigured={googleConfigured}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <section className="panel p-6 md:p-8" aria-labelledby="account-profile">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span
                        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft text-accent"
                        aria-hidden="true"
                      >
                        <User className="h-7 w-7" strokeWidth={1.75} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2
                        id="account-profile"
                        className="font-display text-xl font-bold text-heading"
                      >
                        {user?.name?.trim() || "Reader"}
                      </h2>
                      {user?.email ? (
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {user.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <AccountAuthActions mode="sign-out" googleConfigured />
                </div>
                <p className="mt-5 text-sm text-muted">
                  More account settings later.
                </p>
              </section>

              <section aria-labelledby="account-saved">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2
                    id="account-saved"
                    className="font-display text-xl font-bold text-heading"
                  >
                    Saved posts
                  </h2>
                  <Link
                    href="/saved"
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    Open Saved
                  </Link>
                </div>

                {loadError ? (
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
                    <p className="text-sm leading-relaxed text-text">
                      Nothing saved yet. Open any story and tap{" "}
                      <strong>Save</strong> to add it here.
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
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
