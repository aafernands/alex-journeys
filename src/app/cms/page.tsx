import Link from "next/link";
import { LoginForm } from "@/components/cms/LoginForm";
import { LogoutButton } from "@/components/cms/LogoutButton";
import {
  isCmsAuthenticated,
  isPasscodeConfigured,
} from "@/lib/cms/auth";
import { isGithubConfigured } from "@/lib/cms/github";
import { formatPostDate, getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const configured = isPasscodeConfigured();
  const authed = await isCmsAuthenticated();

  if (!authed) {
    return (
      <div className="mx-auto max-w-md">
        <LoginForm configured={configured} />
      </div>
    );
  }

  const posts = getAllPosts();
  const githubOk = isGithubConfigured();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">In-site CMS</p>
          <h1 className="font-display mt-2 text-display text-heading">
            Stories dashboard
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
            Publish creates a commit on{" "}
            <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
              main
            </code>{" "}
            via the GitHub Contents API; Vercel redeploys automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/cms/new" className="btn btn-primary">
            New post
          </Link>
          <LogoutButton />
        </div>
      </div>

      {!githubOk ? (
        <div className="panel-soft rounded-lg border border-border p-4 text-sm text-text">
          <strong className="text-heading">GitHub token missing.</strong> Set{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            CMS_GITHUB_TOKEN
          </code>{" "}
          (fine-grained PAT with contents:write) before publishing. See{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            docs/CMS.md
          </code>
          .
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="border-b border-border bg-surface-soft px-5 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            {posts.length} posts
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {posts.map((post) => (
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
                  href={`/blog/${post.slug}`}
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
      </section>
    </div>
  );
}
