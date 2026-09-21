import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Compass,
  ExternalLink,
  MapPin,
  User,
} from "lucide-react";
import { auth, isReaderAuthConfigured } from "@/auth";
import { AccountAuthActions } from "@/components/AccountAuthActions";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import {
  SavedPostsList,
  type SavedPostRow,
} from "@/components/SavedPostsList";
import { isEmailConfigured } from "@/lib/email";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { getPostBySlug } from "@/lib/posts";
import {
  getPendingEmailChangeForUser,
  getUserById,
} from "@/lib/users";
import {
  listSavedPosts,
  SavedPostsUnavailableError,
} from "@/lib/saved-posts";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Your Fernandes Journeys dashboard — profile, saved stories, and quick links.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account" },
};

export const dynamic = "force-dynamic";

function enrichSavedPosts(
  posts: Awaited<ReturnType<typeof listSavedPosts>>,
): SavedPostRow[] {
  return posts.map((p) => {
    const live = getPostBySlug(p.slug);
    return {
      slug: p.slug,
      title: live?.title ?? p.title,
      savedAt: p.savedAt,
      href: p.href,
      imageUrl: live?.featuredImage?.url ?? null,
      imageAlt: live?.featuredImage?.alt ?? p.title,
    };
  });
}

function ProfileAvatar({
  src,
  name,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
}) {
  if (!src) {
    return (
      <span
        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft text-accent"
        aria-hidden="true"
      >
        <User className="h-7 w-7" strokeWidth={1.75} />
      </span>
    );
  }
  const isData = src.startsWith("data:");
  const isGoogle = src.includes("googleusercontent.com");
  if (isData || !isGoogle) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name?.trim() ? `${name} avatar` : ""}
        width={64}
        height={64}
        className="h-16 w-16 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={name?.trim() ? `${name} avatar` : ""}
      width={64}
      height={64}
      className="h-16 w-16 rounded-full border border-border object-cover"
    />
  );
}

export default async function AccountPage() {
  const session = await auth();
  const googleConfigured = isReaderAuthConfigured();
  const userId = session?.user?.id?.trim();
  const signedIn = Boolean(session?.user && userId);
  const user = session?.user;

  let posts: SavedPostRow[] = [];
  let loadError: string | null = null;
  let firebaseOk = isFirebaseConfigured();
  let hasPassword = false;
  let pendingNewEmail: string | null = null;
  let profileName = user?.name?.trim() || "";
  let profileImage = user?.image ?? null;
  let profileEmail = user?.email ?? "";

  if (signedIn && userId && firebaseOk) {
    try {
      const profile = await getUserById(userId);
      hasPassword = Boolean(profile?.passwordHash);
      if (profile) {
        profileName = profile.name?.trim() || profileName;
        profileImage = profile.image ?? profileImage;
        profileEmail = profile.email || profileEmail;
      }
      const pending = await getPendingEmailChangeForUser(userId);
      pendingNewEmail = pending?.newEmail ?? null;
    } catch (err) {
      console.warn("[account] profile lookup failed:", err);
    }
  }

  if (signedIn && userId) {
    if (!firebaseOk) {
      loadError =
        "Saved posts are not configured yet. Ask the site owner to enable Firestore.";
    } else {
      try {
        posts = enrichSavedPosts(await listSavedPosts(userId));
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

  const emailConfigured = isEmailConfigured();

  return (
    <main className="bg-bg">
      <header className="border-b border-border bg-white">
        <div className="section-shell section-band">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Your dashboard</p>
            <h1 className="font-display text-display mt-2 text-heading">
              Account
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
              Profile, saved stories, and shortcuts. Sign in with email or Google
              to keep bookmarks across devices.
            </p>
          </div>
        </div>
      </header>

      <div className="section-shell section-band">
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
                    Sign in to continue
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text">
                    Save stories across devices and manage them here. Use email
                    and password or Google. Signing in does not grant CMS access.
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
              <section
                className="panel p-6 md:p-8"
                aria-labelledby="account-profile"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <ProfileAvatar src={profileImage} name={profileName} />
                    <div className="min-w-0">
                      <h2
                        id="account-profile"
                        className="font-display text-xl font-bold text-heading"
                      >
                        {profileName || "Reader"}
                      </h2>
                      {profileEmail ? (
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {profileEmail}
                          {pendingNewEmail
                            ? ` · pending → ${pendingNewEmail}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <AccountAuthActions mode="sign-out" googleConfigured />
                </div>
              </section>

              <section
                className="panel p-6 md:p-8"
                aria-labelledby="account-settings"
              >
                <h2
                  id="account-settings"
                  className="font-display text-xl font-bold text-heading"
                >
                  Profile settings
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Update your display name, photo, and account email.
                </p>
                <ProfileSettingsForm
                  initialName={profileName}
                  initialEmail={profileEmail}
                  initialImage={profileImage}
                  hasPassword={hasPassword}
                  pendingNewEmail={pendingNewEmail}
                  emailConfigured={emailConfigured}
                />
              </section>

              <section id="saved" aria-labelledby="account-saved">
                <div className="mb-4">
                  <h2
                    id="account-saved"
                    className="font-display text-xl font-bold text-heading"
                  >
                    Saved posts
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Bookmarks you save while reading. Remove any item anytime.
                  </p>
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
                ) : (
                  <SavedPostsList posts={posts} />
                )}
              </section>

              <section aria-labelledby="account-explore">
                <h2
                  id="account-explore"
                  className="font-display mb-4 text-xl font-bold text-heading"
                >
                  Explore
                </h2>
                <ul className="grid gap-3 sm:grid-cols-3">
                  <li>
                    <Link
                      href="/destinations"
                      className="panel-interactive flex items-center gap-3 p-4"
                    >
                      <MapPin
                        className="h-5 w-5 shrink-0 text-accent"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-heading">
                        Destinations
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/blog"
                      className="panel-interactive flex items-center gap-3 p-4"
                    >
                      <BookOpen
                        className="h-5 w-5 shrink-0 text-accent"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-heading">
                        Stories
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/guides"
                      className="panel-interactive flex items-center gap-3 p-4"
                    >
                      <Compass
                        className="h-5 w-5 shrink-0 text-accent"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-heading">Guides</span>
                    </Link>
                  </li>
                </ul>
              </section>

              {hasPassword ? (
                <section
                  className="panel p-6 md:p-8"
                  aria-labelledby="account-password"
                >
                  <h2
                    id="account-password"
                    className="font-display text-xl font-bold text-heading"
                  >
                    Change password
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Update the password for your email sign-in.
                  </p>
                  <ChangePasswordForm />
                </section>
              ) : null}

              <section
                className="panel p-6 md:p-8"
                aria-labelledby="account-utilities"
              >
                <h2
                  id="account-utilities"
                  className="font-display text-xl font-bold text-heading"
                >
                  Account
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-text">
                  <li>
                    <AccountAuthActions mode="sign-out" googleConfigured />
                  </li>
                  <li>
                    <a
                      href="https://myaccount.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
                    >
                      Open Google Account
                      <ExternalLink
                        className="h-3.5 w-3.5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                  <li className="pt-2 text-muted">
                    Publishing tools for authors live at{" "}
                    <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs text-heading">
                      /cms
                    </code>{" "}
                    — not part of the reader account.
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
