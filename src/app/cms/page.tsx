import Link from "next/link";
import {
  isGitHubAuthConfigured,
  isGoogleAuthConfigured,
  isOauthConfigured,
} from "@/auth";
import { LoginForm } from "@/components/cms/LoginForm";
import { getAllDestinations } from "@/data/destinations";
import {
  hasOauthAdminSession,
  isCmsAuthenticated,
  isPasscodeConfigured,
} from "@/lib/cms/auth";
import { getAllDrafts } from "@/lib/cms/drafts";
import { isGithubConfigured } from "@/lib/cms/github";
import { getAllCmsPages } from "@/lib/pages";
import { formatPostDate, getAllPosts } from "@/lib/posts";
import {
  CheckCircle2,
  FileText,
  MapPin,
  PenLine,
  Plus,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const passcodeConfigured = isPasscodeConfigured();
  const googleConfigured = isOauthConfigured() && isGoogleAuthConfigured();
  const githubConfigured = isOauthConfigured() && isGitHubAuthConfigured();
  const authed = await isCmsAuthenticated();

  if (!authed) {
    return (
      <div className="mx-auto max-w-md">
        <LoginForm
          passcodeConfigured={passcodeConfigured}
          googleConfigured={googleConfigured}
          githubConfigured={githubConfigured}
        />
      </div>
    );
  }

  // oauthSession handled by layout shell
  void (await hasOauthAdminSession());

  const posts = getAllPosts();
  const drafts = getAllDrafts();
  const pages = getAllCmsPages();
  const destinations = getAllDestinations();
  const githubOk = isGithubConfigured();
  const recent = posts.slice(0, 6);

  const stats = [
    { label: "Published posts", value: posts.length, href: "/cms/posts" },
    { label: "Drafts", value: drafts.length, href: "/cms/posts?status=draft" },
    { label: "Pages", value: pages.length, href: "/cms/pages" },
    {
      label: "Destinations",
      value: destinations.length,
      href: "/cms/destinations",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">Overview</p>
          <h1 className="font-display mt-2 text-display text-heading">
            Dashboard
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
            Create stories, manage CMS pages, and publish destinations. Changes
            commit to{" "}
            <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
              main
            </code>{" "}
            via GitHub; Vercel redeploys automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/cms/new" className="btn btn-primary">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New post
          </Link>
          <Link href="/cms/pages/new" className="btn btn-secondary">
            New page
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="panel block p-5 transition hover:ring-2 hover:ring-accent/30"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {s.label}
            </p>
            <p className="font-display mt-2 text-3xl font-bold text-heading">
              {s.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="panel p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Publish readiness
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-2">
            {passcodeConfigured || googleConfigured || githubConfigured ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-steel" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            )}
            <span>
              <strong className="text-heading">Auth:</strong>{" "}
              {passcodeConfigured || googleConfigured || githubConfigured
                ? [
                    googleConfigured ? "Google OAuth" : null,
                    githubConfigured ? "GitHub OAuth" : null,
                    passcodeConfigured ? "Passcode" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Not configured — set OAuth and/or CMS_PASSCODE"}
            </span>
          </li>
          <li className="flex items-start gap-2">
            {githubOk ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-steel" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            )}
            <span>
              <strong className="text-heading">GitHub token:</strong>{" "}
              {githubOk
                ? "Configured (contents write ready)"
                : "Missing — set CMS_GITHUB_TOKEN before publishing"}
            </span>
          </li>
        </ul>
        {!githubOk ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-soft p-3 text-sm text-text">
            Publishing is disabled until a fine-grained PAT with{" "}
            <code className="rounded bg-white px-1 text-xs">contents:write</code>{" "}
            is set. See Help or{" "}
            <code className="rounded bg-white px-1 text-xs">docs/CMS.md</code>.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/cms/new"
          className="panel flex items-center gap-3 p-5 transition hover:ring-2 hover:ring-accent/30"
        >
          <PenLine className="h-5 w-5 text-accent" aria-hidden />
          <div>
            <p className="font-semibold text-heading">Write a story</p>
            <p className="text-xs text-muted">New post → GitHub publish</p>
          </div>
        </Link>
        <Link
          href="/cms/pages"
          className="panel flex items-center gap-3 p-5 transition hover:ring-2 hover:ring-accent/30"
        >
          <FileText className="h-5 w-5 text-accent" aria-hidden />
          <div>
            <p className="font-semibold text-heading">Manage pages</p>
            <p className="text-xs text-muted">Culinary, legal hub + separate legal pages</p>
          </div>
        </Link>
        <Link
          href="/cms/destinations/new"
          className="panel flex items-center gap-3 p-5 transition hover:ring-2 hover:ring-accent/30"
        >
          <MapPin className="h-5 w-5 text-accent" aria-hidden />
          <div>
            <p className="font-semibold text-heading">Add destination</p>
            <p className="text-xs text-muted">Map, climate, itinerary</p>
          </div>
        </Link>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface-soft px-5 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Recent posts
          </h2>
          <Link
            href="/cms/posts"
            className="text-xs font-semibold text-link hover:text-accent"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">
            No posts yet.{" "}
            <Link href="/cms/new" className="text-link hover:text-accent">
              Create your first story
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((post) => (
              <li
                key={post.slug}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-heading">{post.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatPostDate(post.date)} ·{" "}
                    <span className="font-mono">{post.slug}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/${post.slug}`}
                    className="btn btn-secondary text-xs"
                  >
                    View
                  </Link>
                  <Link
                    href={`/cms/edit/${post.slug}`}
                    className="btn btn-secondary text-xs"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {drafts.length > 0 ? (
        <section className="panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              Drafts ({drafts.length})
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {drafts.map((d) => (
              <li
                key={d.slug}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-heading">{d.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Draft · <span className="font-mono">{d.slug}</span>
                  </p>
                </div>
                <Link
                  href={`/cms/edit/${d.slug}?draft=1`}
                  className="btn btn-secondary text-xs"
                >
                  Continue editing
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
