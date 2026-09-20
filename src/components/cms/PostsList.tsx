"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export type PostsListItem = {
  slug: string;
  title: string;
  date: string;
  dateLabel: string;
  excerpt: string;
  destinations: string[];
  kind: "published" | "draft";
};

type DestinationOption = { slug: string; name: string };

type Props = {
  posts: PostsListItem[];
  destinations: DestinationOption[];
  initialStatus?: string;
};

export function PostsList({ posts, destinations, initialStatus }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState(
    initialStatus === "draft" ? "draft" : initialStatus === "published" ? "published" : "all",
  );
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (status === "draft" && p.kind !== "draft") return false;
      if (status === "published" && p.kind !== "published") return false;
      if (destination && !p.destinations.includes(destination)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q)
      );
    });
  }, [posts, query, destination, status]);

  async function handleDelete(item: PostsListItem) {
    const label = item.kind === "draft" ? "draft" : "post";
    if (
      !window.confirm(
        `Delete ${label} “${item.title}”? This removes the file from GitHub and cannot be undone from the CMS.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingSlug(item.slug);
    try {
      const res = await fetch("/api/cms/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          draft: item.kind === "draft",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Delete failed.");
        setPendingSlug(null);
        return;
      }
      router.refresh();
      setPendingSlug(null);
    } catch {
      setError("Network error. Try again.");
      setPendingSlug(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search posts</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, slug, excerpt…"
            className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          aria-label="Filter by destination"
        >
          <option value="">All destinations</option>
          {destinations.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="panel px-5 py-12 text-center">
          <p className="font-semibold text-heading">No posts match</p>
          <p className="mt-2 text-sm text-muted">
            Try another search, or{" "}
            <Link href="/cms/new" className="text-link hover:text-accent">
              create a new post
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {filtered.map((post) => (
            <li
              key={`${post.kind}-${post.slug}`}
              className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-heading">{post.title}</p>
                  {post.kind === "draft" ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-heading">
                      Draft
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {post.dateLabel} ·{" "}
                  <span className="font-mono">{post.slug}</span>
                  {post.destinations.length > 0
                    ? ` · ${post.destinations.join(", ")}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {post.kind === "published" ? (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="btn btn-secondary text-xs"
                    target="_blank"
                  >
                    View live
                  </Link>
                ) : null}
                <Link
                  href={
                    post.kind === "draft"
                      ? `/cms/edit/${post.slug}?draft=1`
                      : `/cms/edit/${post.slug}`
                  }
                  className="btn btn-secondary text-xs"
                >
                  Edit
                </Link>
                <Link
                  href={`/cms/new?duplicate=${encodeURIComponent(post.slug)}${
                    post.kind === "draft" ? "&fromDraft=1" : ""
                  }`}
                  className="btn btn-secondary text-xs"
                >
                  Duplicate
                </Link>
                <button
                  type="button"
                  disabled={pendingSlug === post.slug}
                  onClick={() => handleDelete(post)}
                  className="btn btn-secondary text-xs text-red-700 disabled:opacity-60"
                >
                  {pendingSlug === post.slug ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
