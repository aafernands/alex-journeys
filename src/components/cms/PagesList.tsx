"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { redirectedPageSlugs } from "@/data/guides";

export type PagesListItem = {
  slug: string;
  title: string;
  description: string;
  label?: string;
};

type Props = { pages: PagesListItem[] };

export function PagesList({ pages }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [pages, query]);

  async function handleDelete(page: PagesListItem) {
    if (
      !window.confirm(
        `Delete page “${page.title}”? This removes the JSON from GitHub. The App Router file for /${page.slug} may still exist until you remove it in code.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingSlug(page.slug);
    try {
      const res = await fetch("/api/cms/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: page.slug }),
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
      <div className="panel p-4">
        <label className="relative block">
          <span className="sr-only">Search pages</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, slug, description…"
            className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="panel px-5 py-12 text-center">
          <p className="font-semibold text-heading">No CMS pages found</p>
          <p className="mt-2 text-sm text-muted">
            <Link href="/cms/pages/new" className="text-link hover:text-accent">
              Create a page
            </Link>{" "}
            or see Help for which routes are code-only.
          </p>
        </div>
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {filtered.map((page) => (
            <li
              key={page.slug}
              className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-heading">{page.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {page.label ? `${page.label} · ` : ""}
                  <span className="font-mono">/{page.slug}</span>
                </p>
                {redirectedPageSlugs[page.slug] ? (
                  <p className="mt-1 text-xs font-medium text-accent">
                    Public URL redirects to{" "}
                    <span className="font-mono">
                      {redirectedPageSlugs[page.slug]}
                    </span>
                  </p>
                ) : null}
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {page.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={redirectedPageSlugs[page.slug] ?? `/${page.slug}`}
                  className="btn btn-secondary text-xs"
                  target="_blank"
                >
                  View live
                </Link>
                <Link
                  href={`/cms/pages/edit/${page.slug}`}
                  className="btn btn-secondary text-xs"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={pendingSlug === page.slug}
                  onClick={() => handleDelete(page)}
                  className="btn btn-secondary text-xs text-red-700 disabled:opacity-60"
                >
                  {pendingSlug === page.slug ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
